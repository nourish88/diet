import prisma from "@/lib/prisma";
import { TanitaService, type TanitaMeasurement } from "./TanitaService";

export const TanitaProgressService = {
  /**
   * TanitaMeasurement'ları ProgressEntry'ye aktar
   * Mapping: weight, bodyFat (fatRate), waist/hip (yoksa null)
   * Duplicate kontrolü: aynı date için sadece bir ProgressEntry
   * userId opsiyonel - Tanita'dan gelen ölçümler için olmayabilir
   */
  async syncMeasurementsToProgress(
    clientId: number,
    userId?: number
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;
    let skipped = 0;

    try {
      // Client'ı kontrol et
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: { tanitaUser: true },
      });

      if (!client) {
        throw new Error("Client bulunamadı");
      }

      if (!client.tanitaMemberId || !client.tanitaUser) {
        throw new Error("Client Tanita ile eşleştirilmemiş");
      }

      // Tanita ölçümlerini getir
      const tanitaMeasurements = TanitaService.getUserMeasurements(
        client.tanitaMemberId
      );

      if (tanitaMeasurements.length === 0) {
        return { created: 0, skipped: 0, errors: [] };
      }

      // Önce tüm tarihleri parse et ve mevcut ProgressEntry'leri toplu olarak getir
      const validMeasurements: Array<{
        measurement: TanitaMeasurement;
        measureDate: Date;
      }> = [];

      for (const measurement of tanitaMeasurements) {
        try {
          const measureDate = new Date(measurement.MeasureDate);
          if (!isNaN(measureDate.getTime())) {
            validMeasurements.push({ measurement, measureDate });
          } else {
            errors.push(
              `Geçersiz tarih: ${measurement.MeasureDate} (ID: ${measurement.ID})`
            );
          }
        } catch {
          errors.push(
            `Tarih parse hatası: ${measurement.MeasureDate} (ID: ${measurement.ID})`
          );
        }
      }

      if (validMeasurements.length === 0) {
        return { created: 0, skipped: 0, errors };
      }

      // Mevcut ProgressEntry'leri toplu olarak getir (tek query)
      const existingEntries = await prisma.progressEntry.findMany({
        where: {
          clientId: clientId,
          date: {
            in: validMeasurements.map((m) => m.measureDate),
          },
        },
        select: { date: true },
      });

      const existingDates = new Set(
        existingEntries.map((e) => e.date.toISOString().split('T')[0])
      );

      // Her ölçümü işle (transaction kullanarak optimize et)
      const batchSize = 50; // Her seferde 50 ölçüm işle
      
      for (let i = 0; i < validMeasurements.length; i += batchSize) {
        const batch = validMeasurements.slice(i, i + batchSize);
        
        // Batch'i transaction içinde işle
        await prisma.$transaction(async (tx) => {
          for (const { measurement, measureDate } of batch) {
            try {
              // Aynı tarih için zaten ProgressEntry var mı kontrol et (memory'den)
              const dateKey = measureDate.toISOString().split('T')[0];
              if (existingDates.has(dateKey)) {
                skipped++;
                continue;
              }

              // TanitaMeasurement kaydını oluştur veya güncelle (sadece temel alanlar)
              const weightValue = measurement.Weight != null ? measurement.Weight : null;
              const fatRateValue = measurement.FatRate != null ? measurement.FatRate : null;
              
              if (!client.tanitaMemberId) {
                errors.push(`Client tanitaMemberId yok (ID: ${measurement.ID})`);
                continue;
              }
              
              const tanitaMeasurementRecord = await tx.tanitaMeasurement.upsert(
                {
                  where: { tanitaMeasurementId: measurement.ID },
                  update: {
                    measureDate: measureDate,
                    weight: weightValue,
                    fatRate: fatRateValue,
                  },
                  create: {
                    tanitaMeasurementId: measurement.ID,
                    tanitaMemberId: client.tanitaMemberId,
                    measureDate: measureDate,
                    weight: weightValue,
                    fatRate: fatRateValue,
                  },
                }
              );

              // ProgressEntry oluştur (userId opsiyonel)
              const progressEntry = await tx.progressEntry.create({
                data: {
                  userId: userId || null,
                  clientId: clientId,
                  date: measureDate,
                  weight: weightValue,
                  bodyFat: fatRateValue, // fatRate -> bodyFat
                  waist: null, // Tanita'da yok
                  hip: null, // Tanita'da yok
                  tanitaMeasurement: {
                    connect: { id: tanitaMeasurementRecord.id },
                  },
                },
              });

              // TanitaMeasurement'ın progressEntryId'sini güncelle
              await tx.tanitaMeasurement.update({
                where: { id: tanitaMeasurementRecord.id },
                data: { progressEntryId: progressEntry.id },
              });

              // Existing dates set'ine ekle (aynı batch içinde duplicate'leri önlemek için)
              existingDates.add(dateKey);
              created++;
            } catch (error: any) {
              errors.push(
                `Ölçüm aktarım hatası (ID: ${measurement.ID}): ${error.message}`
              );
            }
          }
        }, {
          timeout: 30000, // 30 saniye timeout per batch
        });
      }

      return { created, skipped, errors };
    } catch (error: any) {
      console.error("Error syncing measurements to progress:", error);
      throw error;
    }
  },

  /**
   * Belirli bir TanitaMeasurement'ı ProgressEntry'ye aktar
   */
  async syncSingleMeasurementToProgress(
    tanitaMeasurementId: number,
    clientId: number,
    userId: number
  ): Promise<any> {
    try {
      // TanitaMeasurement'ı getir
      const tanitaMeasurement = await prisma.tanitaMeasurement.findUnique({
        where: { tanitaMeasurementId },
        include: { tanitaUser: true },
      });

      if (!tanitaMeasurement) {
        throw new Error("TanitaMeasurement bulunamadı");
      }

      // Client kontrolü
      if (!tanitaMeasurement.tanitaUser?.clientId || tanitaMeasurement.tanitaUser.clientId !== clientId) {
        throw new Error("Bu ölçüm bu danışana ait değil");
      }

      // Zaten aktarılmış mı kontrol et
      if (tanitaMeasurement.progressEntryId) {
        const existingEntry = await prisma.progressEntry.findUnique({
          where: { id: tanitaMeasurement.progressEntryId },
        });
        if (existingEntry) {
          return existingEntry;
        }
      }

      // ProgressEntry oluştur
      const progressEntry = await prisma.progressEntry.create({
        data: {
          userId: userId,
          clientId: clientId,
          date: tanitaMeasurement.measureDate,
          weight: tanitaMeasurement.weight || null,
          bodyFat: tanitaMeasurement.fatRate || null,
          waist: null,
          hip: null,
          tanitaMeasurement: {
            connect: { id: tanitaMeasurement.id },
          },
        },
      });

      // TanitaMeasurement'ın progressEntryId'sini güncelle
      await prisma.tanitaMeasurement.update({
        where: { id: tanitaMeasurement.id },
        data: { progressEntryId: progressEntry.id },
      });

      return progressEntry;
    } catch (error: any) {
      console.error("Error syncing single measurement:", error);
      throw error;
    }
  },
};


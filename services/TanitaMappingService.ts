import prisma from "@/lib/prisma";
import { TanitaService, type TanitaUser } from "./TanitaService";
import { Client } from "@prisma/client";

/**
 * Telefon numarasını normalize et (boşlukları ve özel karakterleri temizle)
 */
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/\s+/g, "").replace(/[^\d+]/g, "") || null;
}

/**
 * Email'i normalize et (küçük harfe çevir, trim)
 */
function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase() || null;
}

/**
 * Doğum tarihini karşılaştır (string formatları farklı olabilir)
 */
function compareDates(
  date1: string | Date | null | undefined,
  date2: string | Date | null | undefined
): boolean {
  if (!date1 || !date2) return false;
  
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    // Aynı gün, ay, yıl kontrolü
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  } catch {
    return false;
  }
}

export const TanitaMappingService = {
  /**
   * Tanita user ile eşleşen mevcut Client'ı bul
   * Mapping öncelik sırası:
   * 1. tanitaMemberId zaten varsa
   * 2. phoneNumber eşleşmesi
   * 3. email eşleşmesi
   * 4. name + surname + birthdate kombinasyonu
   * 5. identityNumber eşleşmesi
   */
  async findMatchingClient(
    tanitaUser: TanitaUser,
    dietitianId?: number
  ): Promise<Client | null> {
    try {
      // 1. tanitaMemberId kontrolü
      if (tanitaUser.id) {
        const clientByTanitaId = await prisma.client.findUnique({
          where: { tanitaMemberId: tanitaUser.id },
        });
        if (clientByTanitaId) {
          // Dietitian kontrolü (eğer dietitianId verilmişse)
          if (!dietitianId || clientByTanitaId.dietitianId === dietitianId) {
            return clientByTanitaId;
          }
        }
      }

      // 2. phoneNumber eşleşmesi
      const normalizedPhone = normalizePhone(tanitaUser.phone);
      if (normalizedPhone) {
        const clientByPhone = await prisma.client.findUnique({
          where: { phoneNumber: normalizedPhone },
        });
        if (clientByPhone) {
          // Dietitian kontrolü
          if (!dietitianId || clientByPhone.dietitianId === dietitianId) {
            return clientByPhone;
          }
        }
      }

      // 3. email eşleşmesi (User tablosu üzerinden)
      const normalizedEmail = normalizeEmail(tanitaUser.email);
      if (normalizedEmail) {
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { client: true },
        });
        if (user?.client) {
          // Dietitian kontrolü
          if (!dietitianId || user.client.dietitianId === dietitianId) {
            return user.client;
          }
        }
      }

      // 4. name + surname + birthdate kombinasyonu (case-insensitive)
      if (tanitaUser.name && tanitaUser.surname) {
        const clients = await prisma.client.findMany({
          where: {
            name: { equals: tanitaUser.name, mode: "insensitive" },
            surname: { equals: tanitaUser.surname, mode: "insensitive" },
            ...(dietitianId ? { dietitianId } : {}),
          },
        });

        // Doğum tarihi eşleşmesi varsa kesin eşleşme
        if (tanitaUser.dob && clients.length > 0) {
          const matchByDob = clients.find((client) =>
            compareDates(client.birthdate, tanitaUser.dob)
          );
          if (matchByDob) return matchByDob;
        }

        // Doğum tarihi yoksa sadece isim-soyisim eşleşmesi (tek sonuç varsa)
        if (clients.length === 1) {
          return clients[0];
        }
      }

      // 5. identityNumber eşleşmesi (eğer Client tablosunda identityNumber field'ı varsa)
      // Şu an Client modelinde identityNumber yok, bu yüzden atlanıyor
      // İleride eklenebilir

      return null;
    } catch (error) {
      console.error("Error finding matching client:", error);
      throw new Error("Client eşleştirme hatası");
    }
  },

  /**
   * Mevcut client'ı Tanita user ile eşleştir
   */
  async mapClientToTanita(
    clientId: number,
    tanitaMemberId: number,
    dietitianId: number
  ): Promise<{ client: Client; tanitaUser: any }> {
    try {
      // Client'ı kontrol et
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        throw new Error("Client bulunamadı");
      }

      // Dietitian kontrolü
      if (client.dietitianId !== dietitianId) {
        throw new Error("Bu danışan size ait değil");
      }

      // Tanita user'ı getir
      const tanitaUser = TanitaService.getUserById(tanitaMemberId);
      if (!tanitaUser) {
        throw new Error("Tanita danışanı bulunamadı");
      }

      // TanitaUser kaydını oluştur veya güncelle
      const tanitaUserRecord = await prisma.tanitaUser.upsert({
        where: { tanitaMemberId },
        update: {
          name: tanitaUser.name,
          surname: tanitaUser.surname,
          email: tanitaUser.email || null,
          phone: tanitaUser.phone || null,
          dob: tanitaUser.dob || null,
          gender: tanitaUser.gender || null,
          bodyType: tanitaUser.bodyType || null,
          height: tanitaUser.height || null,
          identityNumber: tanitaUser.identityNumber || null,
          notes: tanitaUser.notes || null,
          clientId: clientId,
          lastSyncedAt: new Date(),
        },
        create: {
          tanitaMemberId: tanitaUser.id,
          name: tanitaUser.name,
          surname: tanitaUser.surname,
          email: tanitaUser.email || null,
          phone: tanitaUser.phone || null,
          dob: tanitaUser.dob || null,
          gender: tanitaUser.gender || null,
          bodyType: tanitaUser.bodyType || null,
          height: tanitaUser.height || null,
          identityNumber: tanitaUser.identityNumber || null,
          notes: tanitaUser.notes || null,
          clientId: clientId,
          lastSyncedAt: new Date(),
        },
      });

      // Telefon numarası güncelleme mantığı
      // Eğer Client'ta telefon yoksa veya telefon sadece 4 rakamdan oluşuyorsa, Tanita'dan gelen telefonu güncelle
      const normalizedTanitaPhone = normalizePhone(tanitaUser.phone);
      const currentPhone = normalizePhone(client.phoneNumber);
      let phoneToUpdate: string | null | undefined = undefined;
      
      if (normalizedTanitaPhone) {
        // Telefon geçerliliği kontrolü: 4 rakamdan fazla olmalı
        const phoneDigits = normalizedTanitaPhone.replace(/\D/g, "");
        const isValidPhone = phoneDigits.length > 4;
        
        if (isValidPhone) {
          // Client'ta telefon yoksa veya geçersizse (4 rakam veya daha az) güncelle
          if (!currentPhone || currentPhone.replace(/\D/g, "").length <= 4) {
            phoneToUpdate = normalizedTanitaPhone;
          }
        }
      }

      // Client'ı güncelle (tanitaMemberId set et)
      const updatedClient = await prisma.client.update({
        where: { id: clientId },
        data: {
          tanitaMemberId: tanitaUser.id,
          // Telefon güncellemesi (eğer gerekliyse)
          ...(phoneToUpdate !== undefined ? { phoneNumber: phoneToUpdate } : {}),
          // Tanita'dan gelen bilgileri Client tablosuna yaz (sadece boş olanları)
          notes: client.notes || tanitaUser.notes || null,
          // Gender mapping (Tanita: "ERKEK"/"KADIN" -> Client: 1/2)
          gender:
            client.gender !== null && client.gender !== undefined
              ? client.gender
              : tanitaUser.gender === "ERKEK"
                ? 1
                : tanitaUser.gender === "KADIN"
                  ? 2
                  : null,
        },
      });

      return { client: updatedClient, tanitaUser: tanitaUserRecord };
    } catch (error) {
      console.error("Error mapping client to Tanita:", error);
      throw error;
    }
  },

  /**
   * Tanita'dan yeni client oluştur
   */
  async createClientFromTanita(
    tanitaMemberId: number,
    dietitianId: number
  ): Promise<{ client: Client; tanitaUser: any }> {
    try {
      // Tanita user'ı getir
      const tanitaUser = TanitaService.getUserById(tanitaMemberId);
      if (!tanitaUser) {
        throw new Error("Tanita danışanı bulunamadı");
      }

      // Doğum tarihini parse et
      let birthdate: Date | null = null;
      if (tanitaUser.dob) {
        try {
          birthdate = new Date(tanitaUser.dob);
          if (isNaN(birthdate.getTime())) {
            birthdate = null;
          }
        } catch {
          birthdate = null;
        }
      }

      // Gender mapping (Tanita: "ERKEK"/"KADIN" -> Client: 1/2)
      let gender: number | null = null;
      if (tanitaUser.gender === "ERKEK") {
        gender = 1;
      } else if (tanitaUser.gender === "KADIN") {
        gender = 2;
      }

      // Client oluştur
      const client = await prisma.client.create({
        data: {
          name: tanitaUser.name,
          surname: tanitaUser.surname,
          phoneNumber: normalizePhone(tanitaUser.phone),
          birthdate: birthdate,
          gender: gender,
          notes: tanitaUser.notes || null,
          illness: null,
          dietitianId: dietitianId,
          tanitaMemberId: tanitaUser.id,
        },
      });

      // TanitaUser kaydı oluştur
      const tanitaUserRecord = await prisma.tanitaUser.create({
        data: {
          tanitaMemberId: tanitaUser.id,
          name: tanitaUser.name,
          surname: tanitaUser.surname,
          email: tanitaUser.email || null,
          phone: tanitaUser.phone || null,
          dob: tanitaUser.dob || null,
          gender: tanitaUser.gender || null,
          bodyType: tanitaUser.bodyType || null,
          height: tanitaUser.height || null,
          identityNumber: tanitaUser.identityNumber || null,
          notes: tanitaUser.notes || null,
          clientId: client.id,
          lastSyncedAt: new Date(),
        },
      });

      return { client, tanitaUser: tanitaUserRecord };
    } catch (error) {
      console.error("Error creating client from Tanita:", error);
      throw error;
    }
  },

  /**
   * Client'tan Tanita eşleşmesini kaldır
   */
  async unmapClientFromTanita(
    clientId: number,
    dietitianId: number
  ): Promise<Client> {
    try {
      // Client'ı kontrol et
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        throw new Error("Client bulunamadı");
      }

      // Dietitian kontrolü
      if (client.dietitianId !== dietitianId) {
        throw new Error("Bu danışan size ait değil");
      }

      // Eşleşme yoksa hata ver
      if (!client.tanitaMemberId) {
        throw new Error("Bu danışan Tanita ile eşleştirilmemiş");
      }

      // Client'tan tanitaMemberId'yi kaldır
      const updatedClient = await prisma.client.update({
        where: { id: clientId },
        data: {
          tanitaMemberId: null,
        },
      });

      // TanitaUser kaydındaki clientId'yi null yap (kaydı silme, sadece ilişkiyi kaldır)
      await prisma.tanitaUser.updateMany({
        where: { clientId: clientId },
        data: {
          clientId: null,
        },
      });

      return updatedClient;
    } catch (error) {
      console.error("Error unmapping client from Tanita:", error);
      throw error;
    }
  },
};


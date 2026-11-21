import prisma from "@/lib/prisma";
import type { ProgressEntry } from "@/lib/progress";
export * from "@/lib/progress";

/**
 * Get progress entries with date filtering
 */
export async function getProgressEntries(
  clientId: number,
  dateFrom?: Date,
  dateTo?: Date
): Promise<ProgressEntry[]> {
  const where: any = {
    clientId,
  };

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) {
      where.date.gte = dateFrom;
    }
    if (dateTo) {
      where.date.lte = dateTo;
    }
  }

  const entries = await prisma.progressEntry.findMany({
    where,
    orderBy: {
      date: "asc",
    },
  });

  return entries;
}

/**
 * Create progress entry
 */
export async function createProgressEntry(
  clientId: number,
  data: {
    date: Date;
    weight?: number | null;
    waist?: number | null;
    hip?: number | null;
    bodyFat?: number | null;
  },
  userId?: number | null
): Promise<ProgressEntry> {
  const entry = await prisma.progressEntry.create({
    data: {
      userId: userId ?? null,
      clientId,
      date: data.date,
      weight: data.weight ?? null,
      waist: data.waist ?? null,
      hip: data.hip ?? null,
      bodyFat: data.bodyFat ?? null,
    },
  });

  return entry;
}


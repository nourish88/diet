import prisma from "@/lib/prisma";

export interface ProgressEntry {
  id: number;
  userId: number;
  clientId: number;
  date: Date;
  weight: number | null;
  waist: number | null;
  hip: number | null;
  bodyFat: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressSummary {
  totalDays: number;
  weightChange: number | null;
  waistChange: number | null;
  hipChange: number | null;
  bodyFatChange: number | null;
  message: string;
}

export interface ChartDataPoint {
  date: string;
  weight: number | null;
  waist: number | null;
  hip: number | null;
  bodyFat: number | null;
}

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
  userId: number,
  clientId: number,
  data: {
    date: Date;
    weight?: number | null;
    waist?: number | null;
    hip?: number | null;
    bodyFat?: number | null;
  }
): Promise<ProgressEntry> {
  const entry = await prisma.progressEntry.create({
    data: {
      userId,
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

/**
 * Calculate progress summary
 */
export function calculateProgressSummary(
  entries: ProgressEntry[],
  dateFrom?: Date,
  dateTo?: Date
): ProgressSummary | null {
  if (entries.length === 0) {
    return null;
  }

  // Filter entries by date range if provided
  let filteredEntries = entries;
  if (dateFrom || dateTo) {
    filteredEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.date);
      if (dateFrom && entryDate < dateFrom) return false;
      if (dateTo && entryDate > dateTo) return false;
      return true;
    });
  }

  if (filteredEntries.length === 0) {
    return null;
  }

  // Sort by date
  const sortedEntries = [...filteredEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const firstEntry = sortedEntries[0];
  const lastEntry = sortedEntries[sortedEntries.length - 1];

  // Calculate changes
  const weightChange =
    firstEntry.weight && lastEntry.weight
      ? lastEntry.weight - firstEntry.weight
      : null;
  const waistChange =
    firstEntry.waist && lastEntry.waist
      ? lastEntry.waist - firstEntry.waist
      : null;
  const hipChange =
    firstEntry.hip && lastEntry.hip ? lastEntry.hip - firstEntry.hip : null;
  const bodyFatChange =
    firstEntry.bodyFat && lastEntry.bodyFat
      ? lastEntry.bodyFat - firstEntry.bodyFat
      : null;

  // Calculate days difference
  const daysDiff = Math.ceil(
    (new Date(lastEntry.date).getTime() - new Date(firstEntry.date).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Generate message
  let message = "";
  if (weightChange !== null) {
    if (weightChange < 0) {
      message = `Son ${daysDiff} günde ${Math.abs(weightChange).toFixed(1)} kg azaldın 🎯`;
    } else if (weightChange > 0) {
      message = `Son ${daysDiff} günde ${weightChange.toFixed(1)} kg aldın`;
    } else {
      message = `Son ${daysDiff} günde kilon değişmedi`;
    }
  } else if (waistChange !== null) {
    if (waistChange < 0) {
      message = `Son ${daysDiff} günde bel çevresi ${Math.abs(waistChange).toFixed(1)} cm azaldı 🎯`;
    } else if (waistChange > 0) {
      message = `Son ${daysDiff} günde bel çevresi ${waistChange.toFixed(1)} cm arttı`;
    } else {
      message = `Son ${daysDiff} günde bel çevresi değişmedi`;
    }
  } else {
    message = `Son ${daysDiff} günde ${sortedEntries.length} ölçüm kaydettin`;
  }

  return {
    totalDays: daysDiff,
    weightChange,
    waistChange,
    hipChange,
    bodyFatChange,
    message,
  };
}

/**
 * Get chart data for Recharts
 */
export function getChartData(
  entries: ProgressEntry[],
  dateFrom?: Date,
  dateTo?: Date
): ChartDataPoint[] {
  // Filter entries by date range if provided
  let filteredEntries = entries;
  if (dateFrom || dateTo) {
    filteredEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.date);
      if (dateFrom && entryDate < dateFrom) return false;
      if (dateTo && entryDate > dateTo) return false;
      return true;
    });
  }

  // Sort by date
  const sortedEntries = [...filteredEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Format for chart
  return sortedEntries.map((entry) => ({
    date: new Date(entry.date).toISOString().split("T")[0],
    weight: entry.weight,
    waist: entry.waist,
    hip: entry.hip,
    bodyFat: entry.bodyFat,
  }));
}


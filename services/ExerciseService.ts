import prisma from "@/lib/prisma";

export interface ExerciseLog {
  id: number;
  userId: number;
  clientId: number;
  date: Date;
  exerciseTypeId: number | null;
  definition: {
    id: number;
    name: string;
    type: string;
  } | null;
  description: string | null;
  duration: number | null;
  steps: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseStats {
  totalExercises: number;
  totalDuration: number;
  totalSteps: number;
  byType: Record<string, number>;
}

export interface ChartDataPoint {
  exerciseType: string;
  count: number;
  totalDuration: number;
  totalSteps: number;
}

/**
 * Get exercise logs with date filtering
 */
export async function getExerciseLogs(
  clientId: number,
  dateFrom?: Date,
  dateTo?: Date
): Promise<ExerciseLog[]> {
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

  const logs = await prisma.exerciseLog.findMany({
    where,
    include: {
      definition: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  return logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    clientId: log.clientId,
    date: log.date,
    exerciseTypeId: log.exerciseTypeId,
    definition: log.definition
      ? {
          id: log.definition.id,
          name: log.definition.name,
          type: log.definition.type,
        }
      : null,
    description: log.description,
    duration: log.duration,
    steps: log.steps,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  }));
}

/**
 * Create exercise log
 */
export async function createExerciseLog(
  userId: number,
  clientId: number,
  data: {
    date: Date;
    exerciseTypeId?: number | null;
    description?: string | null;
    duration?: number | null;
    steps?: number | null;
  }
): Promise<ExerciseLog> {
  const log = await prisma.exerciseLog.create({
    data: {
      userId,
      clientId,
      date: data.date,
      exerciseTypeId: data.exerciseTypeId ?? null,
      description: data.description ?? null,
      duration: data.duration ?? null,
      steps: data.steps ?? null,
    },
    include: {
      definition: true,
    },
  });

  return {
    id: log.id,
    userId: log.userId,
    clientId: log.clientId,
    date: log.date,
    exerciseTypeId: log.exerciseTypeId,
    definition: log.definition
      ? {
          id: log.definition.id,
          name: log.definition.name,
          type: log.definition.type,
        }
      : null,
    description: log.description,
    duration: log.duration,
    steps: log.steps,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  };
}

/**
 * Get exercise statistics
 */
export function getExerciseStats(
  logs: ExerciseLog[],
  dateFrom?: Date,
  dateTo?: Date
): ExerciseStats {
  // Filter logs by date range if provided
  let filteredLogs = logs;
  if (dateFrom || dateTo) {
    filteredLogs = logs.filter((log) => {
      const logDate = new Date(log.date);
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo && logDate > dateTo) return false;
      return true;
    });
  }

  const totalExercises = filteredLogs.length;
  const totalDuration = filteredLogs.reduce(
    (sum, log) => sum + (log.duration || 0),
    0
  );
  const totalSteps = filteredLogs.reduce(
    (sum, log) => sum + (log.steps || 0),
    0
  );

  // Group by exercise type
  const byType: Record<string, number> = {};
  filteredLogs.forEach((log) => {
    const typeName = log.definition?.name || "Diğer";
    byType[typeName] = (byType[typeName] || 0) + 1;
  });

  return {
    totalExercises,
    totalDuration,
    totalSteps,
    byType,
  };
}

/**
 * Group exercises by type for bar chart
 */
export function groupByExerciseType(
  logs: ExerciseLog[],
  dateFrom?: Date,
  dateTo?: Date
): ChartDataPoint[] {
  // Filter logs by date range if provided
  let filteredLogs = logs;
  if (dateFrom || dateTo) {
    filteredLogs = logs.filter((log) => {
      const logDate = new Date(log.date);
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo && logDate > dateTo) return false;
      return true;
    });
  }

  // Group by exercise type
  const grouped: Record<
    string,
    { count: number; totalDuration: number; totalSteps: number }
  > = {};

  filteredLogs.forEach((log) => {
    const typeName = log.definition?.name || "Diğer";
    if (!grouped[typeName]) {
      grouped[typeName] = {
        count: 0,
        totalDuration: 0,
        totalSteps: 0,
      };
    }
    grouped[typeName].count += 1;
    grouped[typeName].totalDuration += log.duration || 0;
    grouped[typeName].totalSteps += log.steps || 0;
  });

  // Convert to array
  return Object.entries(grouped).map(([exerciseType, data]) => ({
    exerciseType,
    count: data.count,
    totalDuration: data.totalDuration,
    totalSteps: data.totalSteps,
  }));
}


import prisma from "@/lib/prisma";
import type { ExerciseLog } from "@/lib/exercise";
export * from "@/lib/exercise";

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


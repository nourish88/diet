import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";
import { UpdateExerciseLogInput } from "@/schemas/api/exercise";

export const dynamic = "force-dynamic";

type Params = { id: string };

async function assertOwned(logId: number, userId: number) {
  const existing = await prisma.exerciseLog.findUnique({
    where: { id: logId },
    select: { userId: true },
  });
  if (!existing) throw new HttpError("not_found", "Log not found");
  if (existing.userId !== userId) throw new HttpError("forbidden", "Forbidden");
}

function parseLogId(raw: string): number {
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) throw new HttpError("bad_request", "Invalid log ID");
  return id;
}

export const PUT = route<typeof UpdateExerciseLogInput, Params>({
  cors: true,
  auth: "client",
  schema: UpdateExerciseLogInput,
  scope: "exercises.update",
  handler: async ({ body, params, auth }) => {
    const logId = parseLogId(params.id);
    await assertOwned(logId, auth.user!.id);

    const updated = await prisma.exerciseLog.update({
      where: { id: logId },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        exerciseTypeId: body.exerciseTypeId,
        description: body.description,
        duration: body.duration,
        steps: body.steps,
      },
      include: { definition: true },
    });

    return { success: true, log: updated };
  },
});

export const DELETE = route<undefined, Params>({
  cors: true,
  auth: "client",
  scope: "exercises.delete",
  handler: async ({ params, auth }) => {
    const logId = parseLogId(params.id);
    await assertOwned(logId, auth.user!.id);
    await prisma.exerciseLog.delete({ where: { id: logId } });
    return { success: true };
  },
});

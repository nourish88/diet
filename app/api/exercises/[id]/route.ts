import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";
import { UpdateExerciseLogInput } from "@/schemas/api/exercise";

export const dynamic = "force-dynamic";

type Params = { id: string };

async function assertOwnership(logId: number, userId: number) {
  const existing = await prisma.exerciseLog.findUnique({
    where: { id: logId },
    select: { userId: true },
  });
  if (!existing) return "not_found" as const;
  if (existing.userId !== userId) return "forbidden" as const;
  return "ok" as const;
}

export const PUT = route<typeof UpdateExerciseLogInput, Params>({
  auth: "client",
  schema: UpdateExerciseLogInput,
  scope: "exercises.update",
  handler: async ({ body, params, auth, log }) => {
    try {
      const logId = parseInt(params.id, 10);
      if (Number.isNaN(logId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid log ID" }, { status: 400 }),
        );
      }
      const check = await assertOwnership(logId, auth.user!.id);
      if (check === "not_found") {
        return addCorsHeaders(NextResponse.json({ error: "Log not found" }, { status: 404 }));
      }
      if (check === "forbidden") {
        return addCorsHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      }

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

      return addCorsHeaders(NextResponse.json({ success: true, log: updated }));
    } catch (err) {
      log.error("update failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Failed to update exercise log" },
          { status: 500 },
        ),
      );
    }
  },
});

export const DELETE = route<undefined, Params>({
  auth: "client",
  scope: "exercises.delete",
  handler: async ({ params, auth, log }) => {
    try {
      const logId = parseInt(params.id, 10);
      if (Number.isNaN(logId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid log ID" }, { status: 400 }),
        );
      }
      const check = await assertOwnership(logId, auth.user!.id);
      if (check === "not_found") {
        return addCorsHeaders(NextResponse.json({ error: "Log not found" }, { status: 404 }));
      }
      if (check === "forbidden") {
        return addCorsHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      }

      await prisma.exerciseLog.delete({ where: { id: logId } });
      return addCorsHeaders(NextResponse.json({ success: true }));
    } catch (err) {
      log.error("delete failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Failed to delete exercise log" },
          { status: 500 },
        ),
      );
    }
  },
});

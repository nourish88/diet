import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";

type Params = { id: string };

const UpdatePresetBody = z.object({
  name: z.string().optional(),
  mealType: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

function parseId(raw: string) {
  const id = parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

async function findOwn(id: number, dietitianId: number) {
  return prisma.mealPreset.findFirst({
    where: { id, dietitianId },
    select: { id: true, dietitianId: true },
  });
}

export const GET = route<undefined, Params>({
  auth: "dietitian",
  scope: "presets.get",
  handler: async ({ params, auth }) => {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: "Invalid preset ID" }, { status: 400 });
    }
    const preset = await prisma.mealPreset.findFirst({
      where: { id, dietitianId: auth.user!.id },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!preset) {
      return NextResponse.json({ error: "Preset bulunamadı" }, { status: 404 });
    }
    return NextResponse.json(preset);
  },
});

export const PUT = route<typeof UpdatePresetBody, Params>({
  auth: "dietitian",
  schema: UpdatePresetBody,
  scope: "presets.update",
  handler: async ({ body, params, auth, log }) => {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: "Invalid preset ID" }, { status: 400 });
    }
    const owned = await findOwn(id, auth.user!.id);
    if (!owned) {
      return NextResponse.json({ error: "Preset bulunamadı" }, { status: 404 });
    }
    try {
      const preset = await prisma.mealPreset.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.mealType !== undefined ? { mealType: body.mealType ?? null } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
        include: { items: true },
      });
      invalidate.presets(preset.dietitianId ?? undefined);
      return NextResponse.json(preset);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return NextResponse.json({ error: "Preset bulunamadı" }, { status: 404 });
      }
      log.error("update failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Preset güncellenirken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

export const DELETE = route<undefined, Params>({
  auth: "dietitian",
  scope: "presets.delete",
  handler: async ({ params, auth, log }) => {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: "Invalid preset ID" }, { status: 400 });
    }
    const owned = await findOwn(id, auth.user!.id);
    if (!owned) {
      return NextResponse.json({ error: "Preset bulunamadı" }, { status: 404 });
    }
    try {
      await prisma.mealPreset.delete({ where: { id } });
      invalidate.presets(owned.dietitianId ?? undefined);
      return NextResponse.json({ message: "Preset silindi" });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return NextResponse.json({ error: "Preset bulunamadı" }, { status: 404 });
      }
      log.error("delete failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Preset silinirken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

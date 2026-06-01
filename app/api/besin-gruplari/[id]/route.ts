import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";

type Params = { id: string };

const UpdateBesinGroupBody = z.object({
  description: z.string().min(1, "Geçerli bir açıklama gerekmektedir"),
});

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export const GET = route<undefined, Params>({
  auth: "any",
  scope: "besin-gruplari.get",
  handler: async ({ params }) => {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }
    const group = await prisma.besinGroup.findUnique({
      where: { id },
      include: { besins: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Besin grubu bulunamadı" }, { status: 404 });
    }
    return NextResponse.json(group);
  },
});

export const PUT = route<typeof UpdateBesinGroupBody, Params>({
  auth: "dietitian",
  schema: UpdateBesinGroupBody,
  scope: "besin-gruplari.update",
  handler: async ({ body, params, log }) => {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }
    try {
      const existing = await prisma.besinGroup.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Besin grubu bulunamadı" }, { status: 404 });
      }
      const updated = await prisma.besinGroup.update({
        where: { id },
        data: { description: body.description },
      });
      invalidate.besinGroups();
      invalidate.besinler();
      return NextResponse.json(updated);
    } catch (err) {
      log.error("update failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Besin grubu güncellenirken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

export const DELETE = route<undefined, Params>({
  auth: "dietitian",
  scope: "besin-gruplari.delete",
  handler: async ({ params, log }) => {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }
    try {
      const existing = await prisma.besinGroup.findUnique({
        where: { id },
        select: { id: true, besins: { select: { id: true } } },
      });
      if (!existing) {
        return NextResponse.json({ error: "Besin grubu bulunamadı" }, { status: 404 });
      }
      if (existing.besins.length > 0) {
        await prisma.besin.updateMany({
          where: { groupId: id },
          data: { groupId: null },
        });
      }
      await prisma.besinGroup.delete({ where: { id } });
      invalidate.besinGroups();
      invalidate.besinler();
      return NextResponse.json({ success: true });
    } catch (err) {
      log.error("delete failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Besin grubu silinirken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

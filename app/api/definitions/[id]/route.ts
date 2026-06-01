import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";

type Params = { id: string };

const UpdateDefinitionBody = z
  .object({
    name: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.isActive !== undefined, {
    message: "Güncellenecek veri bulunamadı",
  });

function parseId(raw: string) {
  const id = parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

export const PUT = route<typeof UpdateDefinitionBody, Params>({
  auth: "dietitian",
  schema: UpdateDefinitionBody,
  scope: "definitions.update",
  handler: async ({ body, params, log }) => {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: "Invalid definition ID" }, { status: 400 });
    }
    try {
      const definition = await prisma.definition.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });
      invalidate.definitions();
      return NextResponse.json(definition);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return NextResponse.json({ error: "Tanımlama bulunamadı" }, { status: 404 });
      }
      log.error("update failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Tanımlama güncellenirken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

export const DELETE = route<undefined, Params>({
  auth: "dietitian",
  scope: "definitions.delete",
  handler: async ({ params, log }) => {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: "Invalid definition ID" }, { status: 400 });
    }
    try {
      await prisma.definition.delete({ where: { id } });
      invalidate.definitions();
      return NextResponse.json({ message: "Tanımlama silindi" });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return NextResponse.json({ error: "Tanımlama bulunamadı" }, { status: 404 });
      }
      log.error("delete failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Tanımlama silinirken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

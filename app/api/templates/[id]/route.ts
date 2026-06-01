import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";

type Params = { id: string };

const UpdateTemplateBody = z.object({
  name: z.string().optional(),
  description: z.string().nullish(),
  category: z.string().nullish(),
  su: z.string().nullish(),
  fizik: z.string().nullish(),
  hedef: z.string().nullish(),
  sonuc: z.string().nullish(),
  isActive: z.boolean().optional(),
});

function isMissingRecord(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export const GET = route<undefined, Params>({
  auth: "dietitian",
  scope: "templates.get",
  handler: async ({ params, auth, log }) => {
    try {
      const id = parseInt(params.id, 10);
      if (Number.isNaN(id)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid template ID" }, { status: 400 }),
        );
      }

      const template = await prisma.dietTemplate.findFirst({
        where: { id, dietitianId: auth.user!.id },
        include: {
          oguns: {
            include: { items: { orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!template) {
        return addCorsHeaders(
          NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 }),
        );
      }
      return addCorsHeaders(NextResponse.json(template));
    } catch (err) {
      log.error("get failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Şablon yüklenirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

export const PUT = route<typeof UpdateTemplateBody, Params>({
  auth: "dietitian",
  schema: UpdateTemplateBody,
  scope: "templates.update",
  handler: async ({ body, params, auth, log }) => {
    try {
      const id = parseInt(params.id, 10);
      if (Number.isNaN(id)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid template ID" }, { status: 400 }),
        );
      }

      const existing = await prisma.dietTemplate.findFirst({
        where: { id, dietitianId: auth.user!.id },
      });
      if (!existing) {
        return addCorsHeaders(
          NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 }),
        );
      }

      const updateData: Prisma.DietTemplateUpdateInput = {};
      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.description !== undefined)
        updateData.description = body.description?.trim() || null;
      if (body.category !== undefined) updateData.category = body.category || null;
      if (body.su !== undefined) updateData.su = body.su || null;
      if (body.fizik !== undefined) updateData.fizik = body.fizik || null;
      if (body.hedef !== undefined) updateData.hedef = body.hedef || null;
      if (body.sonuc !== undefined) updateData.sonuc = body.sonuc || null;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;

      const template = await prisma.dietTemplate.update({
        where: { id },
        data: updateData,
        include: { oguns: { include: { items: true } } },
      });

      invalidate.templates(auth.user!.id);
      return addCorsHeaders(NextResponse.json(template));
    } catch (err) {
      if (isMissingRecord(err)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 }),
        );
      }
      log.error("update failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Şablon güncellenirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

export const DELETE = route<undefined, Params>({
  auth: "dietitian",
  scope: "templates.delete",
  handler: async ({ params, auth, log }) => {
    try {
      const id = parseInt(params.id, 10);
      if (Number.isNaN(id)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid template ID" }, { status: 400 }),
        );
      }

      const existing = await prisma.dietTemplate.findFirst({
        where: { id, dietitianId: auth.user!.id },
      });
      if (!existing) {
        return addCorsHeaders(
          NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 }),
        );
      }

      await prisma.dietTemplate.delete({ where: { id } });

      invalidate.templates(auth.user!.id);
      return addCorsHeaders(NextResponse.json({ message: "Şablon silindi" }));
    } catch (err) {
      if (isMissingRecord(err)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 }),
        );
      }
      log.error("delete failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Şablon silinirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

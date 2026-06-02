import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { invalidate } from "@/lib/cache";
import { route, HttpError } from "@/lib/api/handler";

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

function parseTemplateId(raw: string): number {
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) throw new HttpError("bad_request", "Invalid template ID");
  return id;
}

async function findOwn(id: number, dietitianId: number) {
  const existing = await prisma.dietTemplate.findFirst({
    where: { id, dietitianId },
    select: { id: true },
  });
  if (!existing) throw new HttpError("not_found", "Şablon bulunamadı");
}

export const GET = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "templates.get",
  handler: async ({ params, auth }) => {
    const id = parseTemplateId(params.id);
    const template = await prisma.dietTemplate.findFirst({
      where: { id, dietitianId: auth.user!.id },
      include: {
        oguns: {
          include: { items: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!template) throw new HttpError("not_found", "Şablon bulunamadı");
    return template;
  },
});

export const PUT = route<typeof UpdateTemplateBody, Params>({
  cors: true,
  auth: "dietitian",
  schema: UpdateTemplateBody,
  scope: "templates.update",
  handler: async ({ body, params, auth }) => {
    const id = parseTemplateId(params.id);
    await findOwn(id, auth.user!.id);

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

    try {
      const template = await prisma.dietTemplate.update({
        where: { id },
        data: updateData,
        include: { oguns: { include: { items: true } } },
      });
      invalidate.templates(auth.user!.id);
      return template;
    } catch (err) {
      if (isMissingRecord(err)) {
        throw new HttpError("not_found", "Şablon bulunamadı");
      }
      throw err;
    }
  },
});

export const DELETE = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "templates.delete",
  handler: async ({ params, auth }) => {
    const id = parseTemplateId(params.id);
    await findOwn(id, auth.user!.id);
    try {
      await prisma.dietTemplate.delete({ where: { id } });
      invalidate.templates(auth.user!.id);
      return { message: "Şablon silindi" };
    } catch (err) {
      if (isMissingRecord(err)) {
        throw new HttpError("not_found", "Şablon bulunamadı");
      }
      throw err;
    }
  },
});

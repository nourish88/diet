import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCachedTemplates, invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";

const TemplateItem = z.object({
  besinName: z.string().optional(),
  besin: z.string().optional(),
  miktar: z.string().optional(),
  birim: z.string().optional(),
});

const TemplateOgun = z.object({
  name: z.string(),
  time: z.string(),
  detail: z.string().nullish(),
  order: z.number().optional(),
  items: z.array(TemplateItem).optional(),
});

const CreateTemplateBody = z.object({
  name: z.string().min(1, "Şablon adı zorunludur"),
  description: z.string().nullish(),
  category: z.string().nullish(),
  su: z.string().nullish(),
  fizik: z.string().nullish(),
  hedef: z.string().nullish(),
  sonuc: z.string().nullish(),
  oguns: z.array(TemplateOgun).optional(),
});

export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "templates.list",
  handler: async ({ request, auth }) => {
    const category = request.nextUrl.searchParams.get("category");
    return getCachedTemplates(auth.user!.id, category);
  },
});

export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: CreateTemplateBody,
  scope: "templates.create",
  handler: async ({ body, auth }) => {
    const template = await prisma.dietTemplate.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        category: body.category || null,
        su: body.su || null,
        fizik: body.fizik || null,
        hedef: body.hedef || null,
        sonuc: body.sonuc || null,
        isActive: true,
        dietitianId: auth.user!.id,
        oguns: {
          create: (body.oguns ?? []).map((ogun) => ({
            name: ogun.name,
            time: ogun.time,
            detail: ogun.detail || null,
            order: ogun.order || 0,
            items: {
              create: (ogun.items ?? []).map((item, idx) => ({
                besinName: item.besinName || item.besin || "",
                miktar: item.miktar || "",
                birim: item.birim || "",
                order: idx,
              })),
            },
          })),
        },
      },
      include: { oguns: { include: { items: true } } },
    });

    invalidate.templates(auth.user!.id);
    return ok(template, { status: 201 });
  },
});

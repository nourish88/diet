import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { getCachedTemplates, invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";

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
  handler: async ({ request, auth, log }) => {
    try {
      const category = request.nextUrl.searchParams.get("category");
      const templates = await getCachedTemplates(auth.user!.id, category);
      return addCorsHeaders(NextResponse.json(templates));
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Şablonlar yüklenirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: CreateTemplateBody,
  scope: "templates.create",
  handler: async ({ body, auth, log }) => {
    try {
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
      return addCorsHeaders(NextResponse.json(template, { status: 201 }));
    } catch (err) {
      log.error("create failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Şablon oluşturulurken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

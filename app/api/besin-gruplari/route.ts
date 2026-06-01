import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCachedBesinGroups, invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";

const CreateBesinGroupBody = z.object({
  name: z.string().optional(),
  description: z.string().min(1, "Geçerli bir açıklama gerekmektedir"),
});

export const GET = route({
  auth: "any",
  scope: "besin-gruplari.list",
  handler: async ({ log }) => {
    try {
      const groups = await getCachedBesinGroups();
      return NextResponse.json(groups);
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Besin grupları yüklenirken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

export const POST = route({
  auth: "dietitian",
  schema: CreateBesinGroupBody,
  scope: "besin-gruplari.create",
  handler: async ({ body, log }) => {
    try {
      const group = await prisma.besinGroup.create({
        data: {
          name: body.name ?? "",
          description: body.description,
        },
      });
      invalidate.besinGroups();
      return NextResponse.json(group, { status: 201 });
    } catch (err) {
      log.error("create failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Besin grubu oluşturulurken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

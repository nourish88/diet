import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCachedDefinitions, invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";

const DefinitionType = z.enum(["su_tuketimi", "fiziksel_aktivite", "egzersiz_tipi"]);

const CreateDefinitionBody = z.object({
  type: DefinitionType,
  name: z.string().min(1, "Tanımlama metni zorunludur"),
});

export const GET = route({
  auth: "any",
  scope: "definitions.list",
  handler: async ({ request, log }) => {
    try {
      const type = request.nextUrl.searchParams.get("type");
      const definitions = await getCachedDefinitions(type);
      return NextResponse.json({ definitions });
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Tanımlamalar yüklenirken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

export const POST = route({
  auth: "dietitian",
  schema: CreateDefinitionBody,
  scope: "definitions.create",
  handler: async ({ body, log }) => {
    try {
      const definition = await prisma.definition.create({
        data: {
          type: body.type,
          name: body.name.trim(),
          isActive: true,
        },
      });
      invalidate.definitions();
      return NextResponse.json(definition, { status: 201 });
    } catch (err) {
      log.error("create failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Tanımlama oluşturulurken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

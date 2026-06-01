import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { getCachedSystemConfig, invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";

type Params = { key: string };

const UpdateConfigBody = z.object({
  value: z.string(),
  description: z.string().optional().nullable(),
});

/** GET /api/system-config/[key] — read a system config value (dietitian only). */
export const GET = route<undefined, Params>({
  auth: "dietitian",
  scope: "system-config.get",
  handler: async ({ params, log }) => {
    try {
      const { key } = params;
      const config = await getCachedSystemConfig(key);
      if (!config) {
        return addCorsHeaders(
          NextResponse.json({
            key,
            value: key === "diet_form_logging_enabled" ? "false" : "",
            exists: false,
          }),
        );
      }
      return addCorsHeaders(NextResponse.json(config));
    } catch (err) {
      log.error("get failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to fetch config" }, { status: 500 }),
      );
    }
  },
});

/** PUT /api/system-config/[key] — upsert a system config value (dietitian only). */
export const PUT = route<typeof UpdateConfigBody, Params>({
  auth: "dietitian",
  schema: UpdateConfigBody,
  scope: "system-config.update",
  handler: async ({ body, params, log }) => {
    try {
      const { key } = params;
      const config = await prisma.systemConfig.upsert({
        where: { key },
        update: {
          value: body.value,
          description: body.description || undefined,
        },
        create: {
          key,
          value: body.value,
          description: body.description || "System configuration",
        },
      });

      invalidate.systemConfig(key);
      return addCorsHeaders(NextResponse.json(config));
    } catch (err) {
      log.error("update failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to update config" }, { status: 500 }),
      );
    }
  },
});

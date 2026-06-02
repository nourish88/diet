import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCachedSystemConfig, invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";

type Params = { key: string };

const UpdateConfigBody = z.object({
  value: z.string(),
  description: z.string().optional().nullable(),
});

/** GET /api/system-config/[key] — read a system config value (dietitian only). */
export const GET = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "system-config.get",
  handler: async ({ params }) => {
    const { key } = params;
    const config = await getCachedSystemConfig(key);
    if (!config) {
      return {
        key,
        value: key === "diet_form_logging_enabled" ? "false" : "",
        exists: false,
      };
    }
    return config;
  },
});

/** PUT /api/system-config/[key] — upsert a system config value (dietitian only). */
export const PUT = route<typeof UpdateConfigBody, Params>({
  cors: true,
  auth: "dietitian",
  schema: UpdateConfigBody,
  scope: "system-config.update",
  handler: async ({ body, params }) => {
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
    return config;
  },
});

import { z } from "zod";
import prisma from "@/lib/prisma";
import { generateApiKey, hashApiKey } from "@/lib/api-key-auth";
import { route, HttpError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

const CreateApiKeyBody = z.object({
  name: z.string().min(1),
  appName: z.string().min(1),
  permissions: z.array(z.string()).optional(),
  expiresAt: z.string().nullish(),
});

const UpdateApiKeyBody = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().optional(),
  appName: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().nullish(),
});

/** GET /api/api-keys — list the dietitian's API keys. */
export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "api-keys.list",
  handler: async ({ auth }) => {
    const apiKeys = await prisma.apiKey.findMany({
      where: { dietitianId: auth.user!.id },
      select: {
        id: true,
        name: true,
        appName: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { apiKeys };
  },
});

/** POST /api/api-keys — create a new API key (plaintext returned once). */
export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: CreateApiKeyBody,
  scope: "api-keys.create",
  handler: async ({ body, auth }) => {
    const apiKey = generateApiKey();
    const hashedKey = hashApiKey(apiKey);

    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        name: body.name,
        appName: body.appName,
        permissions: body.permissions || ["*:*"],
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        dietitianId: auth.user!.id,
      },
      select: {
        id: true,
        name: true,
        appName: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      apiKey: apiKeyRecord,
      key: apiKey,
      message:
        "API key created successfully. Save this key securely as it won't be shown again.",
    };
  },
});

/** PUT /api/api-keys — update an existing API key (owner only). */
export const PUT = route({
  cors: true,
  auth: "dietitian",
  schema: UpdateApiKeyBody,
  scope: "api-keys.update",
  handler: async ({ body, auth }) => {
    const existing = await prisma.apiKey.findFirst({
      where: { id: body.id, dietitianId: auth.user!.id },
      select: { id: true },
    });
    if (!existing) throw new HttpError("not_found", "API key not found");

    const updatedKey = await prisma.apiKey.update({
      where: { id: body.id },
      data: {
        name: body.name,
        appName: body.appName,
        permissions: body.permissions,
        isActive: body.isActive,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        appName: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        updatedAt: true,
      },
    });

    return { apiKey: updatedKey };
  },
});

/** DELETE /api/api-keys?id= — delete an API key (owner only). */
export const DELETE = route({
  cors: true,
  auth: "dietitian",
  scope: "api-keys.delete",
  handler: async ({ request, auth }) => {
    const idParam = request.nextUrl.searchParams.get("id");
    if (!idParam) {
      throw new HttpError("bad_request", "API key ID is required");
    }
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      throw new HttpError("bad_request", "API key ID is required");
    }

    const existing = await prisma.apiKey.findFirst({
      where: { id, dietitianId: auth.user!.id },
      select: { id: true },
    });
    if (!existing) throw new HttpError("not_found", "API key not found");

    await prisma.apiKey.delete({ where: { id } });
    return { message: "API key deleted successfully" };
  },
});

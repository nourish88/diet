import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { route, HttpError } from "@/lib/api/handler";
import prisma from "@/lib/prisma";
import { defaultAssistantPermissions } from "@/lib/assistants/permissions";

const CreateBody = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(72),
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new HttpError(
      "internal",
      "Supabase service role not configured on server",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function assertDietitianOwner(auth: { user: { isAssistant?: boolean } | null }) {
  if (!auth.user) throw new HttpError("unauthorized", "Unauthorized");
  if (auth.user.isAssistant) {
    throw new HttpError("forbidden", "Assistants cannot manage assistants");
  }
}

/** GET /api/assistants — list assistants belonging to the calling dietitian. */
export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "assistants.list",
  handler: async ({ auth }) => {
    assertDietitianOwner(auth);
    const assistants = await prisma.user.findMany({
      where: { role: "assistant", assistantOfId: auth.user!.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        assistantPermissions: true,
      },
    });
    return {
      success: true,
      assistants: assistants.map((a) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        createdAt: a.createdAt.toISOString(),
        permissions: a.assistantPermissions ?? defaultAssistantPermissions(),
      })),
    };
  },
});

/** POST /api/assistants — create a new assistant for the calling dietitian. */
export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: CreateBody,
  scope: "assistants.create",
  handler: async ({ body, auth, log }) => {
    assertDietitianOwner(auth);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new HttpError("conflict", "Bu e-posta zaten kullanılıyor");
    }

    const supabase = getSupabaseAdmin();
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { role: "assistant", name: body.name },
    });

    if (createError || !created.user) {
      log.error("supabase create failed", createError?.message ?? "unknown");
      throw new HttpError(
        "internal",
        createError?.message ?? "Supabase kullanıcı oluşturulamadı",
      );
    }

    try {
      const assistant = await prisma.user.create({
        data: {
          supabaseId: created.user.id,
          email: body.email,
          name: body.name,
          role: "assistant",
          isApproved: true,
          approvedAt: new Date(),
          assistantOfId: auth.user!.id,
          assistantPermissions: defaultAssistantPermissions() as any,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          assistantPermissions: true,
        },
      });

      return {
        success: true,
        assistant: {
          id: assistant.id,
          email: assistant.email,
          name: assistant.name,
          createdAt: assistant.createdAt.toISOString(),
          permissions:
            assistant.assistantPermissions ?? defaultAssistantPermissions(),
        },
      };
    } catch (err) {
      // Roll back the Supabase user if Postgres insert failed.
      try {
        await supabase.auth.admin.deleteUser(created.user.id);
      } catch (rollbackErr) {
        log.error(
          "supabase rollback failed",
          rollbackErr instanceof Error ? rollbackErr.message : rollbackErr,
        );
      }
      throw err;
    }
  },
});

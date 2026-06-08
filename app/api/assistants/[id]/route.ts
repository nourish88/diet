import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { route, HttpError } from "@/lib/api/handler";
import prisma from "@/lib/prisma";
import {
  defaultAssistantPermissions,
  mergeAssistantPermissions,
} from "@/lib/assistants/permissions";
import type { AssistantPermissions } from "@/lib/api-auth";

type Params = { id: string };

const PatchBody = z.object({
  permissions: z.object({
    notifications: z
      .object({
        birthdayReminders: z.boolean().optional(),
      })
      .optional(),
  }),
});

function assertDietitianOwner(auth: { user: { isAssistant?: boolean } | null }) {
  if (!auth.user) throw new HttpError("unauthorized", "Unauthorized");
  if (auth.user.isAssistant) {
    throw new HttpError("forbidden", "Assistants cannot manage assistants");
  }
}

async function loadOwnedAssistant(assistantId: number, dietitianId: number) {
  const assistant = await prisma.user.findUnique({
    where: { id: assistantId },
    select: {
      id: true,
      supabaseId: true,
      role: true,
      assistantOfId: true,
      assistantPermissions: true,
    },
  });
  if (
    !assistant ||
    assistant.role !== "assistant" ||
    assistant.assistantOfId !== dietitianId
  ) {
    throw new HttpError("not_found", "Asistan bulunamadı");
  }
  return assistant;
}

export const PATCH = route<typeof PatchBody, Params>({
  cors: true,
  auth: "dietitian",
  schema: PatchBody,
  scope: "assistants.update",
  handler: async ({ body, params, auth }) => {
    assertDietitianOwner(auth);
    const assistantId = parseInt(params.id, 10);
    if (Number.isNaN(assistantId)) {
      throw new HttpError("bad_request", "Geçersiz asistan kimliği");
    }
    const assistant = await loadOwnedAssistant(assistantId, auth.user!.id);

    const merged = mergeAssistantPermissions(
      (assistant.assistantPermissions as AssistantPermissions | null) ??
        defaultAssistantPermissions(),
      body.permissions,
    );

    await prisma.user.update({
      where: { id: assistant.id },
      data: { assistantPermissions: merged as any },
    });

    return { success: true, permissions: merged };
  },
});

export const DELETE = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "assistants.delete",
  handler: async ({ params, auth, log }) => {
    assertDietitianOwner(auth);
    const assistantId = parseInt(params.id, 10);
    if (Number.isNaN(assistantId)) {
      throw new HttpError("bad_request", "Geçersiz asistan kimliği");
    }
    const assistant = await loadOwnedAssistant(assistantId, auth.user!.id);

    await prisma.user.delete({ where: { id: assistant.id } });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey && assistant.supabaseId) {
      try {
        const supabase = createClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { error } = await supabase.auth.admin.deleteUser(
          assistant.supabaseId,
        );
        if (error) log.error("supabase delete failed", error.message);
      } catch (err) {
        log.error(
          "supabase delete threw",
          err instanceof Error ? err.message : err,
        );
      }
    }

    return { success: true };
  },
});

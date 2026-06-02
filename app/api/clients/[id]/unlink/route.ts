import prisma from "@/lib/prisma";
import { requireOwnClient } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";
import { route, HttpError } from "@/lib/api/handler";

type Params = { id: string };

/**
 * POST /api/clients/[id]/unlink — unlink a client from its user account and delete
 * the user (Prisma + Supabase) so they can re-register (dietitian, owner only).
 */
export const POST = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "clients.unlink",
  handler: async ({ params, auth, log }) => {
    const clientId = parseInt(params.id, 10);
    if (Number.isNaN(clientId)) {
      throw new HttpError("bad_request", "Invalid client ID");
    }
    if (!(await requireOwnClient(clientId, auth))) {
      throw new HttpError("forbidden", "Access denied");
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    });
    if (!client) throw new HttpError("not_found", "Client not found");
    if (!client.userId) {
      throw new HttpError(
        "bad_request",
        "Client is not linked to any user account",
      );
    }

    await prisma.client.update({
      where: { id: clientId },
      data: { userId: null },
    });

    if (client.user) {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && client.user.supabaseId) {
        try {
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } },
          );
          const { error: deleteError } =
            await supabaseAdmin.auth.admin.deleteUser(client.user.supabaseId);
          if (deleteError) {
            log.error("supabase delete failed", deleteError.message);
          }
        } catch (supabaseError) {
          log.error(
            "supabase delete threw",
            supabaseError instanceof Error ? supabaseError.message : supabaseError,
          );
        }
      }

      await prisma.user.delete({ where: { id: client.user.id } });
    }

    return {
      success: true,
      message: "Client unlinked successfully. User can now be re-mapped.",
    };
  },
});

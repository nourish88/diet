import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOwnClient } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";
import { createClient } from "@supabase/supabase-js";
import { route } from "@/lib/api/handler";

type Params = { id: string };

/**
 * POST /api/clients/[id]/unlink — unlink a client from its user account and delete
 * the user (Prisma + Supabase) so they can re-register (dietitian, owner only).
 */
export const POST = route<undefined, Params>({
  auth: "dietitian",
  scope: "clients.unlink",
  handler: async ({ params, auth, log }) => {
    try {
      const clientId = parseInt(params.id, 10);
      if (Number.isNaN(clientId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid client ID" }, { status: 400 }),
        );
      }

      if (!(await requireOwnClient(clientId, auth))) {
        return addCorsHeaders(
          NextResponse.json({ error: "Access denied" }, { status: 403 }),
        );
      }

      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: { user: true },
      });
      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client not found" }, { status: 404 }),
        );
      }
      if (!client.userId) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Client is not linked to any user account" },
            { status: 400 },
          ),
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

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          message: "Client unlinked successfully. User can now be re-mapped.",
        }),
      );
    } catch (err) {
      log.error("unlink failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to unlink client" }, { status: 500 }),
      );
    }
  },
});

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

/** GET /api/pending-clients — list pending client registrations (dietitian only). */
export const GET = route({
  auth: "dietitian",
  scope: "pending-clients.list",
  handler: async ({ log }) => {
    try {
      const pendingUsers = await prisma.user.findMany({
        where: { role: "client", isApproved: false },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          supabaseId: true,
          email: true,
          referenceCode: true,
          createdAt: true,
        },
      });
      return addCorsHeaders(NextResponse.json(pendingUsers));
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Bekleyen kayıtlar yüklenirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

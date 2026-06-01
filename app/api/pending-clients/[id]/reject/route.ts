import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

type Params = { id: string };

/** DELETE /api/pending-clients/[id]/reject — reject (delete) a pending user (dietitian only). */
export const DELETE = route<undefined, Params>({
  auth: "dietitian",
  scope: "pending-clients.reject",
  handler: async ({ params, log }) => {
    try {
      const userId = parseInt(params.id, 10);
      if (Number.isNaN(userId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Geçersiz kullanıcı ID" }, { status: 400 }),
        );
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return addCorsHeaders(
          NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 }),
        );
      }
      if (user.isApproved) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Bu kullanıcı zaten onaylanmış, silinemez" },
            { status: 400 },
          ),
        );
      }

      await prisma.user.delete({ where: { id: userId } });

      return addCorsHeaders(
        NextResponse.json({ message: "Bekleyen kayıt başarıyla reddedildi" }),
      );
    } catch (err) {
      log.error("reject failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Client reddedilirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

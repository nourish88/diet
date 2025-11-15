import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

// DELETE - Reject pending client (remove from pending list)
export const DELETE = requireDietitian(
  async (
    request: NextRequest,
    auth: AuthResult,
    context: any
  ) => {
    try {
      const { params } = context;
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Geçersiz kullanıcı ID" }, { status: 400 })
        );
      }

      // Check if user exists and is pending
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return addCorsHeaders(
          NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 })
        );
      }

      if (user.isApproved) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Bu kullanıcı zaten onaylanmış, silinemez" },
            { status: 400 }
          )
        );
      }

      // Delete user (soft delete by marking as rejected could be alternative)
      await prisma.user.delete({
        where: { id: userId },
      });

      return addCorsHeaders(
        NextResponse.json({
          message: "Bekleyen kayıt başarıyla reddedildi",
        })
      );
    } catch (error: any) {
      console.error("Error rejecting client:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Client reddedilirken bir hata oluştu" },
          { status: 500 }
        )
      );
    }
  }
);









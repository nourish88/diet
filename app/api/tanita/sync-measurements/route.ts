import { NextRequest, NextResponse } from "next/server";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { TanitaProgressService } from "@/services/TanitaProgressService";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export const POST = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const body = await request.json();
      const { clientId } = body;

      if (!clientId) {
        const errorResponse = NextResponse.json(
          { error: "clientId gerekli" },
          { status: 400 }
        );
        return addCorsHeaders(errorResponse);
      }

      const dietitianId = auth.user!.id;

      // Client'ı kontrol et
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        const errorResponse = NextResponse.json(
          { error: "Client bulunamadı" },
          { status: 404 }
        );
        return addCorsHeaders(errorResponse);
      }

      // Dietitian kontrolü
      if (client.dietitianId !== dietitianId) {
        const errorResponse = NextResponse.json(
          { error: "Bu danışan size ait değil" },
          { status: 403 }
        );
        return addCorsHeaders(errorResponse);
      }

      // Tanita ile eşleştirilmiş mi kontrol et
      if (!client.tanitaMemberId) {
        const errorResponse = NextResponse.json(
          { error: "Client Tanita ile eşleştirilmemiş" },
          { status: 400 }
        );
        return addCorsHeaders(errorResponse);
      }

      // Ölçümleri sync et (userId opsiyonel - Tanita'dan gelen ölçümler için olmayabilir)
      const syncResult = await TanitaProgressService.syncMeasurementsToProgress(
        clientId,
        client.userId || undefined
      );

      const response = NextResponse.json({
        success: true,
        clientId: clientId,
        syncResult: syncResult,
      });

      return addCorsHeaders(response);
    } catch (error: any) {
      console.error("Error syncing Tanita measurements:", error);
      const response = NextResponse.json(
        {
          error: error.message || "Ölçüm sync başarısız",
        },
        { status: 500 }
      );
      return addCorsHeaders(response);
    }
  }
);


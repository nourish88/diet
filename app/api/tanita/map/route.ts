import { NextRequest, NextResponse } from "next/server";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { TanitaMappingService } from "@/services/TanitaMappingService";
import { TanitaProgressService } from "@/services/TanitaProgressService";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export const POST = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const body = await request.json();
      const { clientId, tanitaMemberId, syncMeasurements } = body;

      if (!clientId || !tanitaMemberId) {
        const errorResponse = NextResponse.json(
          { error: "clientId ve tanitaMemberId gerekli" },
          { status: 400 }
        );
        return addCorsHeaders(errorResponse);
      }

      const dietitianId = auth.user!.id;

      // Client'ı Tanita ile eşleştir
      const { client, tanitaUser } = await TanitaMappingService.mapClientToTanita(
        clientId,
        tanitaMemberId,
        dietitianId
      );

      // Ölçümleri aktar (eğer istenirse - userId opsiyonel)
      let progressSyncResult: { created: number; skipped: number; errors: string[] } | null = null;
      if (syncMeasurements) {
        progressSyncResult = await TanitaProgressService.syncMeasurementsToProgress(
          clientId,
          client.userId || undefined
        );
      }

      const response = NextResponse.json({
        success: true,
        client: {
          id: client.id,
          name: client.name,
          surname: client.surname,
          tanitaMemberId: client.tanitaMemberId,
        },
        tanitaUser: {
          id: tanitaUser.id,
          tanitaMemberId: tanitaUser.tanitaMemberId,
          name: tanitaUser.name,
          surname: tanitaUser.surname,
        },
        progressSync: progressSyncResult,
      });

      return addCorsHeaders(response);
    } catch (error: any) {
      console.error("Error mapping client to Tanita:", error);
      const response = NextResponse.json(
        {
          error: error.message || "Client eşleştirme başarısız",
        },
        { status: 500 }
      );
      return addCorsHeaders(response);
    }
  }
);


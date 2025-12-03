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
      const { tanitaMemberId, syncMeasurements } = body;

      if (!tanitaMemberId) {
        const errorResponse = NextResponse.json(
          { error: "tanitaMemberId gerekli" },
          { status: 400 }
        );
        return addCorsHeaders(errorResponse);
      }

      const dietitianId = auth.user!.id;

      // Tanita'dan yeni client oluştur
      const { client, tanitaUser } =
        await TanitaMappingService.createClientFromTanita(
          tanitaMemberId,
          dietitianId
        );

      // Ölçümleri aktar (eğer istenirse)
      let progressSyncResult: { created: number; skipped: number; errors: string[] } | null = null;
      if (syncMeasurements && client.userId) {
        progressSyncResult =
          await TanitaProgressService.syncMeasurementsToProgress(
            client.id,
            client.userId
          );
      }

      const response = NextResponse.json({
        success: true,
        client: {
          id: client.id,
          name: client.name,
          surname: client.surname,
          phoneNumber: client.phoneNumber,
          birthdate: client.birthdate,
          gender: client.gender,
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
      console.error("Error creating client from Tanita:", error);
      const response = NextResponse.json(
        {
          error: error.message || "Client oluşturma başarısız",
        },
        { status: 500 }
      );
      return addCorsHeaders(response);
    }
  }
);


import { NextRequest, NextResponse } from "next/server";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import { TanitaMappingService } from "@/services/TanitaMappingService";

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

      const client = await TanitaMappingService.unmapClientFromTanita(
        clientId,
        dietitianId
      );

      const response = NextResponse.json({
        success: true,
        client: {
          id: client.id,
          name: client.name,
          surname: client.surname,
          tanitaMemberId: client.tanitaMemberId,
        },
      });

      return addCorsHeaders(response);
    } catch (error: any) {
      console.error("Error unmapping client from Tanita:", error);
      const response = NextResponse.json(
        {
          error: error.message || "Eşleşme kaldırma başarısız",
        },
        { status: 500 }
      );
      return addCorsHeaders(response);
    }
  }
);


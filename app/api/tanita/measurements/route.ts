import { NextRequest, NextResponse } from "next/server";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export const GET = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const clientId = searchParams.get("clientId");

      if (!clientId) {
        const errorResponse = NextResponse.json(
          { error: "clientId gerekli" },
          { status: 400 }
        );
        return addCorsHeaders(errorResponse) as Response;
      }

      const dietitianId = auth.user!.id;

      // Client'ı kontrol et
      const client = await prisma.client.findUnique({
        where: { id: parseInt(clientId) },
      });

      if (!client) {
        const errorResponse = NextResponse.json(
          { error: "Client bulunamadı" },
          { status: 404 }
        );
        return addCorsHeaders(errorResponse) as Response;
      }

      // Dietitian kontrolü
      if (client.dietitianId !== dietitianId) {
        const errorResponse = NextResponse.json(
          { error: "Bu danışan size ait değil" },
          { status: 403 }
        );
        return addCorsHeaders(errorResponse) as Response;
      }

      // Tanita ile eşleştirilmiş mi kontrol et
      if (!client.tanitaMemberId) {
        const emptyResponse = NextResponse.json({
          success: true,
          measurements: [],
        });
        return addCorsHeaders(emptyResponse) as Response;
      }

      // Tanita ölçümlerini getir
      const tanitaMeasurements = await prisma.tanitaMeasurement.findMany({
        where: {
          tanitaMemberId: client.tanitaMemberId,
        },
        orderBy: {
          measureDate: "asc",
        },
      });

      const response = NextResponse.json({
        success: true,
        measurements: tanitaMeasurements.map((m) => ({
          id: m.id,
          measureDate: m.measureDate.toISOString(),
          weight: m.weight,
          fatRate: m.fatRate,
          fatMass: m.fatMass,
          muscleMass: m.muscleMass,
          boneMass: m.boneMass,
          totalBodyWater: m.totalBodyWater,
          bodyWaterRate: m.bodyWaterRate,
          bmi: m.bmi,
          visceralFatRate: m.visceralFatRate,
          basalMetabolism: m.basalMetabolism,
          bmr: m.bmr,
        })),
      });

      return addCorsHeaders(response);
    } catch (error: any) {
      console.error("Error fetching Tanita measurements:", error);
      const response = NextResponse.json(
        {
          error: error.message || "Tanita ölçümleri getirilemedi",
        },
        { status: 500 }
      );
      return addCorsHeaders(response) as Response;
    }
  }
);


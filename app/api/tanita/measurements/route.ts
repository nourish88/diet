import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const clientIdParam = searchParams.get("clientId");

    let client: {
      id: number;
      userId: number | null;
      dietitianId: number | null;
      tanitaMemberId: number | null;
    } | null = null;

    if (auth.user.role === "dietitian") {
      if (!clientIdParam) {
        return addCorsHeaders(
          NextResponse.json({ error: "clientId gerekli" }, { status: 400 })
        );
      }

      const parsedClientId = parseInt(clientIdParam, 10);
      if (!Number.isInteger(parsedClientId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Geçersiz clientId" }, { status: 400 })
        );
      }

      client = await prisma.client.findUnique({
        where: { id: parsedClientId },
        select: {
          id: true,
          userId: true,
          dietitianId: true,
          tanitaMemberId: true,
        },
      });

      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client bulunamadı" }, { status: 404 })
        );
      }

      if (client.dietitianId !== auth.user.id) {
        return addCorsHeaders(
          NextResponse.json({ error: "Bu danışan size ait değil" }, { status: 403 })
        );
      }
    } else if (auth.user.role === "client") {
      client = await prisma.client.findUnique({
        where: { userId: auth.user.id },
        select: {
          id: true,
          userId: true,
          dietitianId: true,
          tanitaMemberId: true,
        },
      });

      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client bulunamadı" }, { status: 404 })
        );
      }
    } else {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid role" }, { status: 403 })
      );
    }

    if (!client?.tanitaMemberId) {
      return addCorsHeaders(
        NextResponse.json({
          success: true,
          measurements: [],
        })
      );
    }

    const tanitaMeasurements = await prisma.tanitaMeasurement.findMany({
      where: {
        tanitaMemberId: client.tanitaMemberId,
      },
      orderBy: {
        measureDate: "asc",
      },
    });

    return addCorsHeaders(
      NextResponse.json({
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
      })
    );
  } catch (error: any) {
    console.error("Error fetching Tanita measurements:", error);
    return addCorsHeaders(
      NextResponse.json(
        {
          error: error.message || "Tanita ölçümleri getirilemedi",
        },
        { status: 500 }
      )
    );
  }
};

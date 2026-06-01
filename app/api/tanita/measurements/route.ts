import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

type TanitaClient = {
  id: number;
  userId: number | null;
  dietitianId: number | null;
  tanitaMemberId: number | null;
};

export const GET = route({
  auth: "any",
  scope: "tanita.measurements",
  handler: async ({ request, auth, log }) => {
    try {
      const user = auth.user!;
      const clientIdParam = request.nextUrl.searchParams.get("clientId");
      let client: TanitaClient | null = null;

      if (user.role === "dietitian") {
        if (!clientIdParam) {
          return addCorsHeaders(
            NextResponse.json({ error: "clientId gerekli" }, { status: 400 }),
          );
        }
        const parsedClientId = parseInt(clientIdParam, 10);
        if (!Number.isInteger(parsedClientId)) {
          return addCorsHeaders(
            NextResponse.json({ error: "Geçersiz clientId" }, { status: 400 }),
          );
        }
        client = await prisma.client.findUnique({
          where: { id: parsedClientId },
          select: { id: true, userId: true, dietitianId: true, tanitaMemberId: true },
        });
        if (!client) {
          return addCorsHeaders(
            NextResponse.json({ error: "Client bulunamadı" }, { status: 404 }),
          );
        }
        if (client.dietitianId !== user.id) {
          return addCorsHeaders(
            NextResponse.json({ error: "Bu danışan size ait değil" }, { status: 403 }),
          );
        }
      } else if (user.role === "client") {
        client = await prisma.client.findUnique({
          where: { userId: user.id },
          select: { id: true, userId: true, dietitianId: true, tanitaMemberId: true },
        });
        if (!client) {
          return addCorsHeaders(
            NextResponse.json({ error: "Client bulunamadı" }, { status: 404 }),
          );
        }
      } else {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid role" }, { status: 403 }),
        );
      }

      if (!client?.tanitaMemberId) {
        return addCorsHeaders(
          NextResponse.json({ success: true, measurements: [] }),
        );
      }

      const tanitaMeasurements = await prisma.tanitaMeasurement.findMany({
        where: { tanitaMemberId: client.tanitaMemberId },
        orderBy: { measureDate: "asc" },
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
        }),
      );
    } catch (err) {
      log.error("measurements failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Tanita ölçümleri getirilemedi" },
          { status: 500 },
        ),
      );
    }
  },
});

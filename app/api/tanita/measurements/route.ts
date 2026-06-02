import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

type TanitaClient = {
  id: number;
  userId: number | null;
  dietitianId: number | null;
  tanitaMemberId: number | null;
};

export const GET = route({
  cors: true,
  auth: "any",
  scope: "tanita.measurements",
  handler: async ({ request, auth }) => {
    const user = auth.user!;
    const clientIdParam = request.nextUrl.searchParams.get("clientId");
    let client: TanitaClient | null = null;

    if (user.role === "dietitian") {
      if (!clientIdParam) {
        throw new HttpError("bad_request", "clientId gerekli");
      }
      const parsedClientId = parseInt(clientIdParam, 10);
      if (!Number.isInteger(parsedClientId)) {
        throw new HttpError("bad_request", "Geçersiz clientId");
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
      if (!client) throw new HttpError("not_found", "Client bulunamadı");
      if (client.dietitianId !== user.id) {
        throw new HttpError("forbidden", "Bu danışan size ait değil");
      }
    } else {
      client = await prisma.client.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          userId: true,
          dietitianId: true,
          tanitaMemberId: true,
        },
      });
      if (!client) throw new HttpError("not_found", "Client bulunamadı");
    }

    if (!client?.tanitaMemberId) {
      return { success: true, measurements: [] };
    }

    const tanitaMeasurements = await prisma.tanitaMeasurement.findMany({
      where: { tanitaMemberId: client.tanitaMemberId },
      orderBy: { measureDate: "asc" },
    });

    return {
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
    };
  },
});

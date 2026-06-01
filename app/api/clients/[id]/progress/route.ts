import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

export const POST = requireDietitian(
  async (
    request: NextRequest,
    auth: AuthResult,
    context: any
  ) => {
    try {
      const clientId = parseInt(context.params.id);
      if (isNaN(clientId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Geçersiz danışan ID" }, { status: 400 })
        );
      }

      const client = await prisma.client.findFirst({
        where: { id: clientId, dietitianId: auth.user!.id },
        select: { id: true, userId: true },
      });

      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Danışan bulunamadı" }, { status: 404 })
        );
      }

      const body = await request.json();
      const { date, weight, bodyFat, waist, hip } = body;

      if (!weight && !bodyFat) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "En az bir ölçüm değeri gerekli (kilo veya yağ oranı)" },
            { status: 400 }
          )
        );
      }

      const entry = await prisma.progressEntry.create({
        data: {
          clientId: client.id,
          userId: client.userId ?? auth.user!.id,
          date: date ? new Date(date) : new Date(),
          weight: weight != null ? parseFloat(weight) : null,
          bodyFat: bodyFat != null ? parseFloat(bodyFat) : null,
          waist: waist != null ? parseFloat(waist) : null,
          hip: hip != null ? parseFloat(hip) : null,
        },
      });

      return addCorsHeaders(NextResponse.json(entry, { status: 201 }));
    } catch (error) {
      console.error("Error creating progress entry:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Ölçüm kaydedilemedi" },
          { status: 500 }
        )
      );
    }
  }
);

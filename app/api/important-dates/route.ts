import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

export const GET = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const importantDates = await prisma.importantDate.findMany({
        where: {
          dietitianId: auth.user!.id, // SECURITY: Only show own important dates
        },
        orderBy: {
          startDate: "asc",
        },
      });

      return addCorsHeaders(NextResponse.json(importantDates));
    } catch (error) {
      console.error("Error fetching important dates:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Önemli tarihler yüklenirken bir hata oluştu" },
          { status: 500 }
        )
      );
    }
  }
);

export const POST = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    try {
      const body = await request.json();
      const { name, message, startDate, endDate } = body;

      if (!name || !message || !startDate || !endDate) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Tüm alanlar zorunludur" },
            { status: 400 }
          )
        );
      }

      const importantDate = await prisma.importantDate.create({
        data: {
          name: name.trim(),
          message: message.trim(),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          dietitianId: auth.user!.id, // SECURITY: Assign to authenticated dietitian
        },
      });

      return addCorsHeaders(NextResponse.json(importantDate, { status: 201 }));
    } catch (error) {
      console.error("Error creating important date:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Önemli tarih oluşturulurken bir hata oluştu" },
          { status: 500 }
        )
      );
    }
  }
);

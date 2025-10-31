import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);

    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const dietitianId = auth.user.id;

    // Get total clients count for this dietitian
    const totalClients = await prisma.client.count({
      where: {
        dietitianId: dietitianId,
      },
    });

    // Get total diets count for this dietitian
    const totalDiets = await prisma.diet.count({
      where: {
        dietitianId: dietitianId,
      },
    });

    // Get diets this month for this dietitian
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const thisMonthDiets = await prisma.diet.count({
      where: {
        dietitianId: dietitianId,
        createdAt: {
          gte: thisMonthStart,
        },
      },
    });

    // Pending approvals - this could be clients waiting for approval, etc.
    // For now, let's just return 0 or implement if you have a pending system
    const pendingApprovals = 0;

    return addCorsHeaders(
      NextResponse.json({
        totalClients,
        totalDiets,
        thisMonthDiets,
        pendingApprovals,
      })
    );
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "İstatistikler yüklenirken bir hata oluştu" },
        { status: 500 }
      )
    );
  }
}

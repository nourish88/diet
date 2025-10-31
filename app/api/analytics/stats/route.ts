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

    // Get last month's diets for comparison
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    lastMonthStart.setHours(0, 0, 0, 0);
    const lastMonthEnd = new Date(thisMonthStart);
    lastMonthEnd.setTime(lastMonthEnd.getTime() - 1);

    const lastMonthDiets = await prisma.diet.count({
      where: {
        dietitianId: dietitianId,
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    });

    // Get top used besins (top 10)
    const topBesins = await prisma.$queryRaw<any[]>`
      SELECT 
        b.id,
        b.name,
        bg.name as "groupName",
        COUNT(mi.id) as "usageCount"
      FROM "Besin" b
      LEFT JOIN "BesinGroup" bg ON b."groupId" = bg.id
      INNER JOIN "MenuItem" mi ON mi."besinId" = b.id
      INNER JOIN "Ogun" o ON mi."ogunId" = o.id
      INNER JOIN "Diet" d ON o."dietId" = d.id
      WHERE d."dietitianId" = ${dietitianId}
      GROUP BY b.id, b.name, bg.name
      ORDER BY "usageCount" DESC
      LIMIT 10
    `;

    // Get pending approvals count
    const pendingApprovals = await prisma.user.count({
      where: {
        role: "client",
        isApproved: false,
      },
    });

    // Format response to match mobile and web expectations
    return addCorsHeaders(
      NextResponse.json({
        // Mobile dashboard format (flat structure)
        totalClients,
        totalDiets,
        thisMonthDiets,
        pendingApprovals,
        
        // Web analytics page format (nested structure for backward compatibility)
        topBesins: topBesins.map((b) => ({
          id: b.id,
          name: b.name,
          groupName: b.groupName,
          usageCount: Number(b.usageCount),
        })),
        totals: {
          totalDiets: totalDiets,
          dietsThisMonth: thisMonthDiets,
          dietsLastMonth: lastMonthDiets,
        },
        efficiency: {
          avgTimeThisMonth: 0, // Placeholder
          avgTimeLastMonth: 0, // Placeholder
          improvement: 0, // Placeholder
        },
      })
    );
  } catch (error) {
    console.error("Error fetching analytics stats:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "İstatistikler yüklenirken bir hata oluştu" },
        { status: 500 }
      )
    );
  }
}

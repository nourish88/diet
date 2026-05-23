import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const dietitianId = auth.user.id;

    // Dates for this month and last month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Promises for concurrent execution
    const [
      totalClients,
      totalDiets,
      thisMonthDiets,
      lastMonthDiets,
      newClientsThisMonth,
      newClientsLastMonth,
      pendingApprovals,
      kvkkConsentsThisMonth,
    ] = await Promise.all([
      prisma.client.count({ where: { dietitianId } }),
      prisma.diet.count({ where: { dietitianId } }),
      prisma.diet.count({ where: { dietitianId, createdAt: { gte: thisMonthStart } } }),
      prisma.diet.count({ where: { dietitianId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.client.count({ where: { dietitianId, createdAt: { gte: thisMonthStart } } }),
      prisma.client.count({ where: { dietitianId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.user.count({ where: { role: "client", isApproved: false } }),
      prisma.client.count({ where: { dietitianId, kvkkPortalConsentAt: { gte: thisMonthStart } } }),
    ]);

    // Top besins (raw query)
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

    // Monthly data for the last 6 months
    const monthlyData: { month: string; diets: number; clients: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const monthName = monthStart.toLocaleString('tr-TR', { month: 'short' });
      
      const [dietsCount, clientsCount] = await Promise.all([
        prisma.diet.count({ where: { dietitianId, createdAt: { gte: monthStart, lte: monthEnd } } }),
        prisma.client.count({ where: { dietitianId, createdAt: { gte: monthStart, lte: monthEnd } } }),
      ]);
      
      monthlyData.push({
        month: monthName,
        diets: dietsCount,
        clients: clientsCount,
      });
    }

    return addCorsHeaders(
      NextResponse.json({
        totalClients,
        totalDiets,
        thisMonthDiets,
        pendingApprovals,
        newClientsThisMonth,
        newClientsLastMonth,
        kvkkConsentsThisMonth,
        monthlyData,
        
        topBesins: topBesins.map((b) => ({
          id: b.id,
          name: b.name,
          groupName: b.groupName,
          usageCount: Number(b.usageCount),
        })),
        totals: {
          totalDiets,
          dietsThisMonth: thisMonthDiets,
          dietsLastMonth: lastMonthDiets,
        },
        efficiency: {
          avgTimeThisMonth: 0, 
          avgTimeLastMonth: 0,
          improvement: 0, 
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

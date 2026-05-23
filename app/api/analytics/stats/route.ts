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

    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get("timeRange") || "current_month";
    const chartView = searchParams.get("chartView") || "monthly";

    const now = new Date();
    let periodStart: Date;
    let periodEnd = now;
    let prevPeriodStart: Date;
    let prevPeriodEnd: Date;

    if (timeRange === "24h") {
      periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      prevPeriodStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      prevPeriodEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (timeRange === "7d") {
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      prevPeriodEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "30d") {
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      prevPeriodEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // current_month
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    // Promises for concurrent execution
    const [
      totalClients,
      totalDiets,
      periodDietsCount,
      prevPeriodDietsCount,
      newClientsPeriodCount,
      newClientsPrevPeriodCount,
      pendingApprovals,
      kvkkConsentsPeriodCount,
    ] = await Promise.all([
      prisma.client.count({ where: { dietitianId } }),
      prisma.diet.count({ where: { dietitianId } }),
      prisma.diet.count({ where: { dietitianId, createdAt: { gte: periodStart, lte: periodEnd } } }),
      prisma.diet.count({ where: { dietitianId, createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd } } }),
      prisma.client.count({ where: { dietitianId, createdAt: { gte: periodStart, lte: periodEnd } } }),
      prisma.client.count({ where: { dietitianId, createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd } } }),
      prisma.user.count({ where: { role: "client", isApproved: false } }),
      prisma.client.count({ where: { dietitianId, kvkkPortalConsentAt: { gte: periodStart, lte: periodEnd } } }),
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
      WHERE d."dietitianId" = ${dietitianId} AND d."createdAt" >= ${periodStart}
      GROUP BY b.id, b.name, bg.name
      ORDER BY "usageCount" DESC
      LIMIT 10
    `;

    // Chart data based on chartView
    const chartData: { period: string; diets: number; clients: number }[] = [];
    
    if (chartView === "weekly") {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7));
        const weekStart = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);
        
        const weekName = `${weekStart.getDate()} ${weekStart.toLocaleString('tr-TR', { month: 'short' })}`;
        
        const [dietsCount, clientsCount] = await Promise.all([
          prisma.diet.count({ where: { dietitianId, createdAt: { gte: weekStart, lte: weekEnd } } }),
          prisma.client.count({ where: { dietitianId, createdAt: { gte: weekStart, lte: weekEnd } } }),
        ]);
        
        chartData.push({
          period: weekName,
          diets: dietsCount,
          clients: clientsCount,
        });
      }
    } else {
      // Monthly data for the last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        
        const monthName = monthStart.toLocaleString('tr-TR', { month: 'short' });
        
        const [dietsCount, clientsCount] = await Promise.all([
          prisma.diet.count({ where: { dietitianId, createdAt: { gte: monthStart, lte: monthEnd } } }),
          prisma.client.count({ where: { dietitianId, createdAt: { gte: monthStart, lte: monthEnd } } }),
        ]);
        
        chartData.push({
          period: monthName,
          diets: dietsCount,
          clients: clientsCount,
        });
      }
    }

    return addCorsHeaders(
      NextResponse.json({
        totalClients,
        totalDiets,
        thisMonthDiets: periodDietsCount, // keep existing names for backward compatibility if needed, but we'll update frontend
        periodDiets: periodDietsCount,
        pendingApprovals,
        newClientsThisMonth: newClientsPeriodCount,
        newClientsPeriod: newClientsPeriodCount,
        newClientsLastMonth: newClientsPrevPeriodCount,
        newClientsPrevPeriod: newClientsPrevPeriodCount,
        kvkkConsentsThisMonth: kvkkConsentsPeriodCount,
        kvkkConsentsPeriod: kvkkConsentsPeriodCount,
        monthlyData: chartData, // keep for backward compatibility, mapped to chartData
        chartData,
        
        topBesins: topBesins.map((b) => ({
          id: b.id,
          name: b.name,
          groupName: b.groupName,
          usageCount: Number(b.usageCount),
        })),
        totals: {
          totalDiets,
          dietsThisMonth: periodDietsCount,
          dietsLastMonth: prevPeriodDietsCount,
          dietsPeriod: periodDietsCount,
          dietsPrevPeriod: prevPeriodDietsCount,
        },
        efficiency: {
          avgTimeThisMonth: 0, 
          avgTimeLastMonth: 0,
          improvement: 0, 
        },
      }, {
        headers: {
          'Cache-Control': 'private, max-age=60, s-maxage=60, stale-while-revalidate=120'
        }
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

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get top used besins
    const topBesins = await prisma.besinUsageStats.findMany({
      take: 20,
      orderBy: [{ usageCount: "desc" }, { lastUsed: "desc" }],
      include: {
        besin: {
          include: {
            besinGroup: true,
          },
        },
      },
    });

    // Get total diets count
    const totalDiets = await prisma.diet.count();

    // Get diets this month
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const dietsThisMonth = await prisma.diet.count({
      where: {
        createdAt: {
          gte: thisMonthStart,
        },
      },
    });

    // Get diets last month
    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(thisMonthStart);
    lastMonthEnd.setMilliseconds(-1);

    const dietsLastMonth = await prisma.diet.count({
      where: {
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    });

    // Calculate efficiency
    const avgThisMonth = dietsThisMonth > 0 ? 8 : 15; // Simulated for now
    const avgLastMonth = 15; // Simulated
    const improvement =
      avgLastMonth > 0
        ? Math.round(((avgLastMonth - avgThisMonth) / avgLastMonth) * 100)
        : 0;

    return NextResponse.json({
      topBesins: topBesins.map((stat) => ({
        id: stat.besin.id,
        name: stat.besin.name,
        usageCount: stat.usageCount,
        avgMiktar: stat.avgMiktar,
        commonBirim: stat.commonBirim,
        lastUsed: stat.lastUsed,
        groupName: stat.besin.besinGroup?.name || "Diğer",
      })),
      totals: {
        totalDiets,
        dietsThisMonth,
        dietsLastMonth,
      },
      efficiency: {
        avgTimeThisMonth: avgThisMonth,
        avgTimeLastMonth: avgLastMonth,
        improvement,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "İstatistikler yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

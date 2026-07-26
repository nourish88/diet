import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { cacheTags } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * The dashboard polls this endpoint and it fans out to ~25-30 aggregate queries.
 * The underlying counts change slowly, so we cache the computed payload per
 * (dietitian, timeRange, chartView) for a few minutes. Diet mutations call
 * `invalidate.analyticsStats(dietitianId)` to refresh it immediately when needed.
 */
const STATS_TTL_SECONDS = 180;

async function computeStats(
  dietitianId: number,
  timeRange: string,
  chartView: string,
) {
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
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevPeriodEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );
    }

    const [
      totalClients,
      totalDiets,
      periodDietsCount,
      prevPeriodDietsCount,
      newClientsPeriodCount,
      newClientsPrevPeriodCount,
      pendingApprovals,
      kvkkConsentsPeriodCount,
      totalDietClientsRows,
      periodDietClientsRows,
    ] = await Promise.all([
      prisma.client.count({ where: { dietitianId } }),
      prisma.diet.count({ where: { dietitianId } }),
      prisma.diet.count({
        where: { dietitianId, createdAt: { gte: periodStart, lte: periodEnd } },
      }),
      prisma.diet.count({
        where: {
          dietitianId,
          createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
        },
      }),
      prisma.client.count({
        where: { dietitianId, createdAt: { gte: periodStart, lte: periodEnd } },
      }),
      prisma.client.count({
        where: {
          dietitianId,
          createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
        },
      }),
      prisma.user.count({ where: { role: "client", isApproved: false } }),
      prisma.client.count({
        where: {
          dietitianId,
          kvkkPortalConsentAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      prisma.diet.findMany({
        where: { dietitianId },
        select: { clientId: true },
        distinct: ["clientId"],
      }),
      prisma.diet.findMany({
        where: { dietitianId, createdAt: { gte: periodStart, lte: periodEnd } },
        select: { clientId: true },
        distinct: ["clientId"],
      }),
    ]);

    const totalDietClients = totalDietClientsRows.length;
    const periodDietClients = periodDietClientsRows.length;

    const topBesins = await prisma.$queryRaw<
      Array<{ id: number; name: string; groupName: string | null; usageCount: bigint }>
    >`
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

    const topBesinsExtended = await prisma.besinUsageStats.findMany({
      where: {
        besin: {
          menuItems: { some: { ogun: { diet: { dietitianId } } } },
        },
      },
      select: {
        usageCount: true,
        avgMiktar: true,
        commonBirim: true,
        lastUsed: true,
        besin: {
          select: {
            id: true,
            name: true,
            besinGroup: { select: { name: true } },
          },
        },
      },
      orderBy: [{ usageCount: "desc" }, { lastUsed: "desc" }],
      take: 20,
    });

    const unusedBesins = await prisma.besin.findMany({
      where: { usageStats: null },
      select: {
        id: true,
        name: true,
        besinGroup: { select: { name: true } },
      },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
      take: 30,
    });

    // Build the list of chart periods first, then run every count concurrently
    // (previously each period was awaited in sequence -> 12-16 serial queries).
    const chartPeriods: { period: string; start: Date; end: Date }[] = [];

    if (chartView === "weekly") {
      for (let i = 7; i >= 0; i--) {
        const weekEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i * 7,
        );
        const weekStart = new Date(
          weekEnd.getFullYear(),
          weekEnd.getMonth(),
          weekEnd.getDate() - 6,
        );
        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        const weekName = `${weekStart.getDate()} ${weekStart.toLocaleString("tr-TR", { month: "short" })}`;
        chartPeriods.push({ period: weekName, start: weekStart, end: weekEnd });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(
          now.getFullYear(),
          now.getMonth() - i + 1,
          0,
          23,
          59,
          59,
          999,
        );
        const monthName = monthStart.toLocaleString("tr-TR", { month: "short" });
        chartPeriods.push({ period: monthName, start: monthStart, end: monthEnd });
      }
    }

    const chartData = await Promise.all(
      chartPeriods.map(async ({ period, start, end }) => {
        const [dietsCount, clientsCount] = await Promise.all([
          prisma.diet.count({
            where: { dietitianId, createdAt: { gte: start, lte: end } },
          }),
          prisma.client.count({
            where: { dietitianId, createdAt: { gte: start, lte: end } },
          }),
        ]);
        return { period, diets: dietsCount, clients: clientsCount };
      }),
    );

    const payload = {
      totalClients,
      totalDiets,
      thisMonthDiets: periodDietsCount,
      periodDiets: periodDietsCount,
      totalDietClients,
      periodDietClients,
      pendingApprovals,
      newClientsThisMonth: newClientsPeriodCount,
      newClientsPeriod: newClientsPeriodCount,
      newClientsLastMonth: newClientsPrevPeriodCount,
      newClientsPrevPeriod: newClientsPrevPeriodCount,
      kvkkConsentsThisMonth: kvkkConsentsPeriodCount,
      kvkkConsentsPeriod: kvkkConsentsPeriodCount,
      monthlyData: chartData,
      chartData,
      topBesins: topBesins.map((b) => ({
        id: b.id,
        name: b.name,
        groupName: b.groupName,
        usageCount: Number(b.usageCount),
      })),
      topBesinsExtended: topBesinsExtended.map((s) => ({
        id: s.besin.id,
        name: s.besin.name,
        groupName: s.besin.besinGroup?.name ?? null,
        usageCount: s.usageCount,
        avgMiktar: s.avgMiktar,
        commonBirim: s.commonBirim,
        lastUsed: s.lastUsed,
      })),
      unusedBesins: unusedBesins.map((b) => ({
        id: b.id,
        name: b.name,
        groupName: b.besinGroup?.name ?? null,
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
    };

    return payload;
}

/** Cached per (dietitian, timeRange, chartView); revalidated on diet mutations. */
function getCachedStats(
  dietitianId: number,
  timeRange: string,
  chartView: string,
) {
  return unstable_cache(
    () => computeStats(dietitianId, timeRange, chartView),
    ["analytics-stats", String(dietitianId), timeRange, chartView],
    {
      revalidate: STATS_TTL_SECONDS,
      tags: [cacheTags.analyticsStatsAll, cacheTags.analyticsStats(dietitianId)],
    },
  )();
}

export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "analytics.stats",
  handler: async ({ request, auth }) => {
    const dietitianId = auth.user!.id;
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get("timeRange") || "current_month";
    const chartView = searchParams.get("chartView") || "monthly";

    const payload = await getCachedStats(dietitianId, timeRange, chartView);

    return ok(payload, {
      headers: {
        "Cache-Control":
          "private, max-age=60, s-maxage=60, stale-while-revalidate=120",
      },
    });
  },
});

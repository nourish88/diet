import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

type BesinWithStats = Prisma.BesinGetPayload<{
  include: { usageStats: true; besinGroup: true };
}>;

export const GET = route({
  auth: "dietitian",
  scope: "suggestions.besin",
  handler: async ({ request, log }) => {
    try {
      const query = request.nextUrl.searchParams.get("q") ?? "";
      const clientIdRaw = request.nextUrl.searchParams.get("clientId");
      const clientId = clientIdRaw ? parseInt(clientIdRaw, 10) : null;

      if (query.length < 2) {
        return NextResponse.json({ suggestions: [] });
      }

      let bannedBesinIds: number[] = [];
      if (clientId && !Number.isNaN(clientId)) {
        const banned = await prisma.bannedFood.findMany({
          where: { clientId },
          select: { besinId: true },
        });
        bannedBesinIds = banned.map((b) => b.besinId);
      }

      const besins = await prisma.besin.findMany({
        where: {
          name: { contains: query, mode: "insensitive" },
          ...(bannedBesinIds.length > 0 ? { id: { notIn: bannedBesinIds } } : {}),
        },
        include: { usageStats: true, besinGroup: true },
        take: 10,
      });

      const suggestions = besins
        .map((besin) => {
          const usageCount = besin.usageStats?.usageCount ?? 0;
          const miktar = normalizeMiktar(roundMiktar(besin.usageStats?.avgMiktar));
          return {
            id: besin.id,
            name: besin.name,
            miktar,
            birim: besin.usageStats?.commonBirim ?? "",
            usageCount,
            isFrequent: usageCount > 5,
            groupName: besin.besinGroup?.name ?? "",
            lastUsed: besin.usageStats?.lastUsed ?? null,
            score: calculateScore(besin, usageCount),
            priority: besin.priority ?? null,
          };
        })
        .sort((a, b) => b.score - a.score);

      return NextResponse.json({ suggestions });
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Öneriler yüklenirken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

function roundMiktar(value: string | number | null | undefined): number {
  if (!value) return 1;
  const str = String(value).trim();
  if (str === "") return 1;
  const num = parseFloat(str);
  if (Number.isNaN(num)) return 1;
  const dec = num % 1;
  if (Math.abs(dec - 0.5) < 0.0001) return num;
  return dec < 0.5 ? Math.floor(num) : Math.ceil(num);
}

function normalizeMiktar(value: string | number | null | undefined): string {
  if (!value) return "1";
  const str = String(value).trim();
  if (str === "") return "1";
  if (/^\d+\.0+$/.test(str)) return str.split(".")[0];
  return str;
}

function calculateScore(besin: BesinWithStats, usageCount: number): number {
  let score = usageCount * 10;
  if (besin.usageStats?.lastUsed) {
    const days = Math.floor(
      (Date.now() - new Date(besin.usageStats.lastUsed).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (days < 7) score += 20;
    else if (days < 30) score += 10;
  }
  score += besin.priority ?? 0;
  return score;
}

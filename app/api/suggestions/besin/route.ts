import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Use nextUrl.searchParams instead of request.url for better compatibility
    const query = request.nextUrl.searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Search besins with usage stats
    const besins = await prisma.besin.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        usageStats: true,
        besinGroup: true,
      },
      take: 10,
    });

    // Transform and score results
    const suggestions = besins.map((besin) => {
      const usageCount = besin.usageStats?.usageCount || 0;
      const isFrequent = usageCount > 5; // Frequently used threshold

      return {
        id: besin.id,
        name: besin.name,
        miktar: "1", // Always return "1" for miktar in suggestions
        birim: besin.usageStats?.commonBirim || "",
        usageCount,
        isFrequent,
        groupName: besin.besinGroup?.name || "",
        lastUsed: besin.usageStats?.lastUsed || null,
        score: calculateScore(besin, usageCount),
        priority: besin.priority ?? null,
      };
    });

    // Sort by score (frequent first, then alphabetical)
    suggestions.sort((a, b) => b.score - a.score);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error fetching besin suggestions:", error);
    return NextResponse.json(
      { error: "Öneriler yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Scoring algorithm
function calculateScore(besin: any, usageCount: number): number {
  let score = 0;

  // Usage frequency (most important)
  score += usageCount * 10;

  // Recently used bonus
  if (besin.usageStats?.lastUsed) {
    const daysSinceLastUse = Math.floor(
      (Date.now() - new Date(besin.usageStats.lastUsed).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastUse < 7) {
      score += 20; // Used in last week
    } else if (daysSinceLastUse < 30) {
      score += 10; // Used in last month
    }
  }

  // Priority bonus
  score += besin.priority || 0;

  return score;
}

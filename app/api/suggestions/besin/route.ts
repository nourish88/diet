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

    // Helper function to round miktar intelligently:
    // - If decimal part is exactly 0.5, keep it as "0.5" (don't round)
    // - If decimal part < 0.5, round down (floor)
    // - If decimal part > 0.5, round up (ceil)
    const roundMiktar = (miktar: string | number | null | undefined): number => {
      if (!miktar) return 1;
      
      const miktarStr = String(miktar).trim();
      if (miktarStr === "") return 1;
      
      const numValue = parseFloat(miktarStr);
      if (isNaN(numValue)) return 1;
      
      const decimalPart = numValue % 1;
      
      // If decimal part is exactly 0.5, keep it (don't round)
      if (Math.abs(decimalPart - 0.5) < 0.0001) {
        return numValue;
      }
      
      // If decimal part < 0.5, round down
      if (decimalPart < 0.5) {
        return Math.floor(numValue);
      }
      
      // If decimal part > 0.5, round up
      return Math.ceil(numValue);
    };

    // Helper function to normalize miktar: convert "1.0", "2.0" to "1", "2", but preserve "0.5", "1.5"
    const normalizeMiktar = (miktar: string | number | null | undefined): string => {
      if (!miktar) return "1";
      
      const miktarStr = String(miktar).trim();
      if (miktarStr === "") return "1";
      
      // Check if it's an integer-like decimal (e.g., "1.0", "2.00", "10.000")
      if (/^\d+\.0+$/.test(miktarStr)) {
        return miktarStr.split('.')[0];
      }
      
      // Preserve real decimals (0.5, 1.5, 2.3, etc.)
      return miktarStr;
    };

    // Transform and score results
    const suggestions = besins.map((besin) => {
      const usageCount = besin.usageStats?.usageCount || 0;
      const isFrequent = usageCount > 5; // Frequently used threshold
      
      // Get miktar from usage stats, round intelligently, then normalize
      const avgMiktar = besin.usageStats?.avgMiktar;
      const roundedMiktar = roundMiktar(avgMiktar);
      const miktar = normalizeMiktar(roundedMiktar);

      return {
        id: besin.id,
        name: besin.name,
        miktar: miktar,
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

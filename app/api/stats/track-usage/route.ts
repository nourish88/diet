import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface UsageItem {
  besinId: number;
  miktar: string;
  birim: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as { items: UsageItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı" },
        { status: 400 }
      );
    }

    // Process each item
    const updatePromises = items.map(async (item) => {
      if (!item.besinId) return null;

      // Check if stats exist
      const existingStats = await prisma.besinUsageStats.findUnique({
        where: { besinId: item.besinId },
      });

      if (existingStats) {
        // Update existing stats
        return prisma.besinUsageStats.update({
          where: { besinId: item.besinId },
          data: {
            usageCount: { increment: 1 },
            avgMiktar: calculateAvgMiktar(
              existingStats.avgMiktar,
              item.miktar,
              existingStats.usageCount
            ),
            commonBirim: getMostCommonBirim(
              existingStats.commonBirim,
              item.birim,
              existingStats.usageCount
            ),
            lastUsed: new Date(),
          },
        });
      } else {
        // Create new stats
        return prisma.besinUsageStats.create({
          data: {
            besinId: item.besinId,
            usageCount: 1,
            avgMiktar: item.miktar || null,
            commonBirim: item.birim || null,
            lastUsed: new Date(),
          },
        });
      }
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking usage:", error);
    return NextResponse.json(
      { error: "İstatistik kaydedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Helper: Calculate average miktar (simple approach)
function calculateAvgMiktar(
  currentAvg: string | null,
  newValue: string,
  count: number
): string {
  // If no value, keep current or use new
  if (!newValue) return currentAvg || "";
  if (!currentAvg) return newValue;

  // Try to parse as numbers and average
  const currentNum = parseFloat(currentAvg);
  const newNum = parseFloat(newValue);

  if (!isNaN(currentNum) && !isNaN(newNum)) {
    const avg = (currentNum * count + newNum) / (count + 1);
    return avg.toFixed(1);
  }

  // If not numeric, keep most common (current one)
  return currentAvg;
}

// Helper: Get most common birim
function getMostCommonBirim(
  currentBirim: string | null,
  newBirim: string,
  count: number
): string {
  if (!newBirim) return currentBirim || "";
  if (!currentBirim) return newBirim;

  // Simple majority rule: if used more than 3 times, stick with current
  if (count > 3) return currentBirim;

  return newBirim;
}

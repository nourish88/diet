import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

const UsageItem = z.object({
  besinId: z.coerce.number().int().positive(),
  miktar: z.string().optional().default(""),
  birim: z.string().optional().default(""),
});
const Body = z.object({
  items: z.array(UsageItem).min(1),
});

export const POST = route({
  auth: "dietitian",
  schema: Body,
  scope: "stats.track-usage",
  handler: async ({ body, log }) => {
    try {
      await Promise.all(
        body.items.map(async (item) => {
          const existing = await prisma.besinUsageStats.findUnique({
            where: { besinId: item.besinId },
          });

          if (existing) {
            return prisma.besinUsageStats.update({
              where: { besinId: item.besinId },
              data: {
                usageCount: { increment: 1 },
                avgMiktar: averageMiktar(existing.avgMiktar, item.miktar, existing.usageCount),
                commonBirim: mostCommonBirim(existing.commonBirim, item.birim, existing.usageCount),
                lastUsed: new Date(),
              },
            });
          }
          return prisma.besinUsageStats.create({
            data: {
              besinId: item.besinId,
              usageCount: 1,
              avgMiktar: item.miktar || null,
              commonBirim: item.birim || null,
              lastUsed: new Date(),
            },
          });
        }),
      );

      return NextResponse.json({ success: true });
    } catch (err) {
      log.error("track failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "İstatistik kaydedilirken bir hata oluştu" },
        { status: 500 },
      );
    }
  },
});

function averageMiktar(current: string | null, next: string, count: number): string {
  if (!next) return current ?? "";
  if (!current) return next;
  const c = parseFloat(current);
  const n = parseFloat(next);
  if (Number.isNaN(c) || Number.isNaN(n)) return current;
  return ((c * count + n) / (count + 1)).toFixed(1);
}

function mostCommonBirim(current: string | null, next: string, count: number): string {
  if (!next) return current ?? "";
  if (!current) return next;
  return count > 3 ? current : next;
}

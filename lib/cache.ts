/**
 * Centralised cache helpers.
 *
 * Each cacheable dictionary endpoint returns data via a function defined here
 * (wrapping `unstable_cache`). Tags are also defined here so mutation routes
 * can `invalidate.X(...)` without hard-coding strings.
 *
 * TTL rationale: dictionary data rarely changes; long TTLs are fine because
 * every mutation path explicitly invalidates the matching tag(s).
 */

import { unstable_cache, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";

// ---------------- Tags ----------------

export const cacheTags = {
  besinler: "besinler",
  besinGroups: "besin-gruplari",
  birims: "birims",
  definitions: "definitions",
  templates: (dietitianId: number) => `templates:${dietitianId}`,
  templatesAll: "templates",
  presets: (dietitianId: number) => `presets:${dietitianId}`,
  presetsAll: "presets",
  importantDates: (dietitianId: number) => `important-dates:${dietitianId}`,
  importantDatesAll: "important-dates",
  systemConfig: (key: string) => `sys-config:${key}`,
} as const;

// ---------------- TTLs (seconds) ----------------

const TTL = {
  besinler: 60 * 60 * 24, // 24h
  besinGroups: 60 * 60 * 24, // 24h
  birims: 60 * 60 * 24, // 24h
  definitions: 60 * 60, // 1h
  templates: 60 * 5, // 5m
  presets: 60 * 5, // 5m
  importantDates: 60 * 30, // 30m
  systemConfig: 60 * 5, // 5m
} as const;

// ---------------- Cached readers ----------------

export const getCachedBesinler = unstable_cache(
  async (q: string, page: number, pageSize: number) => {
    const where = q
      ? { name: { contains: q, mode: "insensitive" as const } }
      : {};
    const skip = (page - 1) * pageSize;
    const [items, total] = await prisma.$transaction([
      prisma.besin.findMany({
        where,
        include: { besinGroup: true },
        orderBy: [{ priority: "asc" }, { name: "asc" }, { id: "asc" }],
        skip,
        take: pageSize,
      }),
      prisma.besin.count({ where }),
    ]);
    const hasMore = skip + items.length < total;
    return {
      items,
      page,
      pageSize,
      total,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
    };
  },
  ["besinler"],
  { revalidate: TTL.besinler, tags: [cacheTags.besinler] }
);

export const getCachedBesinGroups = unstable_cache(
  async () =>
    prisma.besinGroup.findMany({
      include: { _count: { select: { besins: true } } },
      orderBy: { description: "asc" },
    }),
  ["besin-gruplari"],
  { revalidate: TTL.besinGroups, tags: [cacheTags.besinGroups] }
);

export const getCachedBirims = unstable_cache(
  async () => prisma.birim.findMany({ orderBy: { name: "asc" } }),
  ["birims"],
  { revalidate: TTL.birims, tags: [cacheTags.birims] }
);

export const getCachedDefinitions = unstable_cache(
  async (type: string | null) => {
    const where: { isActive: boolean; type?: string } = { isActive: true };
    if (type) where.type = type;
    return prisma.definition.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },
  ["definitions"],
  { revalidate: TTL.definitions, tags: [cacheTags.definitions] }
);

export function getCachedTemplates(dietitianId: number, category: string | null) {
  return unstable_cache(
    async () => {
      const where: { isActive: boolean; dietitianId: number; category?: string } = {
        isActive: true,
        dietitianId,
      };
      if (category) where.category = category;
      return prisma.dietTemplate.findMany({
        where,
        include: {
          oguns: {
            include: { items: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    },
    [`templates-${dietitianId}-${category ?? "all"}`],
    {
      revalidate: TTL.templates,
      tags: [cacheTags.templatesAll, cacheTags.templates(dietitianId)],
    }
  )();
}

export function getCachedPresets(dietitianId: number, mealType: string | null) {
  return unstable_cache(
    async () => {
      const where: { isActive: boolean; dietitianId: number; mealType?: string } = {
        isActive: true,
        dietitianId,
      };
      if (mealType) where.mealType = mealType;
      return prisma.mealPreset.findMany({
        where,
        include: { items: { orderBy: { order: "asc" } } },
        orderBy: [
          { patternScore: "desc" },
          { usageCount: "desc" },
          { createdAt: "desc" },
        ],
      });
    },
    [`presets-${dietitianId}-${mealType ?? "all"}`],
    {
      revalidate: TTL.presets,
      tags: [cacheTags.presetsAll, cacheTags.presets(dietitianId)],
    }
  )();
}

export function getCachedImportantDates(dietitianId: number) {
  return unstable_cache(
    async () =>
      prisma.importantDate.findMany({
        where: { dietitianId },
        orderBy: { startDate: "asc" },
      }),
    [`important-dates-${dietitianId}`],
    {
      revalidate: TTL.importantDates,
      tags: [
        cacheTags.importantDatesAll,
        cacheTags.importantDates(dietitianId),
      ],
    }
  )();
}

export function getCachedSystemConfig(key: string) {
  return unstable_cache(
    async () => prisma.systemConfig.findUnique({ where: { key } }),
    [`sys-config-${key}`],
    { revalidate: TTL.systemConfig, tags: [cacheTags.systemConfig(key)] }
  )();
}

// ---------------- Invalidators ----------------

const expireTagNow = (tag: string) => revalidateTag(tag, { expire: 0 });

export const invalidate = {
  besinler: () => expireTagNow(cacheTags.besinler),
  besinGroups: () => expireTagNow(cacheTags.besinGroups),
  birims: () => expireTagNow(cacheTags.birims),
  definitions: () => expireTagNow(cacheTags.definitions),
  templates: (dietitianId?: number) => {
    expireTagNow(cacheTags.templatesAll);
    if (dietitianId != null) expireTagNow(cacheTags.templates(dietitianId));
  },
  presets: (dietitianId?: number) => {
    expireTagNow(cacheTags.presetsAll);
    if (dietitianId != null) expireTagNow(cacheTags.presets(dietitianId));
  },
  importantDates: (dietitianId?: number) => {
    expireTagNow(cacheTags.importantDatesAll);
    if (dietitianId != null)
      expireTagNow(cacheTags.importantDates(dietitianId));
  },
  systemConfig: (key: string) => expireTagNow(cacheTags.systemConfig(key)),
};

/**
 * Bulk name→id resolution for Besin / Birim references used when saving diets.
 *
 * Diets/templates reference foods (besin) and units (birim) by name. Historically
 * each distinct name was resolved with its own `upsert`, i.e. 2N round-trips per
 * save (N besins + N birims). On Neon serverless every round-trip costs compute,
 * so instead we resolve each set with a fixed, small number of queries regardless
 * of how many names there are:
 *
 *   1. one `findMany ... where name IN (...)` for the ones that already exist
 *   2. one `createMany({ skipDuplicates })` for the missing ones (if any)
 *   3. one `findMany` to read back the ids of the just-created names (if any)
 *
 * `skipDuplicates` also makes this safe under concurrent saves — a name created
 * by a racing request is simply picked up by the read-back query.
 */

import prisma from "@/lib/prisma";

type NameIdRow = { id: number; name: string };

interface NameIdDelegate {
  findMany(args: {
    where: { name: { in: string[] } };
    select: { id: true; name: true };
  }): Promise<NameIdRow[]>;
  createMany(args: {
    data: { name: string }[];
    skipDuplicates: boolean;
  }): Promise<unknown>;
}

async function resolveNamesToIds(
  delegate: NameIdDelegate,
  names: Iterable<string>,
): Promise<Map<string, number>> {
  const unique = Array.from(new Set(names));
  if (unique.length === 0) return new Map();

  const existing = await delegate.findMany({
    where: { name: { in: unique } },
    select: { id: true, name: true },
  });
  const byName = new Map<string, number>(existing.map((r) => [r.name, r.id]));

  const missing = unique.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    await delegate.createMany({
      data: missing.map((name) => ({ name })),
      skipDuplicates: true,
    });
    const created = await delegate.findMany({
      where: { name: { in: missing } },
      select: { id: true, name: true },
    });
    for (const r of created) byName.set(r.name, r.id);
  }

  return byName;
}

/** Resolve a set of food names to their ids, creating any that don't exist yet. */
export const resolveBesinIds = (names: Iterable<string>) =>
  resolveNamesToIds(prisma.besin as unknown as NameIdDelegate, names);

/** Resolve a set of unit names to their ids, creating any that don't exist yet. */
export const resolveBirimIds = (names: Iterable<string>) =>
  resolveNamesToIds(prisma.birim as unknown as NameIdDelegate, names);

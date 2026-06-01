import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireOwnClient } from "@/lib/api-auth";
import { route } from "@/lib/api/handler";

type Params = { id: string };

const BannedBesinItem = z.object({
  besinId: z.coerce.number().int().positive(),
  reason: z.string().nullable().optional(),
});

const ReplaceBannedFoodsBody = z.object({
  bannedBesins: z.array(BannedBesinItem).default([]),
});

function parseClientId(raw: string) {
  const id = parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

/**
 * POST /api/clients/[id]/banned-foods
 * Replace the full banned-foods list for a client (transaction-safe).
 */
export const POST = route<typeof ReplaceBannedFoodsBody, Params>({
  auth: "dietitian",
  schema: ReplaceBannedFoodsBody,
  scope: "banned-foods.replace",
  handler: async ({ body, params, auth, log }) => {
    const clientId = parseClientId(params.id);
    if (clientId === null) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }
    if (!(await requireOwnClient(clientId, auth))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const created = await prisma.$transaction(async (tx) => {
        await tx.bannedFood.deleteMany({ where: { clientId } });
        const made: Array<
          Awaited<ReturnType<typeof tx.bannedFood.create>>
        > = [];
        for (const banned of body.bannedBesins) {
          const row = await tx.bannedFood.create({
            data: {
              clientId,
              besinId: banned.besinId,
              reason: banned.reason ?? null,
            },
            include: { besin: { select: { id: true, name: true } } },
          });
          made.push(row);
        }
        return made;
      });

      return NextResponse.json({ bannedFoods: created });
    } catch (err) {
      log.error("replace failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Failed to update banned foods" },
        { status: 500 },
      );
    }
  },
});

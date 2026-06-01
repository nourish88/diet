import { NextResponse, after } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireOwnDiet, type AuthResult } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";
import { invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";

export const maxDuration = 60;

type Params = { id: string };

async function logDietUpdate({
  clientId,
  dietId,
  dietitianId,
  metadata,
}: {
  clientId: number | null;
  dietId: number;
  dietitianId: number;
  metadata: Record<string, unknown>;
}) {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "diet_form_logging_enabled" },
      select: { value: true },
    });
    if (!config || config.value !== "true") return;

    await prisma.dietFormLog.create({
      data: {
        sessionId: `api_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        dietitianId,
        clientId,
        dietId,
        action: "diet_updated",
        source: "server",
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Telemetry is best-effort; never fail the request on logging.
  }
}

async function clientOwnsDiet(dietId: number, auth: AuthResult): Promise<boolean> {
  if (!auth.user || auth.user.role !== "client") return false;
  const diet = await prisma.diet.findUnique({
    where: { id: dietId },
    select: { clientId: true },
  });
  return diet ? diet.clientId === auth.user.id : false;
}

function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  return (value as string | null) ?? null;
}

/** GET /api/diets/[id] — diet detail (owning dietitian or client). */
export const GET = route<undefined, Params>({
  auth: "any",
  scope: "diets.get",
  handler: async ({ params, auth, log }) => {
    try {
      const dietId = parseInt(params.id, 10);
      if (Number.isNaN(dietId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid diet ID" }, { status: 400 }),
        );
      }

      const user = auth.user!;
      const hasAccess =
        user.role === "dietitian"
          ? await requireOwnDiet(dietId, auth)
          : await clientOwnsDiet(dietId, auth);
      if (!hasAccess) {
        return addCorsHeaders(
          NextResponse.json({ error: "Access denied" }, { status: 403 }),
        );
      }

      const diet = await prisma.diet.findUnique({
        where: { id: dietId },
        include: {
          client: {
            select: { id: true, name: true, surname: true, phoneNumber: true },
          },
          oguns: {
            orderBy: { order: "asc" },
            include: { items: { include: { besin: true, birim: true } } },
          },
          importantDate: { select: { id: true, message: true } },
        },
      });

      if (!diet) {
        return addCorsHeaders(
          NextResponse.json({ error: "Diet not found" }, { status: 404 }),
        );
      }

      const normalized = {
        ...diet,
        tarih: toIso(diet.tarih),
        createdAt: toIso(diet.createdAt),
        updatedAt: toIso(diet.updatedAt),
        client: diet.client,
      };

      return addCorsHeaders(NextResponse.json(normalized));
    } catch (err) {
      log.error("get failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to fetch diet" }, { status: 500 }),
      );
    }
  },
});

/** PUT /api/diets/[id] — replace a diet's fields and meals (dietitian, owner). */
export const PUT = route<undefined, Params>({
  auth: "dietitian",
  scope: "diets.update",
  handler: async ({ request, params, auth, log }) => {
    try {
      const dietId = parseInt(params.id, 10);
      if (Number.isNaN(dietId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid diet ID" }, { status: 400 }),
        );
      }

      if (!(await requireOwnDiet(dietId, auth))) {
        return addCorsHeaders(
          NextResponse.json({ error: "Access denied" }, { status: 403 }),
        );
      }

      let data: any;
      try {
        data = await request.json();
      } catch {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid request body" }, { status: 400 }),
        );
      }

      // Resolve every distinct besin/birim name to an id BEFORE the
      // transaction starts, otherwise each menu item triggers a sequential
      // connectOrCreate round-trip inside the interactive transaction and
      // diets with many items blow past Prisma's 5 sn default (P2028).
      const ogunsInput: any[] = Array.isArray(data.oguns) ? data.oguns : [];
      const besinNameSet = new Set<string>();
      const birimNameSet = new Set<string>();
      for (const ogun of ogunsInput) {
        for (const item of ogun.items || []) {
          besinNameSet.add(item.besin || "");
          birimNameSet.add(item.birim || "");
        }
      }
      const [besinRecords, birimRecords] = await Promise.all([
        Promise.all(
          Array.from(besinNameSet).map((name) =>
            prisma.besin.upsert({
              where: { name },
              create: { name },
              update: {},
              select: { id: true, name: true },
            }),
          ),
        ),
        Promise.all(
          Array.from(birimNameSet).map((name) =>
            prisma.birim.upsert({
              where: { name },
              create: { name },
              update: {},
              select: { id: true, name: true },
            }),
          ),
        ),
      ]);
      const besinIdByName = new Map(besinRecords.map((b) => [b.name, b.id]));
      const birimIdByName = new Map(birimRecords.map((b) => [b.name, b.id]));

      invalidate.besinler();
      invalidate.birims();

      const ogunsCreate = ogunsInput.map((ogun: any) => ({
        name: ogun.name || "",
        time: ogun.time || "",
        detail: ogun.detail || "",
        order: ogun.order || 0,
        items: {
          create: (ogun.items || []).map((item: any) => ({
            miktar: item.miktar || "",
            birim: { connect: { id: birimIdByName.get(item.birim || "")! } },
            besin: { connect: { id: besinIdByName.get(item.besin || "")! } },
          })),
        },
      }));

      const updatedDiet = await prisma.$transaction(
        async (tx) => {
          await tx.ogun.deleteMany({ where: { dietId } });
          return tx.diet.update({
            where: { id: dietId },
            data: {
              tarih: data.tarih ? new Date(data.tarih) : null,
              su: data.su || "",
              sonuc: data.sonuc || "",
              hedef: data.hedef || "",
              fizik: data.fizik || "",
              isBirthdayCelebration: data.isBirthdayCelebration || false,
              isImportantDateCelebrated: data.isImportantDateCelebrated || false,
              importantDateId: data.importantDateId || null,
              dietitianNote: data.dietitianNote || "",
              oguns: { create: ogunsCreate },
            },
            include: {
              oguns: {
                include: { items: { include: { birim: true, besin: true } } },
              },
              client: true,
              importantDate: { select: { id: true, message: true } },
            },
          });
        },
        { timeout: 15_000, maxWait: 5_000 },
      );

      after(() =>
        logDietUpdate({
          dietitianId: auth.user!.id,
          clientId: updatedDiet.clientId,
          dietId: updatedDiet.id,
          metadata: {
            ogunCount: updatedDiet.oguns.length,
            totalItems: updatedDiet.oguns.reduce(
              (sum, ogun) => sum + (ogun.items?.length || 0),
              0,
            ),
          },
        }),
      );

      const normalized = {
        ...updatedDiet,
        tarih: toIso(updatedDiet.tarih),
        createdAt: toIso(updatedDiet.createdAt),
        updatedAt: toIso(updatedDiet.updatedAt),
      };

      return addCorsHeaders(NextResponse.json(normalized));
    } catch (err) {
      log.error("update failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to update diet" }, { status: 500 }),
      );
    }
  },
});

/** DELETE /api/diets/[id] — delete a diet (dietitian, owner). */
export const DELETE = route<undefined, Params>({
  auth: "dietitian",
  scope: "diets.delete",
  handler: async ({ params, auth, log }) => {
    try {
      const dietId = parseInt(params.id, 10);
      if (Number.isNaN(dietId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid diet ID" }, { status: 400 }),
        );
      }

      if (!(await requireOwnDiet(dietId, auth))) {
        return addCorsHeaders(
          NextResponse.json({ error: "Access denied" }, { status: 403 }),
        );
      }

      await prisma.diet.delete({ where: { id: dietId } });

      return addCorsHeaders(
        NextResponse.json({ message: "Diet deleted successfully" }),
      );
    } catch (err) {
      log.error("delete failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to delete diet" }, { status: 500 }),
      );
    }
  },
});

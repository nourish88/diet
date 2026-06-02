import { after } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireOwnClient } from "@/lib/api-auth";
import { notifyClientOfNewDiet } from "@/services/DietNotificationService";
import { invalidate } from "@/lib/cache";
import { route, HttpError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DietLogAction = "diet_overridden" | "diet_saved" | "diet_save_failed";

async function logDietAction({
  action,
  clientId,
  dietId,
  dietitianId,
  metadata,
}: {
  action: DietLogAction;
  clientId: number | null;
  dietId?: number | null;
  dietitianId: number;
  metadata?: Record<string, unknown>;
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
        dietId: dietId ?? null,
        action,
        source: "server",
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (logError) {
    console.warn("Error logging diet action:", logError);
  }
}

interface DietItemInput {
  miktar?: string;
  birim?: string;
  besin?: string;
}
interface OgunInput {
  name?: string;
  time?: string;
  detail?: string;
  order?: number;
  items?: DietItemInput[];
}
interface DietCreateBody {
  clientId: number;
  tarih?: string | null;
  su?: string;
  sonuc?: string;
  hedef?: string;
  fizik?: string;
  isBirthdayCelebration?: boolean;
  isImportantDateCelebrated?: boolean;
  importantDateId?: number | null;
  dietitianNote?: string;
  oguns?: OgunInput[];
}

export const POST = route({
  cors: true,
  auth: "dietitian",
  scope: "diets.create",
  handler: async ({ request, auth, log }) => {
    let data: DietCreateBody;
    try {
      data = (await request.json()) as DietCreateBody;
    } catch {
      throw new HttpError("bad_request", "Invalid request body");
    }

    if (!(await requireOwnClient(data.clientId, auth))) {
      throw new HttpError("forbidden", "Access denied to this client");
    }

    try {
      // Duplicate guard: same client + dietitian on the same calendar day → override.
      let existingDietId: number | null = null;
      if (data.tarih) {
        const target = new Date(data.tarih);
        const startOfDay = new Date(target);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(target);
        endOfDay.setHours(23, 59, 59, 999);

        const existing = await prisma.diet.findFirst({
          where: {
            clientId: data.clientId,
            dietitianId: auth.user!.id,
            tarih: { gte: startOfDay, lte: endOfDay },
          },
          select: { id: true },
        });
        existingDietId = existing?.id ?? null;
      }

      // Pre-resolve besin/birim ids outside the transaction so the interactive
      // transaction stays short (Neon serverless P2028 budget).
      const ogunsInput = Array.isArray(data.oguns) ? data.oguns : [];
      const besinNames = new Set<string>();
      const birimNames = new Set<string>();
      for (const ogun of ogunsInput) {
        for (const item of ogun.items ?? []) {
          besinNames.add(item.besin ?? "");
          birimNames.add(item.birim ?? "");
        }
      }
      const [besinRecords, birimRecords] = await Promise.all([
        Promise.all(
          Array.from(besinNames).map((name) =>
            prisma.besin.upsert({
              where: { name },
              create: { name },
              update: {},
              select: { id: true, name: true },
            }),
          ),
        ),
        Promise.all(
          Array.from(birimNames).map((name) =>
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

      const ogunsCreate = ogunsInput.map((ogun) => ({
        name: ogun.name ?? "",
        time: ogun.time ?? "",
        detail: ogun.detail ?? "",
        order: ogun.order ?? 0,
        items: {
          create: (ogun.items ?? []).map((item) => ({
            miktar: item.miktar ?? "",
            birim: { connect: { id: birimIdByName.get(item.birim ?? "")! } },
            besin: { connect: { id: besinIdByName.get(item.besin ?? "")! } },
          })),
        },
      }));

      const dietFields = {
        tarih: data.tarih ? new Date(data.tarih) : null,
        su: data.su ?? "",
        sonuc: data.sonuc ?? "",
        hedef: data.hedef ?? "",
        fizik: data.fizik ?? "",
        isBirthdayCelebration: data.isBirthdayCelebration ?? false,
        isImportantDateCelebrated: data.isImportantDateCelebrated ?? false,
        importantDateId: data.importantDateId ?? null,
        dietitianNote: data.dietitianNote ?? "",
      };

      const include = {
        oguns: {
          include: { items: { include: { birim: true, besin: true } } },
        },
        client: true,
      } as const;

      const diet = existingDietId
        ? await prisma.$transaction(
            async (tx) => {
              await tx.ogun.deleteMany({ where: { dietId: existingDietId } });
              return tx.diet.update({
                where: { id: existingDietId },
                data: {
                  ...dietFields,
                  oguns: { create: ogunsCreate },
                  notifiedAt: null,
                },
                include,
              });
            },
            { timeout: 15_000, maxWait: 5_000 },
          )
        : await prisma.diet.create({
            data: {
              clientId: data.clientId,
              dietitianId: auth.user!.id,
              ...dietFields,
              oguns: { create: ogunsCreate },
            },
            include,
          });

      const wasOverridden = existingDietId !== null;

      after(() => notifyClientOfNewDiet(diet.id));
      after(() =>
        logDietAction({
          dietitianId: auth.user!.id,
          clientId: data.clientId,
          dietId: diet.id,
          action: wasOverridden ? "diet_overridden" : "diet_saved",
          metadata: {
            ogunCount: diet.oguns.length,
            totalItems: diet.oguns.reduce(
              (sum, ogun) => sum + (ogun.items?.length ?? 0),
              0,
            ),
            overridden: wasOverridden,
          },
        }),
      );

      return { ...diet, _overridden: wasOverridden };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const type = error instanceof Error ? error.constructor.name : typeof error;
      const prismaCode =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : undefined;
      const prismaMeta =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.meta
          : undefined;

      log.error("create failed", { message, type, prismaCode });

      after(() =>
        logDietAction({
          dietitianId: auth.user!.id,
          clientId: data.clientId ?? null,
          action: "diet_save_failed",
          metadata: { error: message, errorType: type, prismaCode, prismaMeta },
        }),
      );

      throw new HttpError("internal", message, {
        errorType: type,
        details: prismaCode
          ? `Database error (${prismaCode})`
          : "Failed to create diet",
        ...(process.env.NODE_ENV === "development"
          ? { stack: error instanceof Error ? error.stack : undefined, prismaMeta }
          : {}),
      });
    }
  },
});

export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "diets.list",
  handler: async ({ request, auth }) => {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get("clientId");
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "50", 10);
    const search = searchParams.get("search");

    const where: Prisma.DietWhereInput = { dietitianId: auth.user!.id };

    if (clientId) {
      const clientIdNum = Number(clientId);
      if (!(await requireOwnClient(clientIdNum, auth))) {
        throw new HttpError("forbidden", "Access denied to this client");
      }
      where.clientId = clientIdNum;
    }

    if (search) {
      const tokens = search
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);
      if (tokens.length > 0) {
        where.AND = tokens.map((token) => ({
          OR: [
            { client: { name: { contains: token, mode: "insensitive" } } },
            { client: { surname: { contains: token, mode: "insensitive" } } },
          ],
        }));
      }
      const asNum = Number(search);
      if (!Number.isNaN(asNum)) {
        where.OR = [{ id: { equals: asNum } }];
      }
    }

    const total = await prisma.diet.count({ where });
    const diets = await prisma.diet.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    return { diets, total, hasMore: skip + take < total, skip, take };
  },
});

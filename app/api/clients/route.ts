import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizeClientPhoneNumber } from "@/lib/client-phone-auth";
import { TanitaMappingService } from "@/services/TanitaMappingService";
import { TanitaProgressService } from "@/services/TanitaProgressService";
import { TanitaService } from "@/services/TanitaService";
import { route, HttpError } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const PHONE_INVALID_MESSAGE =
  "Telefon numarası geçerli değil. Türkiye için 05… veya +90…; yurtdışı için +ülke kodu ile gerçek bir numara girin.";

/** GET /api/clients — paginated, tokenized search over the dietitian's own clients. */
export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "clients.list",
  handler: async ({ request, auth }) => {
    const searchParams = request.nextUrl.searchParams;
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "20", 10);
    const search = searchParams.get("search") || "";

    const whereClause: Prisma.ClientWhereInput = { dietitianId: auth.user!.id };

    if (search) {
      const tokens = search
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);
      if (tokens.length > 0) {
        whereClause.AND = tokens.map((token) => ({
          OR: [
            { name: { contains: token, mode: "insensitive" } },
            { surname: { contains: token, mode: "insensitive" } },
            { phoneNumber: { contains: token, mode: "insensitive" } },
          ],
        }));
      }
    }

    const [total, clients] = await Promise.all([
      prisma.client.count({ where: whereClause }),
      prisma.client.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          surname: true,
          phoneNumber: true,
          birthdate: true,
          createdAt: true,
          gender: true,
        },
      }),
    ]);

    return { clients, total, hasMore: skip + take < total };
  },
});

interface ClientCreateBody {
  bannedBesins?: Array<{ besinId: number; reason?: string }>;
  tanitaMemberId?: unknown;
  syncMeasurements?: boolean;
  name?: string;
  surname?: string;
  phoneNumber?: unknown;
  gender?: unknown;
  notes?: string | null;
  illness?: string | null;
  birthdate?: string | null;
}

function parseTanitaMemberId(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError("bad_request", "Geçersiz Tanita üye numarası");
  }
  return n;
}

function parseGender(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const g = Number(raw);
  return Number.isFinite(g) ? g : null;
}

/** POST /api/clients — create a client, optionally linking a Tanita member (dietitian). */
export const POST = route({
  cors: true,
  auth: "dietitian",
  scope: "clients.create",
  handler: async ({ request, auth, log }) => {
    const body = (await request.json()) as ClientCreateBody;
    const {
      bannedBesins,
      tanitaMemberId: rawTanitaMemberId,
      syncMeasurements,
      ...clientDetails
    } = body;

    if (!clientDetails.name || !clientDetails.surname) {
      throw new HttpError("bad_request", "İsim ve soyisim zorunludur");
    }

    const tanitaMemberId = parseTanitaMemberId(rawTanitaMemberId);
    if (tanitaMemberId !== undefined) {
      const tanitaUser = TanitaService.getUserById(tanitaMemberId);
      if (!tanitaUser) {
        throw new HttpError("bad_request", "Tanita'da bu üye bulunamadı");
      }
      const taken = await prisma.client.findFirst({ where: { tanitaMemberId } });
      if (taken) {
        throw new HttpError(
          "conflict",
          "Bu Tanita kaydı zaten başka bir danışan ile eşleşmiş.",
        );
      }
    }

    const normalizedPhone = normalizeClientPhoneNumber(
      clientDetails.phoneNumber as string | undefined,
    );
    if (clientDetails.phoneNumber && !normalizedPhone) {
      throw new HttpError("bad_request", PHONE_INVALID_MESSAGE);
    }

    const phoneTrimmed =
      typeof clientDetails.phoneNumber === "string"
        ? clientDetails.phoneNumber.trim()
        : clientDetails.phoneNumber
          ? String(clientDetails.phoneNumber).trim()
          : "";

    const transformedData = {
      name: clientDetails.name,
      surname: clientDetails.surname,
      notes: clientDetails.notes ?? null,
      illness: clientDetails.illness ?? null,
      gender: parseGender(clientDetails.gender),
      phoneNumber: phoneTrimmed || null,
      dietitianId: auth.user!.id,
      birthdate:
        clientDetails.birthdate && clientDetails.birthdate !== "null"
          ? new Date(clientDetails.birthdate)
          : null,
      ...(tanitaMemberId !== undefined ? { tanitaMemberId } : {}),
    };

    const client = await prisma.$transaction(async (tx) => {
      const createdClient = await tx.client.create({
        data: {
          ...transformedData,
          bannedFoods: {
            create:
              bannedBesins?.map((ban) => ({
                besinId: ban.besinId,
                reason: ban.reason,
              })) ?? [],
          },
        },
        include: { bannedFoods: { include: { besin: true } } },
      });

      if (normalizedPhone) {
        await tx.clientPhoneAuth.upsert({
          where: { clientId: createdClient.id },
          create: {
            clientId: createdClient.id,
            phoneRaw: phoneTrimmed,
            phoneNormalized: normalizedPhone,
          },
          update: { phoneRaw: phoneTrimmed, phoneNormalized: normalizedPhone },
        });
      }

      return createdClient;
    });

    if (tanitaMemberId !== undefined) {
      await TanitaMappingService.ensurePrismaTanitaUserForClient(
        client.id,
        tanitaMemberId,
      );
    }

    if (syncMeasurements && client.userId && tanitaMemberId !== undefined) {
      try {
        await TanitaProgressService.syncMeasurementsToProgress(
          client.id,
          client.userId,
        );
      } catch (syncErr) {
        log.warn(
          "tanita sync skipped",
          syncErr instanceof Error ? syncErr.message : syncErr,
        );
      }
    }

    return ok(client, { status: 201 });
  },
});

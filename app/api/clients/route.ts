import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { normalizeClientPhoneNumber } from "@/lib/client-phone-auth";
import { TanitaMappingService } from "@/services/TanitaMappingService";
import { TanitaProgressService } from "@/services/TanitaProgressService";
import { TanitaService } from "@/services/TanitaService";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

const PHONE_INVALID_MESSAGE =
  "Telefon numarası geçerli değil. Türkiye için 05… veya +90…; yurtdışı için +ülke kodu ile gerçek bir numara girin.";

/** GET /api/clients — paginated, tokenized search over the dietitian's own clients. */
export const GET = route({
  auth: "dietitian",
  scope: "clients.list",
  handler: async ({ request, auth, log }) => {
    try {
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

      return addCorsHeaders(
        NextResponse.json({ clients, total, hasMore: skip + take < total }),
      );
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Veritabanı bağlantısında bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

/** POST /api/clients — create a client, optionally linking a Tanita member (dietitian). */
export const POST = route({
  auth: "dietitian",
  scope: "clients.create",
  handler: async ({ request, auth, log }) => {
    try {
      const clientData = (await request.json()) as Record<string, unknown> & {
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
      };

      const {
        bannedBesins,
        tanitaMemberId: rawTanitaMemberId,
        syncMeasurements,
        ...clientDetails
      } = clientData;

      if (!clientDetails.name || !clientDetails.surname) {
        return addCorsHeaders(
          NextResponse.json({ error: "İsim ve soyisim zorunludur" }, { status: 400 }),
        );
      }

      let tanitaMemberId: number | undefined;
      if (
        rawTanitaMemberId !== undefined &&
        rawTanitaMemberId !== null &&
        rawTanitaMemberId !== ""
      ) {
        const n = Number(rawTanitaMemberId);
        if (!Number.isInteger(n) || n <= 0) {
          return addCorsHeaders(
            NextResponse.json(
              { error: "Geçersiz Tanita üye numarası" },
              { status: 400 },
            ),
          );
        }
        tanitaMemberId = n;
      }

      if (tanitaMemberId !== undefined) {
        const tanitaUser = TanitaService.getUserById(tanitaMemberId);
        if (!tanitaUser) {
          return addCorsHeaders(
            NextResponse.json(
              { error: "Tanita'da bu üye bulunamadı" },
              { status: 400 },
            ),
          );
        }
        const taken = await prisma.client.findFirst({ where: { tanitaMemberId } });
        if (taken) {
          return addCorsHeaders(
            NextResponse.json(
              { error: "Bu Tanita kaydı zaten başka bir danışan ile eşleşmiş." },
              { status: 409 },
            ),
          );
        }
      }

      const normalizedPhone = normalizeClientPhoneNumber(
        clientDetails.phoneNumber as string | undefined,
      );
      if (clientDetails.phoneNumber && !normalizedPhone) {
        return addCorsHeaders(
          NextResponse.json({ error: PHONE_INVALID_MESSAGE }, { status: 400 }),
        );
      }

      const phoneTrimmed =
        typeof clientDetails.phoneNumber === "string"
          ? clientDetails.phoneNumber.trim()
          : clientDetails.phoneNumber
            ? String(clientDetails.phoneNumber).trim()
            : "";

      let gender: number | null = null;
      if (
        clientDetails.gender !== undefined &&
        clientDetails.gender !== null &&
        clientDetails.gender !== ""
      ) {
        const g = Number(clientDetails.gender);
        gender = Number.isFinite(g) ? g : null;
      }

      const transformedData = {
        name: clientDetails.name,
        surname: clientDetails.surname,
        notes: clientDetails.notes ?? null,
        illness: clientDetails.illness ?? null,
        gender,
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
                })) || [],
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

      return addCorsHeaders(NextResponse.json(client, { status: 201 }));
    } catch (err) {
      log.error("create failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Danışan oluşturulurken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

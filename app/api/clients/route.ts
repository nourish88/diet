import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import { normalizeClientPhoneNumber } from "@/lib/client-phone-auth";
import { TanitaMappingService } from "@/services/TanitaMappingService";
import { TanitaProgressService } from "@/services/TanitaProgressService";
import { TanitaService } from "@/services/TanitaService";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export const GET = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const skip = parseInt(searchParams.get("skip") || "0");
      const take = parseInt(searchParams.get("take") || "20");
      const search = searchParams.get("search") || "";

      // Tokenized, diacritic-insensitive-ish search (name or surname)
      // Strategy:
      // - Split search by whitespace into tokens
      // - Build AND over tokens, each token matches name OR surname (mode insensitive)
      // NOTE: Prisma doesn't natively handle diacritics; this approximates by case-insensitive matching.
      // If full diacritic-insensitivity is required, migrate to unaccent-based raw query later.

      // Base filter: only own clients
      let whereClause: any = {
        dietitianId: auth.user!.id,
      };

      if (search) {
        const tokens = search
          .trim()
          .split(/\s+/)
          .filter((t) => t.length > 0);

        if (tokens.length > 0) {
          whereClause.AND = tokens.map((token) => ({
            OR: [
              { name: { contains: token, mode: "insensitive" as const } },
              { surname: { contains: token, mode: "insensitive" as const } },
              {
                phoneNumber: { contains: token, mode: "insensitive" as const },
              },
            ],
          }));
        }
      }

      // Get total count for pagination
      const total = await prisma.client.count({
        where: whereClause,
      });

      // Get paginated clients
      const clients = await prisma.client.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          surname: true,
          phoneNumber: true,
          birthdate: true,
          createdAt: true,
          gender: true,
        },
      });

      const hasMore = skip + take < total;

      return addCorsHeaders(
        NextResponse.json({
          clients,
          total,
          hasMore,
        })
      );
    } catch (error) {
      console.error("Database error:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Veritabanı bağlantısında bir hata oluştu" },
          { status: 500 }
        )
      );
    }
  }
);

export const POST = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    try {
      const clientData = await request.json();
      console.log("Received client data in API:", clientData);

      const {
        bannedBesins,
        tanitaMemberId: rawTanitaMemberId,
        syncMeasurements,
        ...clientDetails
      } = clientData;

      if (!clientDetails.name || !clientDetails.surname) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "İsim ve soyisim zorunludur" },
            { status: 400 }
          )
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
              { status: 400 }
            )
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
              { status: 400 }
            )
          );
        }
        const taken = await prisma.client.findFirst({
          where: { tanitaMemberId },
        });
        if (taken) {
          return addCorsHeaders(
            NextResponse.json(
              {
                error:
                  "Bu Tanita kaydı zaten başka bir danışan ile eşleşmiş.",
              },
              { status: 409 }
            )
          );
        }
      }

      const normalizedPhone = normalizeClientPhoneNumber(
        clientDetails.phoneNumber
      );

      if (clientDetails.phoneNumber && !normalizedPhone) {
        return addCorsHeaders(
          NextResponse.json(
            {
              error:
                "Telefon numarası geçerli değil. Türkiye için 05… veya +90…; yurtdışı için +ülke kodu ile gerçek bir numara girin.",
            },
            { status: 400 }
          )
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
        ...(tanitaMemberId !== undefined
          ? { tanitaMemberId }
          : {}),
      };

      console.log("Transformed data being sent to Prisma:", transformedData);

      const client = await prisma.$transaction(async (tx) => {
        const createdClient = await tx.client.create({
          data: {
            ...transformedData,
            bannedFoods: {
              create:
                bannedBesins?.map(
                  (ban: { besinId: number; reason?: string }) => ({
                    besinId: ban.besinId,
                    reason: ban.reason,
                  })
                ) || [],
            },
          },
          include: {
            bannedFoods: {
              include: {
                besin: true,
              },
            },
          },
        });

        if (normalizedPhone) {
          await tx.clientPhoneAuth.upsert({
            where: { clientId: createdClient.id },
            create: {
              clientId: createdClient.id,
              phoneRaw: phoneTrimmed,
              phoneNormalized: normalizedPhone,
            },
            update: {
              phoneRaw: phoneTrimmed,
              phoneNormalized: normalizedPhone,
            },
          });
        }

        return createdClient;
      });

      if (tanitaMemberId !== undefined) {
        await TanitaMappingService.ensurePrismaTanitaUserForClient(
          client.id,
          tanitaMemberId
        );
      }

      if (syncMeasurements && client.userId && tanitaMemberId !== undefined) {
        try {
          await TanitaProgressService.syncMeasurementsToProgress(
            client.id,
            client.userId
          );
        } catch (syncErr) {
          console.warn("Tanita ölçü senkronu atlandı:", syncErr);
        }
      }

      console.log("Created client:", client);

      return addCorsHeaders(NextResponse.json(client, { status: 201 }));
    } catch (error: any) {
      console.error("Error creating client:", error);

      // Return a proper JSON response for all errors
      return addCorsHeaders(
        NextResponse.json(
          {
            error: error.message || "Danışan oluşturulurken bir hata oluştu",
          },
          { status: 500 }
        )
      );
    }
  }
);

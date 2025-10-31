import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

export const GET = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const { searchParams } = new URL(request.url);
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

      if (!clientData.name || !clientData.surname) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "İsim ve soyisim zorunludur" },
            { status: 400 }
          )
        );
      }

      const { bannedBesins, ...clientDetails } = clientData;

      const transformedData = {
        ...clientDetails,
        dietitianId: auth.user!.id, // SECURITY: Assign to authenticated dietitian
        birthdate:
          clientDetails.birthdate && clientDetails.birthdate !== "null"
            ? new Date(clientDetails.birthdate)
            : null,
      };

      console.log("Transformed data being sent to Prisma:", transformedData);

      const client = await prisma.client.create({
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

      console.log("Created client:", client);

      return addCorsHeaders(NextResponse.json({ client }, { status: 201 }));
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

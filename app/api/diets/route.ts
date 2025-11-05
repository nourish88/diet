import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult, requireOwnClient } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export const POST = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Parse request body once (can't read twice)
    let data: any;
    try {
      data = await request.json();
      console.log("Received data:", data);
    } catch (parseError) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Invalid request body" },
          { status: 400 }
        )
      );
    }

    try {

      // SECURITY: Check if dietitian owns this client
      const hasAccess = await requireOwnClient(data.clientId, auth);
      if (!hasAccess) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Access denied to this client" },
            { status: 403 }
          )
        );
      }

      // Get client to inherit their dietitian (for backward compatibility)
      const client = await prisma.client.findUnique({
        where: { id: data.clientId },
        select: { dietitianId: true },
      });

      // Create diet with proper null checks and defaults
      const diet = await prisma.diet.create({
        data: {
          clientId: data.clientId,
          dietitianId: auth.user!.id, // SECURITY: Assign to authenticated dietitian
          tarih: data.tarih ? new Date(data.tarih) : null,
          su: data.su || "",
          sonuc: data.sonuc || "",
          hedef: data.hedef || "",
          fizik: data.fizik || "",
          isBirthdayCelebration: data.isBirthdayCelebration || false,
          isImportantDateCelebrated: data.isImportantDateCelebrated || false,
          importantDateId: data.importantDateId || null,
          dietitianNote: data.dietitianNote || "",
          oguns: {
            create: (data.oguns || []).map((ogun: any) => ({
              name: ogun.name || "",
              time: ogun.time || "",
              detail: ogun.detail || "",
              order: ogun.order || 0,
              items: {
                create: (ogun.items || []).map((item: any) => ({
                  miktar: item.miktar || "",
                  birim: {
                    connectOrCreate: {
                      where: { name: item.birim || "" },
                      create: { name: item.birim || "" },
                    },
                  },
                  besin: {
                    connectOrCreate: {
                      where: { name: item.besin || "" },
                      create: { name: item.besin || "" },
                    },
                  },
                })),
              },
            })),
          },
        },
        include: {
          oguns: {
            include: {
              items: {
                include: {
                  birim: true,
                  besin: true,
                },
              },
            },
          },
          client: true,
        },
      });

      // Log diet creation on server side
      try {
        const logResponse = await fetch(
          `${request.nextUrl.origin}/api/diet-logs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: request.headers.get("Authorization") || "",
            },
            body: JSON.stringify({
              sessionId: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              dietitianId: auth.user!.id,
              clientId: data.clientId,
              dietId: diet.id,
              action: "diet_saved",
              metadata: {
                ogunCount: diet.oguns.length,
                totalItems: diet.oguns.reduce(
                  (sum, ogun) => sum + (ogun.items?.length || 0),
                  0
                ),
              },
            }),
          }
        );
        // Don't fail if logging fails
        if (!logResponse.ok) {
          console.warn("Failed to log diet creation:", logResponse.statusText);
        }
      } catch (logError) {
        // Silently fail - logging should not break diet creation
        console.warn("Error logging diet creation:", logError);
      }

      return addCorsHeaders(NextResponse.json(diet));
    } catch (error) {
      console.error("Error creating diet:", error);
      
      // Log diet save failure
      try {
        const logResponse = await fetch(
          `${request.nextUrl.origin}/api/diet-logs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: request.headers.get("Authorization") || "",
            },
            body: JSON.stringify({
              sessionId: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              dietitianId: auth.user!.id,
              clientId: data?.clientId || null,
              action: "diet_save_failed",
              metadata: {
                error: (error as Error).message,
              },
            }),
          }
        );
        // Don't fail if logging fails
        if (!logResponse.ok) {
          console.warn("Failed to log diet save failure:", logResponse.statusText);
        }
      } catch (logError) {
        // Silently fail
        console.warn("Error logging diet save failure:", logError);
      }

      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            error: `Database error: ${(error as Error).message}`,
          },
          { status: 500 }
        )
      );
    }
  }
);

export const GET = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const clientId = searchParams.get("clientId");
      const skip = parseInt(searchParams.get("skip") || "0");
      const take = parseInt(searchParams.get("take") || "50");
      const search = searchParams.get("search");

      // Build where clause based on filters
      const where: any = {
        dietitianId: auth.user!.id, // SECURITY: Only show own diets
      };

      // Add client filter if provided
      if (clientId) {
        const clientIdNum = Number(clientId);

        // SECURITY: Verify dietitian owns this client
        const hasAccess = await requireOwnClient(clientIdNum, auth);
        if (!hasAccess) {
          return addCorsHeaders(
            NextResponse.json(
              { error: "Access denied to this client" },
              { status: 403 }
            )
          );
        }

        where.clientId = clientIdNum;
      }

      // Add search filter if provided (tokenized AND over tokens; each token matches name OR surname)
      if (search) {
        const tokens = search
          .trim()
          .split(/\s+/)
          .filter((t) => t.length > 0);
        if (tokens.length > 0) {
          where.AND = tokens.map((token: string) => ({
            OR: [
              { client: { name: { contains: token, mode: "insensitive" } } },
              { client: { surname: { contains: token, mode: "insensitive" } } },
            ],
          }));
        }

        // Also allow direct id lookup
        const asNum = Number(search);
        if (!isNaN(asNum)) {
          where.OR = [{ id: { equals: asNum } }];
        }
      }

      // Get total count for pagination
      const total = await prisma.diet.count({ where });

      const diets = await prisma.diet.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              surname: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      });

      const hasMore = skip + take < total;

      return addCorsHeaders(
        NextResponse.json({
          diets,
          total,
          hasMore,
          skip,
          take,
        })
      );
    } catch (error: any) {
      console.error("Error fetching diets:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: error.message || "Failed to fetch diets" },
          { status: 500 }
        )
      );
    }
  }
);

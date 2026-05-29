import { NextRequest, NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult, requireOwnClient } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import { notifyClientOfNewDiet } from "@/services/DietNotificationService";
import { invalidate } from "@/lib/cache";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
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
  metadata?: Record<string, any>;
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
        metadata,
      },
    });
  } catch (logError) {
    console.warn("Error logging diet action:", logError);
  }
}

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

      // Duplicate guard: if a diet already exists for the same client + dietitian
      // on the same calendar day (tarih), override it instead of creating a new row.
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

      // Resolve every distinct besin and birim name to an id BEFORE we
      // touch the diet transaction. Previously the override path did a
      // `connectOrCreate` for every menu item inside the transaction; with
      // 6 öğün × ~5 items that's ~60 sequential round-trips to Neon and
      // routinely blew through the 5 sn interactive-tx limit (P2028).
      // After this pass the transaction only runs deleteMany + a single
      // nested-create — well under a second.
      const ogunsInput: any[] = Array.isArray(data.oguns) ? data.oguns : [];
      const besinNameSet = new Set<string>();
      const birimNameSet = new Set<string>();
      for (const ogun of ogunsInput) {
        for (const item of (ogun.items || [])) {
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
            })
          )
        ),
        Promise.all(
          Array.from(birimNameSet).map((name) =>
            prisma.birim.upsert({
              where: { name },
              create: { name },
              update: {},
              select: { id: true, name: true },
            })
          )
        ),
      ]);
      const besinIdByName = new Map(besinRecords.map((b) => [b.name, b.id]));
      const birimIdByName = new Map(birimRecords.map((b) => [b.name, b.id]));

      // Upserts above may have inserted new besin/birim rows; invalidate
      // dictionary caches so autocomplete sees them on the next read.
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

      const dietFields = {
        tarih: data.tarih ? new Date(data.tarih) : null,
        su: data.su || "",
        sonuc: data.sonuc || "",
        hedef: data.hedef || "",
        fizik: data.fizik || "",
        isBirthdayCelebration: data.isBirthdayCelebration || false,
        isImportantDateCelebrated: data.isImportantDateCelebrated || false,
        importantDateId: data.importantDateId || null,
        dietitianNote: data.dietitianNote || "",
      };

      const include = {
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
      } as const;

      const diet = existingDietId
        ? await prisma.$transaction(
            async (tx) => {
              // Override: replace meals (cascades menu items) and update fields
              await tx.ogun.deleteMany({ where: { dietId: existingDietId } });
              return tx.diet.update({
                where: { id: existingDietId },
                data: {
                  ...dietFields,
                  oguns: { create: ogunsCreate },
                  notifiedAt: null, // re-notify since the diet changed
                },
                include,
              });
            },
            // Safety net for cold-starts on Neon serverless. The actual work
            // here is fast (~1 sn) since besin/birim are pre-resolved above;
            // this bigger budget only matters when the connection warms up.
            { timeout: 15_000, maxWait: 5_000 }
          )
        : await prisma.diet.create({
            data: {
              clientId: data.clientId,
              dietitianId: auth.user!.id, // SECURITY: Assign to authenticated dietitian
              ...dietFields,
              oguns: { create: ogunsCreate },
            },
            include,
          });

      const wasOverridden = existingDietId !== null;

      // Push notification to the client — runs after response is sent
      after(() => notifyClientOfNewDiet(diet.id));

      // Log after the response is sent. Saving the diet should not wait for
      // non-critical telemetry, especially on serverless cold starts.
      after(() =>
        logDietAction({
          dietitianId: auth.user!.id,
          clientId: data.clientId,
          dietId: diet.id,
          action: wasOverridden ? "diet_overridden" : "diet_saved",
          metadata: {
            ogunCount: diet.oguns.length,
            totalItems: diet.oguns.reduce(
              (sum, ogun) => sum + (ogun.items?.length || 0),
              0
            ),
            overridden: wasOverridden,
          },
        })
      );

      return addCorsHeaders(
        NextResponse.json({ ...diet, _overridden: wasOverridden })
      );
    } catch (error) {
      // Enhanced error logging with detailed information
      const errorDetails: any = {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      };

      // Extract Prisma-specific error details
      if (error && typeof error === 'object' && 'code' in error) {
        errorDetails.prismaCode = (error as any).code;
        errorDetails.meta = (error as any).meta;
      }

      console.error("Error creating diet:", {
        error: errorDetails,
        clientId: data?.clientId,
        dietitianId: auth.user!.id,
        timestamp: new Date().toISOString(),
      });
      
      after(() =>
        logDietAction({
          dietitianId: auth.user!.id,
          clientId: data?.clientId || null,
          action: "diet_save_failed",
          metadata: {
            error: errorDetails.message,
            errorType: errorDetails.type,
            prismaCode: errorDetails.prismaCode,
            prismaMeta: errorDetails.meta,
            stack: errorDetails.stack?.substring(0, 500),
          },
        })
      );

      // Return structured error response
      const errorMessage = errorDetails.message || "Unknown error occurred";
      const isPrismaError = !!errorDetails.prismaCode;
      
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            error: errorMessage,
            details: isPrismaError 
              ? `Database error (${errorDetails.prismaCode})` 
              : "Failed to create diet",
            errorType: errorDetails.type,
            ...(process.env.NODE_ENV === 'development' && {
              stack: errorDetails.stack,
              prismaMeta: errorDetails.meta,
            }),
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

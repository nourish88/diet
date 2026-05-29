import { NextRequest, NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireDietitian,
  AuthResult,
  requireOwnDiet,
  authenticateRequest,
} from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import { invalidate } from "@/lib/cache";

export const maxDuration = 60;

async function logDietUpdate({
  clientId,
  dietId,
  dietitianId,
  metadata,
}: {
  clientId: number | null;
  dietId: number;
  dietitianId: number;
  metadata: Record<string, any>;
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
        metadata,
      },
    });
  } catch (logError) {
    console.warn("Error logging diet update:", logError);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id } = await params;
    const dietId = parseInt(id);

    if (isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid diet ID" }, { status: 400 })
      );
    }

    // SECURITY: Check access based on role
    console.log("🔐 Access check - User:", auth.user.id, "Role:", auth.user.role, "Diet ID:", dietId);
    
    let hasAccess = false;
    if (auth.user.role === "dietitian") {
      hasAccess = await requireOwnDiet(dietId, auth);
      console.log("👨‍⚕️ Dietitian access check result:", hasAccess);
    } else if (auth.user.role === "client") {
      const requireOwnClientDiet = async (dietId: number, auth: AuthResult): Promise<boolean> => {
        if (!auth.user || auth.user.role !== "client") {
          return false;
        }
        try {
          const diet = await prisma.diet.findUnique({
            where: { id: dietId },
            select: { clientId: true, dietitianId: true },
          });
          console.log("🔍 Diet found:", diet);
          console.log("🔍 User ID:", auth.user.id, "Client ID in diet:", diet?.clientId);
          if (!diet) {
            return false;
          }
          return diet.clientId === auth.user.id;
        } catch (error) {
          console.error("Error checking client diet ownership:", error);
          return false;
        }
      };
      hasAccess = await requireOwnClientDiet(dietId, auth);
      console.log("👤 Client access check result:", hasAccess);
    }

    if (!hasAccess) {
      console.log("❌ Access denied for user:", auth.user.id, "to diet:", dietId);
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }
    
    console.log("✅ Access granted for user:", auth.user.id, "to diet:", dietId);

    const diet = await prisma.diet.findUnique({
      where: {
        id: dietId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            surname: true,
            phoneNumber: true,
          },
        },
        oguns: {
          orderBy: {
            order: "asc",
          },
          include: {
            items: {
              include: {
                besin: true,
                birim: true,
              },
            },
          },
        },
        importantDate: {
          select: {
            id: true,
            message: true,
          },
        },
      },
    });

    if (!diet) {
      return addCorsHeaders(
        NextResponse.json({ error: "Diet not found" }, { status: 404 })
      );
    }

    // Debug: Log client phoneNumber
    console.log("🔵 API - Diet client:", diet.client);
    console.log("🔵 API - Client phoneNumber:", diet.client?.phoneNumber);

    // Normalize date fields to ISO strings to avoid invalid date on frontend
    const normalized = {
      ...diet,
      tarih:
        (diet as any).tarih instanceof Date
          ? ((diet as any).tarih as Date).toISOString()
          : (diet as any).tarih ?? null,
      createdAt:
        (diet as any).createdAt instanceof Date
          ? ((diet as any).createdAt as Date).toISOString()
          : (diet as any).createdAt,
      updatedAt:
        (diet as any).updatedAt instanceof Date
          ? ((diet as any).updatedAt as Date).toISOString()
          : (diet as any).updatedAt,
      // Ensure client object is preserved with phoneNumber
      client: diet.client ? {
        ...diet.client,
        phoneNumber: diet.client.phoneNumber,
      } : null,
    };

    console.log("🔵 API - Normalized client:", normalized.client);
    console.log("🔵 API - Normalized client phoneNumber:", normalized.client?.phoneNumber);

    return addCorsHeaders(NextResponse.json(normalized));
  } catch (error) {
    console.error("Error fetching diet:", error);
    return addCorsHeaders(
      NextResponse.json({ error: "Failed to fetch diet" }, { status: 500 })
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const { id } = await params;
    const dietId = parseInt(id);

    if (isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid diet ID" }, { status: 400 })
      );
    }

    // SECURITY: Check if dietitian owns this diet
    const hasAccess = await requireOwnDiet(dietId, auth);
    if (!hasAccess) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

      // Parse request body
      let data: any;
      try {
        data = await request.json();
      } catch (parseError) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
          )
        );
      }

      // Resolve every distinct besin/birim name to an id BEFORE the
      // transaction starts. Otherwise each menu item triggers a sequential
      // `connectOrCreate` round-trip inside the interactive transaction and
      // diets with many items blow past Prisma's 5 sn default (P2028).
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

      // Update diet using transaction to ensure consistency
      const updatedDiet = await prisma.$transaction(
        async (tx) => {
          // First, delete all existing oguns (cascade will delete items)
          await tx.ogun.deleteMany({
            where: { dietId },
          });

          // Update diet fields
          const diet = await tx.diet.update({
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
              importantDate: {
                select: {
                  id: true,
                  message: true,
                },
              },
            },
          });

          return diet;
        },
        // Cold-start safety net; the actual work is fast (~1 sn) now that
        // besin/birim are pre-resolved.
        { timeout: 15_000, maxWait: 5_000 }
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
              0
            ),
          },
        })
      );

      // Normalize date fields
      const normalized = {
        ...updatedDiet,
        tarih:
          (updatedDiet as any).tarih instanceof Date
            ? ((updatedDiet as any).tarih as Date).toISOString()
            : (updatedDiet as any).tarih ?? null,
        createdAt:
          (updatedDiet as any).createdAt instanceof Date
            ? ((updatedDiet as any).createdAt as Date).toISOString()
            : (updatedDiet as any).createdAt,
        updatedAt:
          (updatedDiet as any).updatedAt instanceof Date
            ? ((updatedDiet as any).updatedAt as Date).toISOString()
            : (updatedDiet as any).updatedAt,
      };

      return addCorsHeaders(NextResponse.json(normalized));
    } catch (error: any) {
      console.error("Error updating diet:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: error.message || "Failed to update diet" },
          { status: 500 }
        )
      );
    }
  }

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id } = await params;
    const dietId = parseInt(id);

    if (isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid diet ID" }, { status: 400 })
      );
    }

    // SECURITY: Check if dietitian owns this diet
    const hasAccess = await requireOwnDiet(dietId, auth);
    if (!hasAccess) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    await prisma.diet.delete({
      where: { id: dietId },
    });

    return addCorsHeaders(
      NextResponse.json({ message: "Diet deleted successfully" })
    );
  } catch (error: any) {
    console.error("Error deleting diet:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to delete diet" },
        { status: 500 }
      )
    );
  }
}

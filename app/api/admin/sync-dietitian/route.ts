import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/admin/sync-dietitian
 *
 * Creates or updates a dietitian user in the database and assigns all existing clients/diets
 *
 * Body: { supabaseId: string, email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { supabaseId, email } = await request.json();

    if (!supabaseId || !email) {
      return NextResponse.json(
        { error: "supabaseId and email are required" },
        { status: 400 }
      );
    }

    console.log("🚀 Syncing dietitian:", { supabaseId, email });

    // Create or update dietitian user
    const dietitian = await prisma.user.upsert({
      where: { supabaseId },
      update: { email },
      create: {
        supabaseId,
        email,
        role: "dietitian",
      },
    });

    console.log(`✅ Dietitian user created/updated with ID: ${dietitian.id}`);

    // Count existing clients
    const clientCount = await prisma.client.count();
    console.log(`📊 Found ${clientCount} existing clients`);

    // Assign all existing clients without a dietitian to this dietitian
    const clientUpdateResult = await prisma.client.updateMany({
      where: {
        dietitianId: null,
      },
      data: {
        dietitianId: dietitian.id,
      },
    });

    console.log(`✅ Assigned ${clientUpdateResult.count} clients to dietitian`);

    // Count existing diets
    const dietCount = await prisma.diet.count();
    console.log(`📊 Found ${dietCount} existing diets`);

    // Assign all existing diets without a dietitian to this dietitian
    const dietUpdateResult = await prisma.diet.updateMany({
      where: {
        dietitianId: null,
      },
      data: {
        dietitianId: dietitian.id,
      },
    });

    console.log(`✅ Assigned ${dietUpdateResult.count} diets to dietitian`);

    // Verify the assignment
    const assignedClients = await prisma.client.count({
      where: { dietitianId: dietitian.id },
    });

    const assignedDiets = await prisma.diet.count({
      where: { dietitianId: dietitian.id },
    });

    return NextResponse.json({
      success: true,
      dietitian: {
        id: dietitian.id,
        email: dietitian.email,
        supabaseId: dietitian.supabaseId,
      },
      stats: {
        clientsAssigned: clientUpdateResult.count,
        dietsAssigned: dietUpdateResult.count,
        totalClients: assignedClients,
        totalDiets: assignedDiets,
      },
    });
  } catch (error) {
    console.error("❌ Error syncing dietitian:", error);
    return NextResponse.json(
      {
        error: "Failed to sync dietitian",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

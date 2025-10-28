import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { imageData, dietId, ogunId, clientId } = await request.json();

    if (!imageData || !dietId || !ogunId || !clientId) {
      return NextResponse.json(
        {
          error: "Missing required fields: imageData, dietId, ogunId, clientId",
        },
        { status: 400 }
      );
    }

    // Verify diet exists
    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
    });

    if (!diet) {
      return NextResponse.json({ error: "Diet not found" }, { status: 404 });
    }

    // Verify ogun exists and belongs to the diet
    const ogun = await prisma.ogun.findFirst({
      where: { id: ogunId, dietId },
    });

    if (!ogun) {
      return NextResponse.json(
        { error: "Meal not found or doesn't belong to this diet" },
        { status: 404 }
      );
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Set expiration date to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create meal photo record
    const mealPhoto = await prisma.mealPhoto.create({
      data: {
        imageData,
        dietId,
        ogunId,
        clientId,
        expiresAt,
      },
      include: {
        ogun: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      mealPhoto,
    });
  } catch (error: any) {
    console.error("Error creating meal photo:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create meal photo",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dietId = searchParams.get("dietId");
    const ogunId = searchParams.get("ogunId");
    const clientId = searchParams.get("clientId");

    if (!dietId) {
      return NextResponse.json(
        { error: "dietId is required" },
        { status: 400 }
      );
    }

    // Build where clause
    const whereClause: any = { dietId: parseInt(dietId) };

    if (ogunId) {
      whereClause.ogunId = parseInt(ogunId);
    }

    if (clientId) {
      whereClause.clientId = parseInt(clientId);
    }

    const mealPhotos = await prisma.mealPhoto.findMany({
      where: whereClause,
      include: {
        ogun: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      mealPhotos,
    });
  } catch (error: any) {
    console.error("Error fetching meal photos:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch meal photos",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!photoId || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters: id, userId" },
        { status: 400 }
      );
    }

    // Find the meal photo
    const mealPhoto = await prisma.mealPhoto.findUnique({
      where: { id: parseInt(photoId) },
      include: {
        client: true,
      },
    });

    if (!mealPhoto) {
      return NextResponse.json(
        { error: "Meal photo not found" },
        { status: 404 }
      );
    }

    // Check if user is authorized to delete
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: { client: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Allow deletion if:
    // 1. User is a dietitian
    // 2. User is the client who uploaded the photo
    const isAuthorized =
      user.role === "dietitian" ||
      (user.client && user.client.id === mealPhoto.clientId);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized to delete this photo" },
        { status: 403 }
      );
    }

    // Delete the meal photo record
    await prisma.mealPhoto.delete({
      where: { id: parseInt(photoId) },
    });

    // Note: Firebase Storage cleanup should be handled by a background job
    // or by the client before calling this API

    return NextResponse.json({
      success: true,
      message: "Meal photo deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting meal photo:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete meal photo",
      },
      { status: 500 }
    );
  }
}

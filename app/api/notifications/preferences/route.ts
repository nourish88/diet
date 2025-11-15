import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: parseInt(userId) },
    });

    if (!preferences) {
      // Create default preferences if they don't exist
      const newPreferences = await prisma.notificationPreference.create({
        data: {
          userId: parseInt(userId),
          mealReminders: true,
          dietUpdates: true,
          comments: true,
        },
      });

      return NextResponse.json({
        success: true,
        preferences: newPreferences,
      });
    }

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch notification preferences",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, mealReminders, dietUpdates, comments } =
      await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update or create preferences
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        mealReminders: mealReminders !== undefined ? mealReminders : true,
        dietUpdates: dietUpdates !== undefined ? dietUpdates : true,
        comments: comments !== undefined ? comments : true,
      },
      create: {
        userId,
        mealReminders: mealReminders !== undefined ? mealReminders : true,
        dietUpdates: dietUpdates !== undefined ? dietUpdates : true,
        comments: comments !== undefined ? comments : true,
      },
    });

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update notification preferences",
      },
      { status: 500 }
    );
  }
}





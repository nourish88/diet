import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { content, userId, dietId, ogunId, menuItemId } =
      await request.json();

    if (!content || !userId || !dietId) {
      return NextResponse.json(
        { error: "Missing required fields: content, userId, dietId" },
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

    // Verify diet exists
    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
    });

    if (!diet) {
      return NextResponse.json({ error: "Diet not found" }, { status: 404 });
    }

    // If ogunId is provided, verify it exists and belongs to the diet
    if (ogunId) {
      const ogun = await prisma.ogun.findFirst({
        where: { id: ogunId, dietId },
      });

      if (!ogun) {
        return NextResponse.json(
          { error: "Meal not found or doesn't belong to this diet" },
          { status: 404 }
        );
      }
    }

    // If menuItemId is provided, verify it exists and belongs to the diet
    if (menuItemId) {
      const menuItem = await prisma.menuItem.findFirst({
        where: {
          id: menuItemId,
          ogun: { dietId },
        },
      });

      if (!menuItem) {
        return NextResponse.json(
          { error: "Menu item not found or doesn't belong to this diet" },
          { status: 404 }
        );
      }
    }

    // Create comment
    const comment = await prisma.dietComment.create({
      data: {
        content,
        userId,
        dietId,
        ogunId: ogunId || null,
        menuItemId: menuItemId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        ogun: {
          select: {
            id: true,
            name: true,
          },
        },
        menuItem: {
          select: {
            id: true,
            besin: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error: any) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create comment",
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
    const menuItemId = searchParams.get("menuItemId");

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

    if (menuItemId) {
      whereClause.menuItemId = parseInt(menuItemId);
    }

    const comments = await prisma.dietComment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        ogun: {
          select: {
            id: true,
            name: true,
          },
        },
        menuItem: {
          select: {
            id: true,
            besin: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch comments",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!commentId || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters: id, userId" },
        { status: 400 }
      );
    }

    // Find the comment
    const comment = await prisma.dietComment.findUnique({
      where: { id: parseInt(commentId) },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check if user owns the comment or is a dietitian
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only allow deletion if user owns the comment or is a dietitian
    if (comment.userId !== parseInt(userId) && user.role !== "dietitian") {
      return NextResponse.json(
        { error: "Unauthorized to delete this comment" },
        { status: 403 }
      );
    }

    // Delete the comment
    await prisma.dietComment.delete({
      where: { id: parseInt(commentId) },
    });

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete comment",
      },
      { status: 500 }
    );
  }
}


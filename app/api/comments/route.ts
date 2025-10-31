import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";
import { z } from "zod";

// Validation schemas
const createCommentSchema = z.object({
  content: z.string().min(1, "Yorum içeriği gerekli"),
  dietId: z.number().int().positive("Geçerli diyet ID gerekli"),
  ogunId: z.number().int().positive().optional(),
  menuItemId: z.number().int().positive().optional(),
});

const getCommentsSchema = z.object({
  dietId: z.string().transform(Number),
  ogunId: z.string().transform(Number).optional(),
  menuItemId: z.string().transform(Number).optional(),
});

// POST /api/comments - Create a new comment
export const POST = requireAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Verify user owns the diet or is the client
    const diet = await prisma.diet.findFirst({
      where: {
        id: validatedData.dietId,
        OR: [
          { dietitianId: auth.user!.id }, // Dietitian owns the diet
          { client: { userId: auth.user!.id } }, // Client owns the diet
        ],
      },
      include: {
        client: true,
      },
    });

    if (!diet) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Diyet bulunamadı veya erişim yetkiniz yok" },
          { status: 404 }
        )
      );
    }

    // Create comment
    const comment = await prisma.dietComment.create({
      data: {
        content: validatedData.content,
        userId: auth.user!.id,
        dietId: validatedData.dietId,
        ogunId: validatedData.ogunId,
        menuItemId: validatedData.menuItemId,
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

    return addCorsHeaders(
      NextResponse.json({
        comment,
        message: "Yorum başarıyla eklendi",
      })
    );
  } catch (error: any) {
    console.error("Error creating comment:", error);

    if (error instanceof z.ZodError) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Geçersiz veri", details: error.errors },
          { status: 400 }
        )
      );
    }

    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Yorum oluşturulurken bir hata oluştu" },
        { status: 500 }
      )
    );
  }
});

// GET /api/comments - Get comments for a diet
export const GET = requireAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const validatedParams = getCommentsSchema.parse({
      dietId: searchParams.get("dietId"),
      ogunId: searchParams.get("ogunId"),
      menuItemId: searchParams.get("menuItemId"),
    });

    // Verify user has access to the diet
    const diet = await prisma.diet.findFirst({
      where: {
        id: validatedParams.dietId,
        OR: [
          { dietitianId: auth.user!.id }, // Dietitian owns the diet
          { client: { userId: auth.user!.id } }, // Client owns the diet
        ],
      },
    });

    if (!diet) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Diyet bulunamadı veya erişim yetkiniz yok" },
          { status: 404 }
        )
      );
    }

    // Build where clause for comments
    const where: any = {
      dietId: validatedParams.dietId,
    };

    if (validatedParams.ogunId) {
      where.ogunId = validatedParams.ogunId;
    }

    if (validatedParams.menuItemId) {
      where.menuItemId = validatedParams.menuItemId;
    }

    // Get comments
    const comments = await prisma.dietComment.findMany({
      where,
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
        createdAt: "desc",
      },
    });

    return addCorsHeaders(
      NextResponse.json({
        comments,
        total: comments.length,
      })
    );
  } catch (error: any) {
    console.error("Error fetching comments:", error);

    if (error instanceof z.ZodError) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Geçersiz parametreler", details: error.errors },
          { status: 400 }
        )
      );
    }

    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Yorumlar yüklenirken bir hata oluştu" },
        { status: 500 }
      )
    );
  }
});

// DELETE /api/comments - Delete a comment
export const DELETE = requireAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("id");

    if (!commentId) {
      return addCorsHeaders(
        NextResponse.json({ error: "Yorum ID gerekli" }, { status: 400 })
      );
    }

    // Find comment and verify ownership
    const comment = await prisma.dietComment.findFirst({
      where: {
        id: parseInt(commentId),
        userId: auth.user!.id, // Only the author can delete
      },
    });

    if (!comment) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Yorum bulunamadı veya silme yetkiniz yok" },
          { status: 404 }
        )
      );
    }

    // Delete comment
    await prisma.dietComment.delete({
      where: {
        id: comment.id,
      },
    });

    return addCorsHeaders(
      NextResponse.json({
        message: "Yorum başarıyla silindi",
      })
    );
  } catch (error: any) {
    console.error("Error deleting comment:", error);

    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Yorum silinirken bir hata oluştu" },
        { status: 500 }
      )
    );
  }
});

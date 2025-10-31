import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, addCorsHeaders } from "@/lib/api-auth";
import { z } from "zod";

// Validation schemas
const createMealPhotoSchema = z.object({
  imageData: z.string().min(1, "Fotoğraf verisi gerekli"),
  dietId: z.number().int().positive("Geçerli diyet ID gerekli"),
  ogunId: z.number().int().positive("Geçerli öğün ID gerekli"),
  clientId: z.number().int().positive("Geçerli danışan ID gerekli"),
});

const getMealPhotosSchema = z.object({
  dietId: z.string().transform(Number),
  ogunId: z.string().transform(Number).optional(),
  clientId: z.string().transform(Number).optional(),
});

// POST /api/meal-photos - Upload a meal photo
export const POST = requireAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const validatedData = createMealPhotoSchema.parse(body);

    // Verify user has access to the diet
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

    // Verify ogun exists in the diet
    const ogun = await prisma.ogun.findFirst({
      where: {
        id: validatedData.ogunId,
        dietId: validatedData.dietId,
      },
    });

    if (!ogun) {
      return addCorsHeaders(
        NextResponse.json({ error: "Öğün bulunamadı" }, { status: 404 })
      );
    }

    // Set expiration date (2 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2);

    // Create meal photo
    const mealPhoto = await prisma.mealPhoto.create({
      data: {
        imageData: validatedData.imageData,
        dietId: validatedData.dietId,
        ogunId: validatedData.ogunId,
        clientId: validatedData.clientId,
        expiresAt,
      },
      include: {
        diet: {
          select: {
            id: true,
            tarih: true,
          },
        },
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

    return addCorsHeaders(
      NextResponse.json({
        mealPhoto,
        message: "Fotoğraf başarıyla yüklendi",
      })
    );
  } catch (error: any) {
    console.error("Error creating meal photo:", error);

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
        { error: error.message || "Fotoğraf yüklenirken bir hata oluştu" },
        { status: 500 }
      )
    );
  }
});

// GET /api/meal-photos - Get meal photos
export const GET = requireAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const validatedParams = getMealPhotosSchema.parse({
      dietId: searchParams.get("dietId"),
      ogunId: searchParams.get("ogunId"),
      clientId: searchParams.get("clientId"),
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

    // Build where clause for photos
    const where: any = {
      dietId: validatedParams.dietId,
      expiresAt: {
        gt: new Date(), // Only non-expired photos
      },
    };

    if (validatedParams.ogunId) {
      where.ogunId = validatedParams.ogunId;
    }

    if (validatedParams.clientId) {
      where.clientId = validatedParams.clientId;
    }

    // Get meal photos
    const mealPhotos = await prisma.mealPhoto.findMany({
      where,
      include: {
        diet: {
          select: {
            id: true,
            tarih: true,
          },
        },
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

    return addCorsHeaders(
      NextResponse.json({
        mealPhotos,
        total: mealPhotos.length,
      })
    );
  } catch (error: any) {
    console.error("Error fetching meal photos:", error);

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
        { error: error.message || "Fotoğraflar yüklenirken bir hata oluştu" },
        { status: 500 }
      )
    );
  }
});

// DELETE /api/meal-photos - Delete a meal photo
export const DELETE = requireAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("id");

    if (!photoId) {
      return addCorsHeaders(
        NextResponse.json({ error: "Fotoğraf ID gerekli" }, { status: 400 })
      );
    }

    // Find photo and verify access
    const photo = await prisma.mealPhoto.findFirst({
      where: {
        id: parseInt(photoId),
        OR: [
          { client: { userId: auth.user!.id } }, // Client owns the photo
          { diet: { dietitianId: auth.user!.id } }, // Dietitian owns the diet
        ],
      },
    });

    if (!photo) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Fotoğraf bulunamadı veya silme yetkiniz yok" },
          { status: 404 }
        )
      );
    }

    // Delete photo
    await prisma.mealPhoto.delete({
      where: {
        id: photo.id,
      },
    });

    return addCorsHeaders(
      NextResponse.json({
        message: "Fotoğraf başarıyla silindi",
      })
    );
  } catch (error: any) {
    console.error("Error deleting meal photo:", error);

    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Fotoğraf silinirken bir hata oluştu" },
        { status: 500 }
      )
    );
  }
});

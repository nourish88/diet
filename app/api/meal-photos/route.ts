import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import {
  deleteMealPhotoImage,
  storeMealPhotoImage,
} from "@/lib/meal-photo-storage";
import { z } from "zod";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

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

/** POST /api/meal-photos — upload a meal photo (owner client or dietitian). */
export const POST = route({
  auth: "any",
  scope: "meal-photos.create",
  handler: async ({ request, auth, log }) => {
    try {
      const body = await request.json();
      const data = createMealPhotoSchema.parse(body);

      const diet = await prisma.diet.findFirst({
        where: {
          id: data.dietId,
          OR: [
            { dietitianId: auth.user!.id },
            { client: { userId: auth.user!.id } },
          ],
        },
        include: { client: true },
      });
      if (!diet) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Diyet bulunamadı veya erişim yetkiniz yok" },
            { status: 404 },
          ),
        );
      }

      const ogun = await prisma.ogun.findFirst({
        where: { id: data.ogunId, dietId: data.dietId },
      });
      if (!ogun) {
        return addCorsHeaders(
          NextResponse.json({ error: "Öğün bulunamadı" }, { status: 404 }),
        );
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2);

      const storedImageData = await storeMealPhotoImage(data.imageData, {
        clientId: data.clientId,
        dietId: data.dietId,
      });

      const mealPhoto = await prisma.mealPhoto.create({
        data: {
          imageData: storedImageData,
          dietId: data.dietId,
          ogunId: data.ogunId,
          clientId: data.clientId,
          expiresAt,
        },
        include: {
          diet: { select: { id: true, tarih: true } },
          ogun: { select: { id: true, name: true } },
          client: { select: { id: true, name: true, surname: true } },
        },
      });

      return addCorsHeaders(
        NextResponse.json({ mealPhoto, message: "Fotoğraf başarıyla yüklendi" }),
      );
    } catch (err) {
      if (err instanceof z.ZodError) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Geçersiz veri", details: err.errors },
            { status: 400 },
          ),
        );
      }
      log.error("create failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Fotoğraf yüklenirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

/** GET /api/meal-photos — list non-expired photos for an accessible diet. */
export const GET = route({
  auth: "any",
  scope: "meal-photos.list",
  handler: async ({ request, auth, log }) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const params = getMealPhotosSchema.parse({
        dietId: searchParams.get("dietId"),
        ogunId: searchParams.get("ogunId"),
        clientId: searchParams.get("clientId"),
      });

      const diet = await prisma.diet.findFirst({
        where: {
          id: params.dietId,
          OR: [
            { dietitianId: auth.user!.id },
            { client: { userId: auth.user!.id } },
          ],
        },
      });
      if (!diet) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Diyet bulunamadı veya erişim yetkiniz yok" },
            { status: 404 },
          ),
        );
      }

      const where: Prisma.MealPhotoWhereInput = {
        dietId: params.dietId,
        expiresAt: { gt: new Date() },
      };
      if (params.ogunId) where.ogunId = params.ogunId;
      if (params.clientId) where.clientId = params.clientId;

      const mealPhotos = await prisma.mealPhoto.findMany({
        where,
        include: {
          diet: { select: { id: true, tarih: true } },
          ogun: { select: { id: true, name: true } },
          client: { select: { id: true, name: true, surname: true } },
        },
        orderBy: { uploadedAt: "desc" },
      });

      return addCorsHeaders(
        NextResponse.json({ mealPhotos, total: mealPhotos.length }),
      );
    } catch (err) {
      if (err instanceof z.ZodError) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Geçersiz parametreler", details: err.errors },
            { status: 400 },
          ),
        );
      }
      log.error("list failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Fotoğraflar yüklenirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

/** DELETE /api/meal-photos?id= — delete a photo owned by the client or its dietitian. */
export const DELETE = route({
  auth: "any",
  scope: "meal-photos.delete",
  handler: async ({ request, auth, log }) => {
    try {
      const photoId = request.nextUrl.searchParams.get("id");
      if (!photoId) {
        return addCorsHeaders(
          NextResponse.json({ error: "Fotoğraf ID gerekli" }, { status: 400 }),
        );
      }

      const photo = await prisma.mealPhoto.findFirst({
        where: {
          id: parseInt(photoId, 10),
          OR: [
            { client: { userId: auth.user!.id } },
            { diet: { dietitianId: auth.user!.id } },
          ],
        },
      });
      if (!photo) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Fotoğraf bulunamadı veya silme yetkiniz yok" },
            { status: 404 },
          ),
        );
      }

      await deleteMealPhotoImage(photo.imageData).catch((error) => {
        log.error(
          "blob delete failed",
          error instanceof Error ? error.message : error,
        );
      });

      await prisma.mealPhoto.delete({ where: { id: photo.id } });

      return addCorsHeaders(
        NextResponse.json({ message: "Fotoğraf başarıyla silindi" }),
      );
    } catch (err) {
      log.error("delete failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Fotoğraf silinirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

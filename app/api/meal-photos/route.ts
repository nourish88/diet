import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deleteMealPhotoImage,
  storeMealPhotoImage,
} from "@/lib/meal-photo-storage";
import { z } from "zod";
import { route, HttpError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

const CreateMealPhotoBody = z.object({
  imageData: z.string().min(1, "Fotoğraf verisi gerekli"),
  dietId: z.number().int().positive("Geçerli diyet ID gerekli"),
  ogunId: z.number().int().positive("Geçerli öğün ID gerekli"),
  clientId: z.number().int().positive("Geçerli danışan ID gerekli"),
});

const ListQuery = z.object({
  dietId: z.string().transform(Number),
  ogunId: z.string().transform(Number).optional(),
  clientId: z.string().transform(Number).optional(),
});

async function assertDietAccess(dietId: number, userId: number) {
  const diet = await prisma.diet.findFirst({
    where: {
      id: dietId,
      OR: [{ dietitianId: userId }, { client: { userId } }],
    },
    select: { id: true, clientId: true },
  });
  if (!diet) {
    throw new HttpError("not_found", "Diyet bulunamadı veya erişim yetkiniz yok");
  }
  return diet;
}

/** POST /api/meal-photos — upload a meal photo (owner client or dietitian). */
export const POST = route({
  cors: true,
  auth: "any",
  schema: CreateMealPhotoBody,
  scope: "meal-photos.create",
  handler: async ({ body, auth }) => {
    const diet = await assertDietAccess(body.dietId, auth.user!.id);
    if (diet.clientId !== body.clientId) {
      throw new HttpError("bad_request", "Danışan ve diyet eşleşmiyor");
    }

    const ogun = await prisma.ogun.findFirst({
      where: { id: body.ogunId, dietId: body.dietId },
      select: { id: true },
    });
    if (!ogun) {
      throw new HttpError("not_found", "Öğün bulunamadı");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2);

    const storedImageData = await storeMealPhotoImage(body.imageData, {
      clientId: body.clientId,
      dietId: body.dietId,
    });

    const mealPhoto = await prisma.mealPhoto.create({
      data: {
        imageData: storedImageData,
        dietId: body.dietId,
        ogunId: body.ogunId,
        clientId: body.clientId,
        expiresAt,
      },
      include: {
        diet: { select: { id: true, tarih: true } },
        ogun: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, surname: true } },
      },
    });

    return { mealPhoto, message: "Fotoğraf başarıyla yüklendi" };
  },
});

/** GET /api/meal-photos — list non-expired photos for an accessible diet. */
export const GET = route({
  cors: true,
  auth: "any",
  scope: "meal-photos.list",
  handler: async ({ request, auth }) => {
    const sp = request.nextUrl.searchParams;
    const parsed = ListQuery.safeParse({
      dietId: sp.get("dietId"),
      ogunId: sp.get("ogunId") ?? undefined,
      clientId: sp.get("clientId") ?? undefined,
    });
    if (!parsed.success) {
      throw new HttpError("bad_request", "Geçersiz parametreler", parsed.error.flatten());
    }
    const params = parsed.data;
    await assertDietAccess(params.dietId, auth.user!.id);

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

    return { mealPhotos, total: mealPhotos.length };
  },
});

/** DELETE /api/meal-photos?id= — delete a photo owned by the client or its dietitian. */
export const DELETE = route({
  cors: true,
  auth: "any",
  scope: "meal-photos.delete",
  handler: async ({ request, auth, log }) => {
    const photoIdRaw = request.nextUrl.searchParams.get("id");
    if (!photoIdRaw) {
      throw new HttpError("bad_request", "Fotoğraf ID gerekli");
    }
    const photoId = parseInt(photoIdRaw, 10);
    if (!Number.isInteger(photoId) || photoId <= 0) {
      throw new HttpError("bad_request", "Geçersiz fotoğraf ID");
    }

    const photo = await prisma.mealPhoto.findFirst({
      where: {
        id: photoId,
        OR: [
          { client: { userId: auth.user!.id } },
          { diet: { dietitianId: auth.user!.id } },
        ],
      },
    });
    if (!photo) {
      throw new HttpError(
        "not_found",
        "Fotoğraf bulunamadı veya silme yetkiniz yok",
      );
    }

    await deleteMealPhotoImage(photo.imageData).catch((err) => {
      log.error("blob delete failed", err instanceof Error ? err.message : err);
    });
    await prisma.mealPhoto.delete({ where: { id: photo.id } });

    return { message: "Fotoğraf başarıyla silindi" };
  },
});

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

const CreateCommentBody = z.object({
  content: z.string().min(1, "Yorum içeriği gerekli"),
  dietId: z.number().int().positive("Geçerli diyet ID gerekli"),
  ogunId: z.number().int().positive().optional(),
  menuItemId: z.number().int().positive().optional(),
});

const COMMENT_INCLUDE = {
  user: { select: { id: true, email: true, role: true } },
  ogun: { select: { id: true, name: true } },
  menuItem: {
    select: { id: true, besin: { select: { name: true } } },
  },
} satisfies Prisma.DietCommentInclude;

async function assertDietAccess(dietId: number, userId: number) {
  return prisma.diet.findFirst({
    where: {
      id: dietId,
      OR: [{ dietitianId: userId }, { client: { userId } }],
    },
    select: { id: true },
  });
}

/** POST /api/comments — create a comment on a diet/ogun/menu item. */
export const POST = route({
  cors: true,
  auth: "any",
  schema: CreateCommentBody,
  scope: "comments.create",
  handler: async ({ body, auth }) => {
    const diet = await assertDietAccess(body.dietId, auth.user!.id);
    if (!diet) {
      throw new HttpError("not_found", "Diyet bulunamadı veya erişim yetkiniz yok");
    }

    const comment = await prisma.dietComment.create({
      data: {
        content: body.content,
        userId: auth.user!.id,
        dietId: body.dietId,
        ogunId: body.ogunId,
        menuItemId: body.menuItemId,
      },
      include: COMMENT_INCLUDE,
    });

    return { comment, message: "Yorum başarıyla eklendi" };
  },
});

/** GET /api/comments?dietId=&ogunId=&menuItemId= */
export const GET = route({
  cors: true,
  auth: "any",
  scope: "comments.list",
  handler: async ({ request, auth }) => {
    const sp = request.nextUrl.searchParams;
    const dietIdRaw = sp.get("dietId");
    if (!dietIdRaw) {
      throw new HttpError("bad_request", "dietId gerekli");
    }
    const dietId = Number(dietIdRaw);
    if (!Number.isInteger(dietId) || dietId <= 0) {
      throw new HttpError("bad_request", "Geçersiz dietId");
    }

    const diet = await assertDietAccess(dietId, auth.user!.id);
    if (!diet) {
      throw new HttpError("not_found", "Diyet bulunamadı veya erişim yetkiniz yok");
    }

    const where: Prisma.DietCommentWhereInput = { dietId };
    const ogunIdRaw = sp.get("ogunId");
    const menuItemIdRaw = sp.get("menuItemId");
    if (ogunIdRaw) where.ogunId = Number(ogunIdRaw);
    if (menuItemIdRaw) where.menuItemId = Number(menuItemIdRaw);

    const comments = await prisma.dietComment.findMany({
      where,
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return { comments, total: comments.length };
  },
});

/** DELETE /api/comments?id=N — author-only. */
export const DELETE = route({
  cors: true,
  auth: "any",
  scope: "comments.delete",
  handler: async ({ request, auth }) => {
    const commentIdRaw = request.nextUrl.searchParams.get("id");
    if (!commentIdRaw) {
      throw new HttpError("bad_request", "Yorum ID gerekli");
    }
    const commentId = parseInt(commentIdRaw, 10);
    if (!Number.isInteger(commentId) || commentId <= 0) {
      throw new HttpError("bad_request", "Geçersiz yorum ID");
    }

    const comment = await prisma.dietComment.findFirst({
      where: { id: commentId, userId: auth.user!.id },
      select: { id: true },
    });
    if (!comment) {
      throw new HttpError("not_found", "Yorum bulunamadı veya silme yetkiniz yok");
    }

    await prisma.dietComment.delete({ where: { id: comment.id } });
    return { message: "Yorum başarıyla silindi" };
  },
});

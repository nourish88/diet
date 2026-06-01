import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

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
  auth: "any",
  schema: CreateCommentBody,
  scope: "comments.create",
  handler: async ({ body, auth, log }) => {
    try {
      const diet = await assertDietAccess(body.dietId, auth.user!.id);
      if (!diet) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Diyet bulunamadı veya erişim yetkiniz yok" },
            { status: 404 },
          ),
        );
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

      return addCorsHeaders(
        NextResponse.json({ comment, message: "Yorum başarıyla eklendi" }),
      );
    } catch (err) {
      log.error("create failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Yorum oluşturulurken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

/** GET /api/comments?dietId=&ogunId=&menuItemId= */
export const GET = route({
  auth: "any",
  scope: "comments.list",
  handler: async ({ request, auth, log }) => {
    try {
      const sp = request.nextUrl.searchParams;
      const dietIdRaw = sp.get("dietId");
      if (!dietIdRaw) {
        return addCorsHeaders(
          NextResponse.json({ error: "dietId gerekli" }, { status: 400 }),
        );
      }
      const dietId = Number(dietIdRaw);
      if (!Number.isInteger(dietId) || dietId <= 0) {
        return addCorsHeaders(
          NextResponse.json({ error: "Geçersiz dietId" }, { status: 400 }),
        );
      }
      const ogunIdRaw = sp.get("ogunId");
      const menuItemIdRaw = sp.get("menuItemId");

      const diet = await assertDietAccess(dietId, auth.user!.id);
      if (!diet) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Diyet bulunamadı veya erişim yetkiniz yok" },
            { status: 404 },
          ),
        );
      }

      const where: Prisma.DietCommentWhereInput = { dietId };
      if (ogunIdRaw) where.ogunId = Number(ogunIdRaw);
      if (menuItemIdRaw) where.menuItemId = Number(menuItemIdRaw);

      const comments = await prisma.dietComment.findMany({
        where,
        include: COMMENT_INCLUDE,
        orderBy: { createdAt: "desc" },
      });

      return addCorsHeaders(
        NextResponse.json({ comments, total: comments.length }),
      );
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Yorumlar yüklenirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

/** DELETE /api/comments?id=N — author-only. */
export const DELETE = route({
  auth: "any",
  scope: "comments.delete",
  handler: async ({ request, auth, log }) => {
    try {
      const commentIdRaw = request.nextUrl.searchParams.get("id");
      if (!commentIdRaw) {
        return addCorsHeaders(
          NextResponse.json({ error: "Yorum ID gerekli" }, { status: 400 }),
        );
      }
      const commentId = parseInt(commentIdRaw, 10);
      if (!Number.isInteger(commentId) || commentId <= 0) {
        return addCorsHeaders(
          NextResponse.json({ error: "Geçersiz yorum ID" }, { status: 400 }),
        );
      }

      const comment = await prisma.dietComment.findFirst({
        where: { id: commentId, userId: auth.user!.id },
        select: { id: true },
      });
      if (!comment) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Yorum bulunamadı veya silme yetkiniz yok" },
            { status: 404 },
          ),
        );
      }

      await prisma.dietComment.delete({ where: { id: comment.id } });
      return addCorsHeaders(NextResponse.json({ message: "Yorum başarıyla silindi" }));
    } catch (err) {
      log.error("delete failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Yorum silinirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

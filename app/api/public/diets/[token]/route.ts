import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

type Params = { token: string };

export const dynamic = "force-dynamic";

export const GET = route<undefined, Params>({
  auth: "none",
  scope: "public.diet.get",
  handler: async ({ params }) => {
    const shareLink = await prisma.dietShareLink.findUnique({
      where: { token: params.token },
      include: {
        diet: {
          include: {
            client: { select: { name: true, surname: true } },
            dietitian: { select: { name: true, email: true } },
            importantDate: { select: { id: true, name: true, message: true } },
            oguns: {
              orderBy: { order: "asc" },
              include: {
                items: {
                  orderBy: { id: "asc" },
                  include: {
                    besin: { select: { id: true, name: true } },
                    birim: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!shareLink) {
      throw new HttpError("not_found", "Paylaşım linki bulunamadı.");
    }

    await prisma.$transaction([
      prisma.dietShareLink.update({
        where: { id: shareLink.id },
        data: { lastAccessedAt: new Date() },
      }),
      prisma.diet.update({
        where: { id: shareLink.dietId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);

    return {
      diet: shareLink.diet,
      dietitian: shareLink.diet.dietitian,
    };
  },
});

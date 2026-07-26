import { after } from "next/server";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

type Params = { token: string };

export const dynamic = "force-dynamic";

// Public share links are read far more often than the underlying diet changes,
// so cache the (heavy, deeply-included) read per token for a short window. A diet
// edit propagates within the TTL; view-tracking writes still run on every request.
const getShareLinkByToken = (token: string) =>
  unstable_cache(
    () =>
      prisma.dietShareLink.findUnique({
        where: { token },
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
      }),
    ["public-diet-share", token],
    { revalidate: 60, tags: [`public-diet:${token}`] },
  )();

export const GET = route<undefined, Params>({
  auth: "none",
  scope: "public.diet.get",
  handler: async ({ params }) => {
    const shareLink = await getShareLinkByToken(params.token);

    if (!shareLink) {
      throw new HttpError("not_found", "Paylaşım linki bulunamadı.");
    }

    // View tracking is analytics-only and nothing in the response depends on it,
    // so run it after the response instead of blocking the reader on two writes.
    after(() =>
      prisma
        .$transaction([
          prisma.dietShareLink.update({
            where: { id: shareLink.id },
            data: { lastAccessedAt: new Date() },
          }),
          prisma.diet.update({
            where: { id: shareLink.dietId },
            data: { viewCount: { increment: 1 } },
          }),
        ])
        .catch(() => {
          /* tracking is best-effort */
        }),
    );

    return {
      diet: shareLink.diet,
      dietitian: shareLink.diet.dietitian,
    };
  },
});

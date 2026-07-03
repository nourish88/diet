import { z } from "zod";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

type Params = { token: string };

const Body = z.object({
  event: z.enum(["download"]),
});

export const POST = route<typeof Body, Params>({
  auth: "none",
  schema: Body,
  scope: "public.diet.track",
  handler: async ({ params }) => {
    const shareLink = await prisma.dietShareLink.findUnique({
      where: { token: params.token },
      select: { dietId: true },
    });
    if (!shareLink) {
      throw new HttpError("not_found", "Paylaşım linki bulunamadı.");
    }

    const diet = await prisma.diet.update({
      where: { id: shareLink.dietId },
      data: { downloadCount: { increment: 1 } },
      select: { id: true, downloadCount: true },
    });

    return diet;
  },
});

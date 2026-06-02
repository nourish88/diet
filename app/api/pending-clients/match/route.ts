import { z } from "zod";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

const Body = z.object({
  referenceCode: z.string().min(1),
  clientId: z.coerce.number().int().positive(),
});

/** POST /api/pending-clients/match — link a pending user to a client and approve (dietitian only). */
export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: Body,
  scope: "pending-clients.match",
  handler: async ({ body }) => {
    const user = await prisma.user.findUnique({
      where: { referenceCode: body.referenceCode },
    });
    if (!user) throw new HttpError("not_found", "Invalid reference code");
    if (user.isApproved) {
      throw new HttpError("bad_request", "User already approved");
    }

    const existingClient = await prisma.client.findUnique({
      where: { id: body.clientId },
      select: { userId: true },
    });
    if (existingClient?.userId) {
      throw new HttpError(
        "bad_request",
        "Client is already linked to another user",
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { isApproved: true, approvedAt: new Date() },
      }),
      prisma.client.update({
        where: { id: body.clientId },
        data: { userId: user.id },
      }),
    ]);

    return {
      success: true,
      message: "Client matched and approved successfully",
    };
  },
});

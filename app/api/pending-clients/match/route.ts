import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

const Body = z.object({
  referenceCode: z.string().min(1),
  clientId: z.coerce.number().int().positive(),
});

/** POST /api/pending-clients/match — link a pending user to a client and approve (dietitian only). */
export const POST = route({
  auth: "dietitian",
  schema: Body,
  scope: "pending-clients.match",
  handler: async ({ body, log }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { referenceCode: body.referenceCode },
      });
      if (!user) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid reference code" }, { status: 404 }),
        );
      }
      if (user.isApproved) {
        return addCorsHeaders(
          NextResponse.json({ error: "User already approved" }, { status: 400 }),
        );
      }

      const existingClient = await prisma.client.findUnique({
        where: { id: body.clientId },
        select: { userId: true },
      });
      if (existingClient?.userId) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Client is already linked to another user" },
            { status: 400 },
          ),
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

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          message: "Client matched and approved successfully",
        }),
      );
    } catch (err) {
      log.error("match failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to match user" }, { status: 500 }),
      );
    }
  },
});

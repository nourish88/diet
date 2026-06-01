import { NextResponse } from "next/server";
import { z } from "zod";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";
import { markAsCongratulated } from "@/services/BirthdayService";

const Body = z.object({
  clientId: z.number().int().positive(),
});

/** POST /api/birthdays/congratulate — mark a client as congratulated today (dietitian only). */
export const POST = route({
  auth: "dietitian",
  schema: Body,
  scope: "birthdays.congratulate",
  handler: async ({ body, auth, log }) => {
    try {
      await markAsCongratulated(body.clientId, auth.user!.id);
      return addCorsHeaders(NextResponse.json({ success: true }));
    } catch (err) {
      log.error("congratulate failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Internal server error" },
          { status: 500 },
        ),
      );
    }
  },
});

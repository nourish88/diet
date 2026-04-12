import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";
import { markAsCongratulated } from "@/services/BirthdayService";
import { z } from "zod";

const schema = z.object({
  clientId: z.number().int().positive(),
});

/**
 * POST /api/birthdays/congratulate
 *
 * Mark a client as congratulated today.
 * Prevents repeat push notification retries for already-congratulated clients.
 * Auth: Dietitian only
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    if (auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Invalid request", details: parsed.error.issues },
          { status: 400 }
        )
      );
    }

    await markAsCongratulated(parsed.data.clientId, auth.user.id);

    return addCorsHeaders(NextResponse.json({ success: true }));
  } catch (error: any) {
    console.error("❌ Congratulate error:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error?.message || "Internal server error" },
        { status: 500 }
      )
    );
  }
}

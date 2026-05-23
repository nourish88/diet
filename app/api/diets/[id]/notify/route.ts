import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult, requireOwnDiet } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import { notifyClientOfNewDiet } from "@/services/DietNotificationService";
import { sendMealReminderForOgun } from "@/services/MealReminderService";

export const dynamic = "force-dynamic";

type NotifyBody =
  | { type: "new-diet" }
  | { type: "meal-reminder"; ogunId: number };

function reasonToMessage(reason?: string): string {
  switch (reason) {
    case "no-subscriptions":
      return "Danışan henüz bildirim aboneliği yapmamış.";
    case "preference-disabled":
      return "Danışan bildirim tercihini kapatmış.";
    case "no-user":
      return "Danışana ait kullanıcı hesabı bulunamadı.";
    case "diet-not-found":
      return "Diyet bulunamadı.";
    case "ogun-not-found":
      return "Öğün bulunamadı.";
    case "push-not-configured":
      return "Sunucuda push bildirim ayarları eksik.";
    case "ogun-mismatch":
      return "Seçilen öğün bu diyete ait değil.";
    default:
      return "Bildirim gönderilemedi.";
  }
}

export const OPTIONS = async (request: NextRequest) => {
  const corsResponse = handleCors(request);
  return corsResponse ?? new NextResponse(null, { status: 204 });
};

/**
 * GET — used by the dietitian-side NotificationTestPanel to display whether
 * the client currently has any active push subscriptions, so we can disable
 * the buttons preemptively with a clear reason instead of waiting for a
 * failed send.
 */
export const GET = requireDietitian(
  async (
    request: NextRequest,
    auth: AuthResult,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const { id } = await params;
    const dietId = Number.parseInt(id, 10);
    if (Number.isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ ok: false, error: "Invalid diet id" }, { status: 400 })
      );
    }

    const ownsDiet = await requireOwnDiet(dietId, auth);
    if (!ownsDiet) {
      return addCorsHeaders(
        NextResponse.json(
          { ok: false, error: "Access denied to this diet" },
          { status: 403 }
        )
      );
    }

    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      include: {
        client: {
          include: {
            user: {
              include: {
                notificationPreference: true,
                pushSubscriptions: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!diet) {
      return addCorsHeaders(
        NextResponse.json(
          { ok: false, error: "Diet not found" },
          { status: 404 }
        )
      );
    }

    const user = diet.client.user;
    const subscriptionCount = user?.pushSubscriptions.length ?? 0;
    const dietUpdatesEnabled =
      user?.notificationPreference?.dietUpdates ?? true;
    const mealRemindersEnabled =
      user?.notificationPreference?.mealReminders ?? true;

    return addCorsHeaders(
      NextResponse.json({
        ok: true,
        hasUser: Boolean(user),
        subscriptionCount,
        dietUpdatesEnabled,
        mealRemindersEnabled,
      })
    );
  }
);

export const POST = requireDietitian(
  async (
    request: NextRequest,
    auth: AuthResult,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const { id } = await params;
    const dietId = Number.parseInt(id, 10);
    if (Number.isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ ok: false, error: "Invalid diet id" }, { status: 400 })
      );
    }

    // SECURITY: the dietitian must own this diet.
    const ownsDiet = await requireOwnDiet(dietId, auth);
    if (!ownsDiet) {
      return addCorsHeaders(
        NextResponse.json(
          { ok: false, error: "Access denied to this diet" },
          { status: 403 }
        )
      );
    }

    let body: NotifyBody;
    try {
      body = (await request.json()) as NotifyBody;
    } catch {
      return addCorsHeaders(
        NextResponse.json(
          { ok: false, error: "Invalid request body" },
          { status: 400 }
        )
      );
    }

    if (body.type === "new-diet") {
      const result = await notifyClientOfNewDiet(dietId, { force: true });
      return addCorsHeaders(
        NextResponse.json(
          {
            ok: result.ok,
            sent: result.sent,
            failed: result.failed,
            ...(result.reason
              ? { code: result.reason, message: reasonToMessage(result.reason) }
              : {}),
          },
          { status: result.ok ? 200 : 400 }
        )
      );
    }

    if (body.type === "meal-reminder") {
      const ogunId = Number(body.ogunId);
      if (!Number.isInteger(ogunId) || ogunId <= 0) {
        return addCorsHeaders(
          NextResponse.json(
            { ok: false, error: "ogunId is required" },
            { status: 400 }
          )
        );
      }

      // Make sure the ogun belongs to the diet the dietitian owns.
      const ogun = await prisma.ogun.findUnique({
        where: { id: ogunId },
        select: { dietId: true },
      });
      if (!ogun || ogun.dietId !== dietId) {
        return addCorsHeaders(
          NextResponse.json(
            {
              ok: false,
              code: "ogun-mismatch",
              message: reasonToMessage("ogun-mismatch"),
            },
            { status: 400 }
          )
        );
      }

      const result = await sendMealReminderForOgun(ogunId);
      return addCorsHeaders(
        NextResponse.json(
          {
            ok: result.ok,
            sent: result.sent,
            failed: result.failed,
            ...(result.reason
              ? { code: result.reason, message: reasonToMessage(result.reason) }
              : {}),
          },
          { status: result.ok ? 200 : 400 }
        )
      );
    }

    return addCorsHeaders(
      NextResponse.json(
        { ok: false, error: "Unknown notify type" },
        { status: 400 }
      )
    );
  }
);

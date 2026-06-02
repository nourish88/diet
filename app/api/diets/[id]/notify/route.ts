import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireOwnDiet } from "@/lib/api-auth";
import { handleCors } from "@/lib/cors";
import { notifyClientOfNewDiet } from "@/services/DietNotificationService";
import { sendMealReminderForOgun } from "@/services/MealReminderService";
import { route, HttpError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

type Params = { id: string };

const NotifyBody = z.discriminatedUnion("type", [
  z.object({ type: z.literal("new-diet") }),
  z.object({
    type: z.literal("meal-reminder"),
    ogunId: z.coerce.number().int().positive(),
  }),
]);

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

function parseDietId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (Number.isNaN(id)) throw new HttpError("bad_request", "Invalid diet id");
  return id;
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
export const GET = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "diets.notify.status",
  handler: async ({ params, auth }) => {
    const dietId = parseDietId(params.id);
    if (!(await requireOwnDiet(dietId, auth))) {
      throw new HttpError("forbidden", "Access denied to this diet");
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
    if (!diet) throw new HttpError("not_found", "Diet not found");

    const user = diet.client.user;
    return {
      ok: true,
      hasUser: Boolean(user),
      subscriptionCount: user?.pushSubscriptions.length ?? 0,
      dietUpdatesEnabled: user?.notificationPreference?.dietUpdates ?? true,
      mealRemindersEnabled: user?.notificationPreference?.mealReminders ?? true,
    };
  },
});

export const POST = route<typeof NotifyBody, Params>({
  cors: true,
  auth: "dietitian",
  schema: NotifyBody,
  scope: "diets.notify.send",
  handler: async ({ body, params, auth }) => {
    const dietId = parseDietId(params.id);
    if (!(await requireOwnDiet(dietId, auth))) {
      throw new HttpError("forbidden", "Access denied to this diet");
    }

    if (body.type === "new-diet") {
      const result = await notifyClientOfNewDiet(dietId, { force: true });
      if (!result.ok) {
        throw new HttpError(
          "bad_request",
          reasonToMessage(result.reason),
          {
            ok: false,
            sent: result.sent,
            failed: result.failed,
            code: result.reason,
          },
        );
      }
      return {
        ok: true,
        sent: result.sent,
        failed: result.failed,
        ...(result.reason
          ? { code: result.reason, message: reasonToMessage(result.reason) }
          : {}),
      };
    }

    // meal-reminder
    const ogun = await prisma.ogun.findUnique({
      where: { id: body.ogunId },
      select: { dietId: true },
    });
    if (!ogun || ogun.dietId !== dietId) {
      throw new HttpError(
        "bad_request",
        reasonToMessage("ogun-mismatch"),
        { ok: false, code: "ogun-mismatch" },
      );
    }

    const result = await sendMealReminderForOgun(body.ogunId);
    if (!result.ok) {
      throw new HttpError(
        "bad_request",
        reasonToMessage(result.reason),
        {
          ok: false,
          sent: result.sent,
          failed: result.failed,
          code: result.reason,
        },
      );
    }
    return {
      ok: true,
      sent: result.sent,
      failed: result.failed,
      ...(result.reason
        ? { code: result.reason, message: reasonToMessage(result.reason) }
        : {}),
    };
  },
});

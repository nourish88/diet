import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { handleCors } from "@/lib/cors";
import { route, HttpError } from "@/lib/api/handler";
import {
  getOfficeSocialMediaTask,
  officeSocialMediaTasks,
} from "@/lib/office-social-media-plan";
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/web-push";

export const dynamic = "force-dynamic";

const TriggerBody = z.object({
  taskId: z.string().min(1),
});

export const OPTIONS = async (request: NextRequest) => {
  const corsResponse = handleCors(request);
  return corsResponse ?? new NextResponse(null, { status: 204 });
};

export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "office-reminders.status",
  handler: async ({ auth }) => {
    const subscriptionCount = await prisma.pushSubscription.count({
      where: { userId: auth.user!.id },
    });
    return {
      ok: true,
      configured: isWebPushConfigured(),
      subscriptionCount,
    };
  },
});

export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: TriggerBody,
  scope: "office-reminders.trigger",
  handler: async ({ body, auth, log }) => {
    const task = getOfficeSocialMediaTask(body.taskId);
    if (!task) {
      throw new HttpError("bad_request", "Hatırlatıcı bulunamadı.", {
        availableTaskIds: officeSocialMediaTasks.map((t) => t.id),
      });
    }
    if (!isWebPushConfigured()) {
      throw new HttpError(
        "internal",
        "Sunucuda web push ayarları eksik.",
        { code: "push-not-configured" },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user!.id },
      select: {
        pushSubscriptions: {
          select: { id: true, endpoint: true, auth: true, p256dh: true },
        },
      },
    });
    if (!user || user.pushSubscriptions.length === 0) {
      throw new HttpError(
        "bad_request",
        "Bu diyetisyen hesabına kayıtlı PWA bildirim aboneliği bulunamadı.",
        { code: "no-subscriptions" },
      );
    }

    let sent = 0;
    let failed = 0;
    const dateKey = new Date().toISOString().slice(0, 10);

    for (const sub of user.pushSubscriptions) {
      try {
        await sendWebPushNotification(
          {
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh },
          },
          {
            title: task.reminderTitle,
            body: task.reminderBody,
            url: "/",
            tag: `office-social-${task.id}-${dateKey}`,
            requireInteraction: true,
            data: {
              type: "office_social_media_reminder",
              taskId: task.id,
              url: "/",
            },
          },
        );
        sent++;
      } catch (err) {
        failed++;
        log.warn("push failed", { subscriptionId: sub.id });
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
        }
      }
    }

    return {
      ok: sent > 0,
      sent,
      failed,
      message:
        sent > 0
          ? "Ofis hatırlatıcısı telefon bildirimlerine gönderildi."
          : "Hatırlatıcı gönderilemedi.",
    };
  },
});

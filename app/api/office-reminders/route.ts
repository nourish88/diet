import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import { route } from "@/lib/api/handler";
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
  auth: "dietitian",
  scope: "office-reminders.status",
  handler: async ({ auth }) => {
    const subscriptionCount = await prisma.pushSubscription.count({
      where: { userId: auth.user!.id },
    });
    return addCorsHeaders(
      NextResponse.json({
        ok: true,
        configured: isWebPushConfigured(),
        subscriptionCount,
      }),
    );
  },
});

export const POST = route({
  auth: "dietitian",
  schema: TriggerBody,
  scope: "office-reminders.trigger",
  handler: async ({ body, auth, log }) => {
    const task = getOfficeSocialMediaTask(body.taskId);
    if (!task) {
      return addCorsHeaders(
        NextResponse.json(
          {
            ok: false,
            message: "Hatırlatıcı bulunamadı.",
            availableTaskIds: officeSocialMediaTasks.map((t) => t.id),
          },
          { status: 400 },
        ),
      );
    }

    if (!isWebPushConfigured()) {
      return addCorsHeaders(
        NextResponse.json(
          {
            ok: false,
            code: "push-not-configured",
            message: "Sunucuda web push ayarları eksik.",
          },
          { status: 503 },
        ),
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
      return addCorsHeaders(
        NextResponse.json(
          {
            ok: false,
            code: "no-subscriptions",
            message:
              "Bu diyetisyen hesabına kayıtlı PWA bildirim aboneliği bulunamadı.",
          },
          { status: 400 },
        ),
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

    return addCorsHeaders(
      NextResponse.json({
        ok: sent > 0,
        sent,
        failed,
        message:
          sent > 0
            ? "Ofis hatırlatıcısı telefon bildirimlerine gönderildi."
            : "Hatırlatıcı gönderilemedi.",
      }),
    );
  },
});

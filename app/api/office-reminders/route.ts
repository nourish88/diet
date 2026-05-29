import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import {
  getOfficeSocialMediaTask,
  officeSocialMediaTasks,
} from "@/lib/office-social-media-plan";
import {
  isWebPushConfigured,
  sendWebPushNotification,
} from "@/lib/web-push";

export const dynamic = "force-dynamic";

export const OPTIONS = async (request: NextRequest) => {
  const corsResponse = handleCors(request);
  return corsResponse ?? new NextResponse(null, { status: 204 });
};

export const GET = requireDietitian(async (request: NextRequest, auth: AuthResult) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const userId = auth.user!.id;
  const subscriptionCount = await prisma.pushSubscription.count({
    where: { userId },
  });

  return addCorsHeaders(
    NextResponse.json({
      ok: true,
      configured: isWebPushConfigured(),
      subscriptionCount,
    })
  );
});

export const POST = requireDietitian(async (request: NextRequest, auth: AuthResult) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  let body: { taskId?: string };
  try {
    body = (await request.json()) as { taskId?: string };
  } catch {
    return addCorsHeaders(
      NextResponse.json(
        { ok: false, message: "Geçersiz istek gövdesi." },
        { status: 400 }
      )
    );
  }

  const task = body.taskId ? getOfficeSocialMediaTask(body.taskId) : null;
  if (!task) {
    return addCorsHeaders(
      NextResponse.json(
        {
          ok: false,
          message: "Hatırlatıcı bulunamadı.",
          availableTaskIds: officeSocialMediaTasks.map((item) => item.id),
        },
        { status: 400 }
      )
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
        { status: 503 }
      )
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user!.id },
    select: {
      pushSubscriptions: {
        select: {
          id: true,
          endpoint: true,
          auth: true,
          p256dh: true,
        },
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
        { status: 400 }
      )
    );
  }

  let sent = 0;
  let failed = 0;
  const dateKey = new Date().toISOString().slice(0, 10);

  for (const subscription of user.pushSubscriptions) {
    try {
      await sendWebPushNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.auth,
            p256dh: subscription.p256dh,
          },
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
        }
      );
      sent++;
    } catch (error: any) {
      failed++;
      console.error(
        `Office reminder push failed for subscription ${subscription.id}:`,
        error
      );

      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await prisma.pushSubscription
          .delete({ where: { id: subscription.id } })
          .catch((deleteError) => {
            console.error(
              `Failed to delete invalid push subscription ${subscription.id}:`,
              deleteError
            );
          });
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
    })
  );
});

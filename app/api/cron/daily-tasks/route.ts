import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { officeSocialMediaTasks } from "@/lib/office-social-media-plan";
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/web-push";

const TURKISH_DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  // Today's weekday in Turkey (UTC+3)
  const nowUtc = Date.now();
  const nowTr = new Date(nowUtc + 3 * 60 * 60 * 1000);
  const todayTurkish = TURKISH_DAYS[nowTr.getUTCDay()];
  const dateKey = nowTr.toISOString().slice(0, 10);

  const todayTasks = officeSocialMediaTasks.filter(
    (t) => t.group === "weekly" && t.day === todayTurkish
  );

  if (todayTasks.length === 0) {
    return NextResponse.json({ message: `${todayTurkish} için görev bulunamadı`, sent: 0 });
  }

  const task = todayTasks[0];

  // Find all dietitian users with push subscriptions
  const dietitians = await prisma.user.findMany({
    where: { role: "dietitian", pushSubscriptions: { some: {} } },
    select: { pushSubscriptions: { select: { id: true, endpoint: true, auth: true, p256dh: true } } },
  });

  let sent = 0;
  let failed = 0;

  for (const dietitian of dietitians) {
    for (const sub of dietitian.pushSubscriptions) {
      try {
        await sendWebPushNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          {
            title: task.reminderTitle,
            body: task.reminderBody,
            url: "/daily-tasks",
            tag: `daily-tasks-${dateKey}`,
            requireInteraction: true,
            data: { type: "daily_tasks_reminder", taskId: task.id, url: "/daily-tasks" },
          }
        );
        sent++;
      } catch (error: any) {
        failed++;
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json({ success: true, day: todayTurkish, taskId: task.id, sent, failed });
}

export const POST = GET;

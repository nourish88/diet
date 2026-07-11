import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

async function ownedRecipient(userId: number, id: number) {
  const client = await prisma.client.findUnique({ where: { userId }, select: { id: true } });
  if (!client) return null;
  return prisma.broadcastRecipient.findFirst({
    where: { id, clientId: client.id },
    select: {
      id: true,
      isRead: true,
      readAt: true,
      createdAt: true,
      broadcastMessage: {
        select: { id: true, title: true, message: true, dietitianName: true, createdAt: true },
      },
    },
  });
}

export const GET = route<undefined, { id: string }>({
  auth: "client",
  scope: "client.notifications.detail",
  handler: async ({ auth, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError("bad_request", "Geçersiz bildirim.");
    const notification = await ownedRecipient(auth.user!.id, id);
    if (!notification) throw new HttpError("not_found", "Bildirim bulunamadı.");

    if (!notification.isRead) {
      await prisma.broadcastRecipient.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      });
    }
    return {
      notification: {
        ...notification,
        isRead: true,
        readAt: notification.readAt ?? new Date(),
      },
    };
  },
});

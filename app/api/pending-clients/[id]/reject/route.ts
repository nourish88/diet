import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

type Params = { id: string };

/** DELETE /api/pending-clients/[id]/reject — reject (delete) a pending user (dietitian only). */
export const DELETE = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "pending-clients.reject",
  handler: async ({ params }) => {
    const userId = parseInt(params.id, 10);
    if (Number.isNaN(userId)) {
      throw new HttpError("bad_request", "Geçersiz kullanıcı ID");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError("not_found", "Kullanıcı bulunamadı");
    if (user.isApproved) {
      throw new HttpError(
        "bad_request",
        "Bu kullanıcı zaten onaylanmış, silinemez",
      );
    }

    await prisma.user.delete({ where: { id: userId } });
    return { message: "Bekleyen kayıt başarıyla reddedildi" };
  },
});

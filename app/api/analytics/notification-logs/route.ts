import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = requireDietitian(async (request, auth) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      orderBy: {
        sentAt: "desc",
      },
      take: 100, // Son 100 kaydı getir (3 günde bir temizleneceği için yeterli olur)
      include: {
        client: {
          select: {
            name: true,
            surname: true,
          }
        },
        ogun: {
          select: {
            name: true,
            time: true,
          }
        }
      }
    });

    return NextResponse.json({ ok: true, logs });
  } catch (error: any) {
    console.error("Failed to fetch notification logs:", error);
    return NextResponse.json(
      { ok: false, error: "Loglar getirilemedi." },
      { status: 500 }
    );
  }
});

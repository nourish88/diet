import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOwnClient } from "@/lib/api-auth";
import { route, HttpError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

type Params = { id: string };

/** GET /api/clients/[id]/consents — KVKK consent records, JSON or CSV (dietitian, owner). */
export const GET = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "clients.consents",
  handler: async ({ request, params, auth }) => {
    const clientId = parseInt(params.id, 10);
    if (Number.isNaN(clientId)) {
      throw new HttpError("bad_request", "Invalid client ID");
    }
    if (!(await requireOwnClient(clientId, auth))) {
      throw new HttpError("forbidden", "Access denied");
    }

    const records = await prisma.clientConsentRecord.findMany({
      where: { clientId },
      orderBy: { acceptedAt: "desc" },
      select: {
        id: true,
        consentVersion: true,
        consentType: true,
        acceptedAt: true,
        channel: true,
        userAgent: true,
        ipHash: true,
        userId: true,
      },
    });

    if (request.nextUrl.searchParams.get("format") === "csv") {
      const header = [
        "id",
        "consentVersion",
        "consentType",
        "acceptedAt",
        "channel",
        "userId",
        "ipHash",
        "userAgent",
      ].join(",");
      const lines = records.map((r) =>
        [
          r.id,
          r.consentVersion,
          r.consentType,
          r.acceptedAt.toISOString(),
          r.channel,
          r.userId,
          r.ipHash ?? "",
          `"${(r.userAgent ?? "").replace(/"/g, '""')}"`,
        ].join(","),
      );
      const csv = [header, ...lines].join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="client-${clientId}-kvkk-consents.csv"`,
        },
      });
    }

    return { records };
  },
});

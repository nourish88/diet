import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  authenticateRequest,
  requireOwnClient,
} from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id } = await params;
    const clientId = parseInt(id, 10);
    if (Number.isNaN(clientId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
      );
    }

    const hasAccess = await requireOwnClient(clientId, auth);
    if (!hasAccess) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
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

    const format = request.nextUrl.searchParams.get("format");
    if (format === "csv") {
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
        ].join(",")
      );
      const csv = [header, ...lines].join("\n");
      return addCorsHeaders(
        new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="client-${clientId}-kvkk-consents.csv"`,
          },
        })
      );
    }

    return addCorsHeaders(NextResponse.json({ records }));
  } catch (error: unknown) {
    console.error("GET consents error:", error);
    return addCorsHeaders(
      NextResponse.json({ error: "Failed to load consents" }, { status: 500 })
    );
  }
}

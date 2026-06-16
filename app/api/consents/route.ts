import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/consents — KVKK consent audit log across all of the dietitian's
 * clients, JSON or CSV. One row per consent record. Optional `?search=` filters
 * by client name/surname; `?format=csv` returns a downloadable file.
 */
export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "clients.consents",
  handler: async ({ request, auth }) => {
    // For assistants, auth.user.id already resolves to the parent dietitian.
    const dietitianId = auth.user!.id;
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";

    const tokens = search.split(/\s+/).filter((t) => t.length > 0);
    const clientFilter =
      tokens.length > 0
        ? {
            AND: tokens.map((token) => ({
              OR: [
                { name: { contains: token, mode: "insensitive" as const } },
                { surname: { contains: token, mode: "insensitive" as const } },
              ],
            })),
          }
        : {};

    const records = await prisma.clientConsentRecord.findMany({
      where: { client: { dietitianId, ...clientFilter } },
      orderBy: { acceptedAt: "desc" },
      select: {
        id: true,
        clientId: true,
        consentVersion: true,
        consentType: true,
        acceptedAt: true,
        channel: true,
        userAgent: true,
        ipHash: true,
        userId: true,
        client: { select: { name: true, surname: true } },
      },
    });

    const rows = records.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      clientName: `${r.client.name} ${r.client.surname}`.trim(),
      consentVersion: r.consentVersion,
      consentType: r.consentType,
      acceptedAt: r.acceptedAt,
      channel: r.channel,
      userAgent: r.userAgent,
      ipHash: r.ipHash,
      userId: r.userId,
    }));

    if (request.nextUrl.searchParams.get("format") === "csv") {
      const header = [
        "id",
        "clientId",
        "clientName",
        "consentType",
        "consentVersion",
        "acceptedAt",
        "channel",
        "userId",
        "ipHash",
        "userAgent",
      ].join(",");
      const lines = rows.map((r) =>
        [
          r.id,
          r.clientId,
          `"${r.clientName.replace(/"/g, '""')}"`,
          r.consentType,
          r.consentVersion,
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
          "Content-Disposition": `attachment; filename="kvkk-consents.csv"`,
        },
      });
    }

    return { records: rows };
  },
});

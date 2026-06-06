import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";

export const dynamic = "force-dynamic";

function computeRange(timeRange: string) {
  const now = new Date();
  if (timeRange === "24h") {
    return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
  }
  if (timeRange === "7d") {
    return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
  }
  if (timeRange === "30d") {
    return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
  }
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: now,
  };
}

export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "analytics.stats-details",
  handler: async ({ request, auth }) => {
    const dietitianId = auth.user!.id;
    const sp = request.nextUrl.searchParams;
    const type = sp.get("type");
    const timeRange = sp.get("timeRange") || "current_month";
    const { start, end } = computeRange(timeRange);

    if (type === "diets") {
      const diets = await prisma.diet.findMany({
        where: { dietitianId, createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          createdAt: true,
          tarih: true,
          client: { select: { id: true, name: true, surname: true } },
        },
      });
      return ok({
        type,
        items: diets.map((d) => ({
          id: d.id,
          createdAt: d.createdAt,
          tarih: d.tarih,
          clientId: d.client?.id ?? null,
          clientName: d.client ? `${d.client.name} ${d.client.surname}` : "-",
        })),
      });
    }

    if (type === "clients") {
      const clients = await prisma.client.findMany({
        where: { dietitianId, createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          name: true,
          surname: true,
          phoneNumber: true,
          createdAt: true,
        },
      });
      return ok({
        type,
        items: clients.map((c) => ({
          id: c.id,
          name: `${c.name} ${c.surname}`,
          phoneNumber: c.phoneNumber,
          createdAt: c.createdAt,
        })),
      });
    }

    if (type === "kvkk") {
      const clients = await prisma.client.findMany({
        where: {
          dietitianId,
          kvkkPortalConsentAt: { gte: start, lte: end },
        },
        orderBy: { kvkkPortalConsentAt: "desc" },
        take: 200,
        select: {
          id: true,
          name: true,
          surname: true,
          kvkkPortalConsentAt: true,
          kvkkPortalConsentVersion: true,
        },
      });
      return ok({
        type,
        items: clients.map((c) => ({
          id: c.id,
          name: `${c.name} ${c.surname}`,
          consentAt: c.kvkkPortalConsentAt,
          version: c.kvkkPortalConsentVersion,
        })),
      });
    }

    return fail("bad_request", "Invalid type. Expected: diets | clients | kvkk");
  },
});

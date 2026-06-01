import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireOwnClient } from "@/lib/api-auth";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

type Params = { id: string };

const CreateBannedBesinBody = z.object({
  besinId: z.number().int().positive(),
  reason: z.string().optional().nullable(),
});

function parseClientId(raw: string) {
  const id = parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

export const GET = route<undefined, Params>({
  auth: "dietitian",
  scope: "banned-besins.list",
  handler: async ({ params, auth }) => {
    const clientId = parseClientId(params.id);
    if (clientId === null) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }
    if (!(await requireOwnClient(clientId, auth))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const bannedBesins = await prisma.bannedFood.findMany({
      where: { clientId },
      include: { besin: true },
    });
    return NextResponse.json(bannedBesins);
  },
});

export const POST = route<typeof CreateBannedBesinBody, Params>({
  auth: "dietitian",
  schema: CreateBannedBesinBody,
  scope: "banned-besins.create",
  handler: async ({ body, params, auth, log }) => {
    const clientId = parseClientId(params.id);
    if (clientId === null) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }
    if (!(await requireOwnClient(clientId, auth))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const created = await prisma.bannedFood.create({
        data: {
          clientId,
          besinId: body.besinId,
          reason: body.reason ?? null,
        },
        include: { besin: true },
      });
      return NextResponse.json(created, { status: 201 });
    } catch (err) {
      log.error("create failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Failed to add banned besin" },
        { status: 500 },
      );
    }
  },
});

export const DELETE = route<undefined, Params>({
  auth: "dietitian",
  scope: "banned-besins.delete",
  handler: async ({ request, params, auth, log }) => {
    const clientId = parseClientId(params.id);
    if (clientId === null) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }
    if (!(await requireOwnClient(clientId, auth))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const besinId = parseInt(request.nextUrl.searchParams.get("besinId") ?? "", 10);
    if (Number.isNaN(besinId)) {
      return NextResponse.json({ error: "besinId is required" }, { status: 400 });
    }
    try {
      await prisma.bannedFood.delete({
        where: { clientId_besinId: { clientId, besinId } },
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      log.error("delete failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Failed to remove banned besin" },
        { status: 500 },
      );
    }
  },
});

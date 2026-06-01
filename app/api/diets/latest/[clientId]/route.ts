import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOwnClient } from "@/lib/api-auth";
import { route } from "@/lib/api/handler";

type Params = { clientId: string };

export const GET = route<undefined, Params>({
  auth: "dietitian",
  scope: "diets.latest",
  handler: async ({ params, auth, log }) => {
    try {
      const clientId = Number(params.clientId);
      if (Number.isNaN(clientId)) {
        return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
      }
      const owns = await requireOwnClient(clientId, auth);
      if (!owns) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const diet = await prisma.diet.findFirst({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        include: {
          oguns: {
            include: {
              items: { include: { birim: true, besin: true } },
            },
          },
        },
      });
      if (!diet) {
        return NextResponse.json(
          { message: "No diet found for this client" },
          { status: 404 },
        );
      }
      return NextResponse.json(diet);
    } catch (err) {
      log.error("latest failed", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
});

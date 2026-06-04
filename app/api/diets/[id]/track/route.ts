import prisma from "@/lib/prisma";
import { requireOwnClientDiet, requireOwnDiet, type AuthResult } from "@/lib/api-auth";
import { route, HttpError } from "@/lib/api/handler";

export const maxDuration = 30;

type Params = { id: string };

interface TrackBody {
  event?: "view" | "download";
}

async function clientOwnsDiet(dietId: number, auth: AuthResult): Promise<boolean> {
  return requireOwnClientDiet(dietId, auth);
}

export const POST = route<undefined, Params>({
  cors: true,
  auth: "any",
  scope: "diets.track",
  handler: async ({ request, params, auth }) => {
    const dietId = parseInt(params.id, 10);
    if (Number.isNaN(dietId)) throw new HttpError("bad_request", "Invalid diet ID");

    const user = auth.user!;
    const hasAccess =
      user.role === "dietitian"
        ? await requireOwnDiet(dietId, auth)
        : await clientOwnsDiet(dietId, auth);
    if (!hasAccess) throw new HttpError("forbidden", "Access denied");

    let body: TrackBody = {};
    try {
      body = (await request.json()) as TrackBody;
    } catch {}

    const event = body.event;
    if (event !== "view" && event !== "download") {
      throw new HttpError("bad_request", "event must be 'view' or 'download'");
    }

    const data =
      event === "view" ? { viewCount: { increment: 1 } } : { downloadCount: { increment: 1 } };

    const diet = await prisma.diet.update({
      where: { id: dietId },
      data,
      select: { id: true, viewCount: true, downloadCount: true },
    });

    return diet;
  },
});

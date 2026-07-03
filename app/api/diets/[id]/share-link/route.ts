import prisma from "@/lib/prisma";
import { requireOwnDiet } from "@/lib/api-auth";
import { buildDietShareUrl, getOrCreateDietShareLink } from "@/lib/diet-share-links";
import { route, HttpError } from "@/lib/api/handler";

type Params = { id: string };

function parseDietId(raw: string) {
  const id = Number.parseInt(raw, 10);
  if (Number.isNaN(id)) throw new HttpError("bad_request", "Invalid diet id");
  return id;
}

export const POST = route<undefined, Params>({
  auth: "dietitian",
  scope: "diets.share-link",
  handler: async ({ params, auth }) => {
    const dietId = parseDietId(params.id);
    if (!(await requireOwnDiet(dietId, auth))) {
      throw new HttpError("forbidden", "Access denied");
    }

    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      select: { id: true },
    });
    if (!diet) throw new HttpError("not_found", "Diet not found");

    const share = await getOrCreateDietShareLink({
      dietId,
      dietitianId: auth.user!.id,
    });
    return {
      token: share.token,
      url: await buildDietShareUrl(share.token),
    };
  },
});

export const GET = POST;

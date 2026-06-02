import { TanitaService } from "@/services/TanitaService";
import { route, HttpError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "tanita.search",
  handler: async ({ request }) => {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) {
      throw new HttpError("bad_request", "Arama sorgusu en az 2 karakter olmalıdır");
    }

    const users = TanitaService.searchUsers(query);
    return {
      success: true,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
        gender: user.gender,
        bodyType: user.bodyType,
        height: user.height,
        identityNumber: user.identityNumber,
        notes: user.notes,
      })),
      count: users.length,
    };
  },
});

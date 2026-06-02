import { NextResponse } from "next/server";
import { TanitaService } from "@/services/TanitaService";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "tanita.search",
  handler: async ({ request, log }) => {
    try {
      const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
      if (query.length < 2) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Arama sorgusu en az 2 karakter olmalıdır" },
            { status: 400 },
          ),
        );
      }

      const users = TanitaService.searchUsers(query);

      return addCorsHeaders(
        NextResponse.json({
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
        }),
      );
    } catch (err) {
      log.error("search failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Tanita araması başarısız" },
          { status: 500 },
        ),
      );
    }
  },
});

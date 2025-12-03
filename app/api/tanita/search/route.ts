import { NextRequest, NextResponse } from "next/server";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { TanitaService } from "@/services/TanitaService";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export const GET = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {

      const searchParams = request.nextUrl.searchParams;
      const query = searchParams.get("q") || "";

      if (!query || query.trim().length < 2) {
        return NextResponse.json(
          { error: "Arama sorgusu en az 2 karakter olmalıdır" },
          { status: 400 }
        );
      }

      // Tanita veritabanında ara
      const users = TanitaService.searchUsers(query.trim());

      const response = NextResponse.json({
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
      });

      return addCorsHeaders(response);
    } catch (error: any) {
      console.error("Error searching Tanita users:", error);
      const response = NextResponse.json(
        {
          error: error.message || "Tanita araması başarısız",
        },
        { status: 500 }
      );
      return addCorsHeaders(response);
    }
  }
);


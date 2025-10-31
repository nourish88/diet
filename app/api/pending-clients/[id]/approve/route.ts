import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

// POST - Approve pending client and create mapping (first-come-first-served)
export const POST = requireDietitian(
  async (
    request: NextRequest,
    auth: AuthResult,
    context: any
  ) => {
    try {
      const { params } = context;
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Geçersiz kullanıcı ID" }, { status: 400 })
        );
      }

      // Get dietitian ID from auth
      const dietitianId = auth.user!.id;

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Check if user exists and is pending
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new Error("Kullanıcı bulunamadı");
        }

        if (user.role !== "client") {
          throw new Error("Bu kullanıcı client değil");
        }

        if (user.isApproved) {
          throw new Error("Bu kullanıcı zaten onaylanmış");
        }

        // 2. Check if user is already mapped to a client (first-come-first-served rule)
        const existingClient = await tx.client.findFirst({
          where: { userId: user.id },
        });

        if (existingClient) {
          throw new Error(
            "Bu kullanıcı başka bir diyetisyen tarafından zaten eşleştirilmiş"
          );
        }

        // 3. Create Client record with mapping
        const client = await tx.client.create({
          data: {
            name: user.email.split("@")[0], // Use email prefix as name
            surname: "",
            userId: user.id,
            dietitianId: dietitianId,
            phoneNumber: null,
            birthdate: null,
            gender: null,
            illness: null,
            notes: `Mobile kayıt: ${user.email}`,
          },
        });

        // 4. Update User to approved
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            isApproved: true,
            approvedAt: new Date(),
          },
        });

        return { client, user: updatedUser };
      });

      return addCorsHeaders(
        NextResponse.json({
          message: "Client başarıyla onaylandı ve eşleştirildi",
          client: result.client,
        })
      );
    } catch (error: any) {
      console.error("Error approving client:", error);
      return addCorsHeaders(
        NextResponse.json(
          {
            error:
              error.message ||
              "Client onaylanırken bir hata oluştu",
          },
          { status: error.message?.includes("zaten") ? 409 : 500 }
        )
      );
    }
  }
);


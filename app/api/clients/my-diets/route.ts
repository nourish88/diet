import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireClient, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

// GET - Get logged-in client's diets
export const GET = requireClient(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const userId = auth.user!.id;

      // Find client record linked to this user
      const client = await prisma.client.findUnique({
        where: { userId },
      });

      if (!client) {
        return addCorsHeaders(
          NextResponse.json(
            {
              error:
                "Henüz bir diyetisyen tarafından onaylanmadınız. Lütfen bekleyin.",
            },
            { status: 404 }
          )
        );
      }

      // Get diets for this client
      const diets = await prisma.diet.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: "desc" },
        include: {
          oguns: {
            orderBy: { order: "asc" },
            include: {
              items: {
                include: {
                  besin: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  birim: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          dietitian: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      return addCorsHeaders(NextResponse.json(diets));
    } catch (error) {
      console.error("Error fetching client diets:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Diyetler yüklenirken bir hata oluştu" },
          { status: 500 }
        )
      );
    }
  }
);




import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

// POST - Match user with client (dietitian only)
export const POST = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const { referenceCode, clientId } = await request.json();

      if (!referenceCode || !clientId) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "referenceCode and clientId are required" },
            { status: 400 }
          )
        );
      }

      // Find user with reference code
      const user = await prisma.user.findUnique({
        where: { referenceCode },
      });

      if (!user) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Invalid reference code" },
            { status: 404 }
          )
        );
      }

      if (user.isApproved) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "User already approved" },
            { status: 400 }
          )
        );
      }

      // Check if client is already linked to another user
      const existingClient = await prisma.client.findUnique({
        where: { id: clientId },
        select: { userId: true },
      });

      if (existingClient?.userId) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Client is already linked to another user" },
            { status: 400 }
          )
        );
      }

      // Link user to client and approve
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isApproved: true,
          approvedAt: new Date(),
        },
      });

      await prisma.client.update({
        where: { id: clientId },
        data: { userId: user.id },
      });

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        message: "Client matched and approved successfully",
      })
    );
  } catch (error) {
    console.error("Error matching user:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to match user" },
        { status: 500 }
      )
    );
  }
});




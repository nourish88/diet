import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

export const GET = requireDietitian(
  async (
    request: NextRequest,
    auth: AuthResult,
    context: any
  ) => {
    try {
      const { params } = context;
      const id = parseInt(params.id);

      if (isNaN(id)) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Invalid important date ID" },
            { status: 400 }
          )
        );
      }

      const importantDate = await prisma.importantDate.findFirst({
        where: {
          id,
          dietitianId: auth.user!.id, // SECURITY: Only show own important dates
        },
      });

      if (!importantDate) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Important date not found" },
            { status: 404 }
          )
        );
      }

      return addCorsHeaders(NextResponse.json(importantDate));
    } catch (error) {
      console.error("Error fetching important date:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to fetch important date" },
          { status: 500 }
        )
      );
    }
  }
);

export const PUT = requireDietitian(
  async (
    request: NextRequest,
    auth: AuthResult,
    context: any
  ) => {
    try {
      const { params } = context;
      const id = parseInt(params.id);
      const data = await request.json();

      if (isNaN(id)) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Invalid important date ID" },
            { status: 400 }
          )
        );
      }

      if (!data.name || !data.message || !data.startDate || !data.endDate) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "All fields are required" },
            { status: 400 }
          )
        );
      }

      // SECURITY: Check if important date exists and belongs to dietitian
      const existingDate = await prisma.importantDate.findFirst({
        where: {
          id,
          dietitianId: auth.user!.id,
        },
      });

      if (!existingDate) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Important date not found" },
            { status: 404 }
          )
        );
      }

      const updatedDate = await prisma.importantDate.update({
        where: { id },
        data: {
          name: data.name,
          message: data.message,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
        },
      });

      return addCorsHeaders(NextResponse.json(updatedDate));
    } catch (error) {
      console.error("Error updating important date:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to update important date" },
          { status: 500 }
        )
      );
    }
  }
);

export const DELETE = requireDietitian(
  async (
    request: NextRequest,
    auth: AuthResult,
    context: any
  ) => {
    try {
      const { params } = context;
      const id = parseInt(params.id);

      if (isNaN(id)) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Invalid important date ID" },
            { status: 400 }
          )
        );
      }

      // SECURITY: Check if important date exists and belongs to dietitian
      const existingDate = await prisma.importantDate.findFirst({
        where: {
          id,
          dietitianId: auth.user!.id,
        },
      });

      if (!existingDate) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Important date not found" },
            { status: 404 }
          )
        );
      }

      const deletedDate = await prisma.importantDate.delete({
        where: { id },
      });

      return addCorsHeaders(NextResponse.json(deletedDate));
    } catch (error) {
      console.error("Error deleting important date:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to delete important date" },
          { status: 500 }
        )
      );
    }
  }
);

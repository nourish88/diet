import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

export const GET = requireDietitian(
  async (
    request: NextRequest,
    auth: AuthResult,
    { params }: { params: { id: string } }
  ) => {
    try {
      const id = parseInt(params.id);

      if (isNaN(id)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid template ID" }, { status: 400 })
        );
      }

      const template = await prisma.dietTemplate.findFirst({
        where: {
          id,
          dietitianId: auth.user!.id, // SECURITY: Only show own templates
        },
        include: {
          oguns: {
            include: {
              items: {
                orderBy: {
                  order: "asc",
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      if (!template) {
        return addCorsHeaders(
          NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 })
        );
      }

      return addCorsHeaders(NextResponse.json(template));
    } catch (error) {
      console.error("Error fetching template:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Şablon yüklenirken bir hata oluştu" },
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
    { params }: { params: { id: string } }
  ) => {
    try {
      const id = parseInt(params.id);
      const body = await request.json();
      const { name, description, category, su, fizik, hedef, sonuc, isActive } =
        body;

      if (isNaN(id)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid template ID" }, { status: 400 })
        );
      }

      // SECURITY: Check if template exists and belongs to dietitian
      const existingTemplate = await prisma.dietTemplate.findFirst({
        where: {
          id,
          dietitianId: auth.user!.id,
        },
      });

      if (!existingTemplate) {
        return addCorsHeaders(
          NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 })
        );
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined)
        updateData.description = description?.trim() || null;
      if (category !== undefined) updateData.category = category || null;
      if (su !== undefined) updateData.su = su || null;
      if (fizik !== undefined) updateData.fizik = fizik || null;
      if (hedef !== undefined) updateData.hedef = hedef || null;
      if (sonuc !== undefined) updateData.sonuc = sonuc || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const template = await prisma.dietTemplate.update({
        where: { id },
        data: updateData,
        include: {
          oguns: {
            include: {
              items: true,
            },
          },
        },
      });

      return addCorsHeaders(NextResponse.json(template));
    } catch (error: any) {
      console.error("Error updating template:", error);
      if (error.code === "P2025") {
        return addCorsHeaders(
          NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 })
        );
      }
      return addCorsHeaders(
        NextResponse.json(
          { error: "Şablon güncellenirken bir hata oluştu" },
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
    { params }: { params: { id: string } }
  ) => {
    try {
      const id = parseInt(params.id);

      if (isNaN(id)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid template ID" }, { status: 400 })
        );
      }

      // SECURITY: Check if template exists and belongs to dietitian
      const existingTemplate = await prisma.dietTemplate.findFirst({
        where: {
          id,
          dietitianId: auth.user!.id,
        },
      });

      if (!existingTemplate) {
        return addCorsHeaders(
          NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 })
        );
      }

      await prisma.dietTemplate.delete({
        where: { id },
      });

      return addCorsHeaders(NextResponse.json({ message: "Şablon silindi" }));
    } catch (error: any) {
      console.error("Error deleting template:", error);
      if (error.code === "P2025") {
        return addCorsHeaders(
          NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 })
        );
      }
      return addCorsHeaders(
        NextResponse.json(
          { error: "Şablon silinirken bir hata oluştu" },
          { status: 500 }
        )
      );
    }
  }
);

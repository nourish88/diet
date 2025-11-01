import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export const GET = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const category = searchParams.get("category");

      const whereClause: any = {
        isActive: true,
        dietitianId: auth.user!.id, // SECURITY: Only show own templates
      };

      if (category) {
        whereClause.category = category;
      }

      const templates = await prisma.dietTemplate.findMany({
        where: whereClause,
        include: {
          oguns: {
            include: {
              items: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return addCorsHeaders(NextResponse.json(templates));
    } catch (error) {
      console.error("Error fetching templates:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Şablonlar yüklenirken bir hata oluştu" },
          { status: 500 }
        )
      );
    }
  }
);

export const POST = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    try {
      const body = await request.json();
      const { name, description, category, su, fizik, hedef, sonuc, oguns } =
        body;

      if (!name) {
        return addCorsHeaders(
          NextResponse.json({ error: "Şablon adı zorunludur" }, { status: 400 })
        );
      }

      const template = await prisma.dietTemplate.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          category: category || null,
          su: su || null,
          fizik: fizik || null,
          hedef: hedef || null,
          sonuc: sonuc || null,
          isActive: true,
          dietitianId: auth.user!.id, // SECURITY: Assign to authenticated dietitian
          oguns: {
            create: (oguns || []).map((ogun: any) => ({
              name: ogun.name,
              time: ogun.time,
              detail: ogun.detail || null,
              order: ogun.order || 0,
              items: {
                create: (ogun.items || []).map((item: any, idx: number) => ({
                  besinName: item.besinName || item.besin,
                  miktar: item.miktar || "",
                  birim: item.birim || "",
                  order: idx,
                })),
              },
            })),
          },
        },
        include: {
          oguns: {
            include: {
              items: true,
            },
          },
        },
      });

      return addCorsHeaders(NextResponse.json(template, { status: 201 }));
    } catch (error) {
      console.error("Error creating template:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Şablon oluşturulurken bir hata oluştu" },
          { status: 500 }
        )
      );
    }
  }
);

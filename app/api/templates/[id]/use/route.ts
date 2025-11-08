import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const templateId = parseInt(id);
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "Danışan seçimi zorunludur" },
        { status: 400 }
      );
    }

    // Get template
    const template = await prisma.dietTemplate.findUnique({
      where: { id: templateId },
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
      return NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 });
    }

    // Create new diet from template
    const diet = await prisma.diet.create({
      data: {
        clientId: parseInt(clientId.toString()),
        tarih: new Date(),
        su: template.su,
        fizik: template.fizik,
        hedef: template.hedef,
        sonuc: template.sonuc,
        oguns: {
          create: template.oguns.map((ogun) => ({
            name: ogun.name,
            time: ogun.time,
            detail: ogun.detail,
            order: ogun.order,
            items: {
              create: ogun.items.map((item) => ({
                miktar: item.miktar,
                birim: {
                  connectOrCreate: {
                    where: { name: item.birim },
                    create: { name: item.birim },
                  },
                },
                besin: {
                  connectOrCreate: {
                    where: { name: item.besinName },
                    create: { name: item.besinName },
                  },
                },
              })),
            },
          })),
        },
      },
      include: {
        oguns: {
          include: {
            items: {
              include: {
                besin: true,
                birim: true,
              },
            },
          },
        },
        client: true,
      },
    });

    return NextResponse.json({ diet }, { status: 201 });
  } catch (error) {
    console.error("Error creating diet from template:", error);
    return NextResponse.json(
      { error: "Şablondan diyet oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}

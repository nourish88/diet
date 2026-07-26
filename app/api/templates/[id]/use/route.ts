import { NextRequest, NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { notifyClientOfNewDiet } from "@/services/DietNotificationService";
import { invalidate } from "@/lib/cache";
import { resolveBesinIds, resolveBirimIds } from "@/lib/besin-birim-refs";

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

    // Pre-resolve besin/birim ids to avoid N round-trips inside the
    // implicit transaction Prisma uses for nested creates — matches the
    // pattern in /api/diets POST/PUT after the same P2028 fix.
    const besinNameSet = new Set<string>();
    const birimNameSet = new Set<string>();
    for (const ogun of template.oguns) {
      for (const item of ogun.items) {
        besinNameSet.add(item.besinName);
        birimNameSet.add(item.birim);
      }
    }
    // Resolve all names in a fixed number of queries (find + createMany +
    // read-back) instead of one upsert per distinct name.
    const [besinIdByName, birimIdByName] = await Promise.all([
      resolveBesinIds(besinNameSet),
      resolveBirimIds(birimNameSet),
    ]);

    invalidate.besinler();
    invalidate.birims();

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
                birim: { connect: { id: birimIdByName.get(item.birim)! } },
                besin: { connect: { id: besinIdByName.get(item.besinName)! } },
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

    after(() => notifyClientOfNewDiet(diet.id));

    return NextResponse.json({ diet }, { status: 201 });
  } catch (error) {
    console.error("Error creating diet from template:", error);
    return NextResponse.json(
      { error: "Şablondan diyet oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWhatsAppURL, createWhatsAppMessage } from "@/utils/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const { clientId, dietId } = await request.json();

    if (!clientId || !dietId) {
      return NextResponse.json(
        { error: "clientId and dietId are required" },
        { status: 400 }
      );
    }

    // Get client with phone number
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        phoneNumber: true,
        name: true,
        surname: true,
      },
    });

    if (!client?.phoneNumber) {
      return NextResponse.json(
        { error: "Client phone number not found" },
        { status: 400 }
      );
    }

    // Get diet data
    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
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
      },
    });

    if (!diet) {
      return NextResponse.json({ error: "Diet not found" }, { status: 404 });
    }

    // Format diet date
    const dietDate = diet.tarih
      ? new Date(diet.tarih).toLocaleDateString("tr-TR")
      : "Yeni";

    // Create WhatsApp message
    const clientName = `${client.name} ${client.surname}`;
    const message = createWhatsAppMessage(clientName, dietDate);

    // Generate WhatsApp URL
    const whatsappURL = getWhatsAppURL(client.phoneNumber, message);

    // Log the action
    console.log(`WhatsApp URL generated for ${clientName}: ${whatsappURL}`);

    return NextResponse.json({
      success: true,
      message: "WhatsApp URL generated successfully",
      whatsappURL,
      clientName,
      dietDate,
    });
  } catch (error) {
    console.error("WhatsApp URL generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate WhatsApp URL" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dietId = parseInt(params.id);
    const { phoneNumber } = await request.json();

    if (!dietId || !phoneNumber) {
      return NextResponse.json(
        { message: "Diet ID and phone number are required" },
        { status: 400 }
      );
    }

    // Fetch the diet data
    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      include: {
        client: true,
        oguns: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!diet) {
      return NextResponse.json({ message: "Diet not found" }, { status: 404 });
    }

    // Get the host from headers
    const headersList = headers();
    const host = headersList.get("host");
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

    // Construct the diet report URL
    const dietReportUrl = `${protocol}://${host}/api/diets/${dietId}/pdf`;

    // Create WhatsApp message with the report link
    const message =
      `Merhaba ${diet.client?.name || "Değerli Danışanımız"},\n\n` +
      `Beslenme programınız hazır. Aşağıdaki linkten ulaşabilirsiniz:\n\n` +
      `${dietReportUrl}\n\n` +
      `İyi günler dileriz.`;

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message
    )}`;

    return NextResponse.json({
      success: true,
      message: "WhatsApp message sent successfully",
      whatsappUrl,
    });
  } catch (error) {
    console.error("WhatsApp sending error:", error);
    return NextResponse.json(
      { message: "Failed to send WhatsApp message" },
      { status: 500 }
    );
  }
}

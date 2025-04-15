import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dietId = parseInt(params.id);

    if (isNaN(dietId)) {
      return NextResponse.json({ error: "Invalid diet ID" }, { status: 400 });
    }

    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      include: {
        client: true,
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

    // Create PDF document with built-in fonts
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
      autoFirstPage: true,
    });

    const chunks: Buffer[] = [];

    // Collect PDF data chunks
    doc.on("data", (chunk) => chunks.push(chunk));

    // Add logo if exists
    try {
      const logoPath = path.join(process.cwd(), "public", "ezgi_evgin.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, {
          fit: [150, 150],
          align: "center",
        });
        doc.moveDown();
      }
    } catch (error) {
      console.error("Logo loading error:", error);
    }

    // Add content to PDF
    doc
      .fontSize(16)
      .fillColor("#333333")
      // Use built-in font weight
      .text("Beslenme Programı", { align: "center" });
    doc.moveDown();

    // Handle client name with proper fallback
    const clientName =
      `${diet.client?.name || ""} ${diet.client?.surname || ""}`.trim() ||
      "İsimsiz Danışan";

    doc
      .fontSize(12)
      .fillColor("#000000")
      .text(`Danışan: ${clientName}`)
      .text(`Tarih: ${new Date(diet.createdAt).toLocaleDateString("tr-TR")}`);
    doc.moveDown();

    // Add meals
    diet.oguns.forEach((ogun) => {
      doc
        .fontSize(12)
        .fillColor("#2c5282")
        .text(`${ogun.name || "Öğün"} (${ogun.time || ""})`)
        .fillColor("#000000");

      // Process menu items
      ogun.items.forEach((item) => {
        const besinName = item.besin?.name || "";
        const birimName = item.birim?.name || "";
        const menuItem = `${
          item.miktar || ""
        } ${birimName} ${besinName}`.trim();
        doc.fontSize(10).text(`• ${menuItem}`);
      });

      if (ogun.detail) {
        doc
          .fontSize(10)
          .fillColor("#666666")
          .text(`Not: ${ogun.detail}`)
          .fillColor("#000000");
      }
      doc.moveDown();
    });

    // Add additional information
    if (diet.su) {
      doc.text(`Su Tüketimi: ${diet.su}`);
    }
    if (diet.fizik) {
      doc.text(`Fiziksel Aktivite: ${diet.fizik}`);
    }
    if (diet.dietitianNote) {
      doc
        .moveDown()
        .fillColor("#2c5282")
        .text("Diyetisyen Notu:")
        .fillColor("#000000")
        .text(diet.dietitianNote);
    }

    // Add footer
    doc
      .fontSize(8)
      .fillColor("#666666")
      .text("Dyt. Ezgi Evgin Aktaş", { align: "center" })
      .text(
        "Eryaman 4.Etap Üç Şehitler Cad. Haznedatoğlu Bl. 173 Etimesgut/ANKARA",
        { align: "center" }
      )
      .text("0546 265 04 40 ezgievgin_dytsyn@hotmail.com www.ezgievgin.com", {
        align: "center",
      });

    // Finalize PDF
    doc.end();

    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Create response with PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=beslenme-programi-${dietId}.pdf`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      {
        error: "Error generating PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

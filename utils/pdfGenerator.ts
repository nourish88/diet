import PDFDocument from "pdfkit";

export async function generatePDF(diet: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      // Collect the PDF data in a buffer
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Add content to the PDF

      // Header
      doc.fontSize(20).text("BESLENME PROGRAMI", { align: "center" });
      doc.moveDown();

      // Client information
      doc.fontSize(14).text("DANIŞAN BİLGİLERİ");
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .text(`Ad Soyad: ${diet.client.name} ${diet.client.surname}`);
      doc
        .fontSize(12)
        .text(`Tarih: ${new Date(diet.tarih).toLocaleDateString("tr-TR")}`);
      doc.moveDown();

      // Diet details
      doc.fontSize(14).text("GÜNLÜK BESLENME PROGRAMI");
      doc.moveDown(0.5);

      // Iterate through each meal
      diet.oguns.forEach((ogun: any) => {
        doc
          .fontSize(12)
          .text(`${ogun.name} - ${ogun.time}`, { underline: true });
        doc.moveDown(0.5);

        // Meal items
        ogun.items.forEach((item: any) => {
          const besinName = item.besin?.name || "Belirtilmemiş";
          const birimName = item.birim?.name || "Belirtilmemiş";
          doc.fontSize(10).text(`• ${item.miktar} ${birimName} ${besinName}`);
        });

        // Meal notes if any
        if (ogun.detail) {
          doc.moveDown(0.5);
          doc.fontSize(10).text(`Not: ${ogun.detail}`, { italic: true });
        }

        doc.moveDown();
      });

      // Additional information
      if (diet.su) {
        doc.fontSize(12).text("SU TÜKETİMİ", { underline: true });
        doc.fontSize(10).text(diet.su);
        doc.moveDown();
      }

      if (diet.fizik) {
        doc.fontSize(12).text("FİZİKSEL AKTİVİTE", { underline: true });
        doc.fontSize(10).text(diet.fizik);
        doc.moveDown();
      }

      if (diet.sonuc) {
        doc.fontSize(12).text("SONUÇ", { underline: true });
        doc.fontSize(10).text(diet.sonuc);
        doc.moveDown();
      }

      if (diet.hedef) {
        doc.fontSize(12).text("HEDEF", { underline: true });
        doc.fontSize(10).text(diet.hedef);
        doc.moveDown();
      }

      if (diet.dietitianNote) {
        doc.fontSize(12).text("DİYETİSYEN NOTU", { underline: true });
        doc.fontSize(10).text(diet.dietitianNote);
        doc.moveDown();
      }

      // Footer
      doc.fontSize(10).text("Dyt. Ezgi Evgin Aktaş", { align: "right" });
      doc
        .fontSize(8)
        .text("Tel: 0546 265 04 40 • E-posta: ezgievgin_dytsyn@hotmail.com", {
          align: "center",
        });

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

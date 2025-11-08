let pdfMakeInstance: any | null = null;

export async function ensurePdfMake() {
  if (typeof window === "undefined") {
    throw new Error("PDF oluşturma işlemi yalnızca tarayıcı ortamında gerçekleştirilebilir");
  }

  if (pdfMakeInstance) {
    return pdfMakeInstance;
  }

  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

  const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule;
  const pdfFonts = (pdfFontsModule as any).default ?? pdfFontsModule;

  if (pdfFonts?.pdfMake?.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
  } else if (pdfFonts?.vfs) {
    pdfMake.vfs = pdfFonts.vfs;
  }

  pdfMake.fonts = {
    Roboto: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
  };

  pdfMakeInstance = pdfMake;
  return pdfMakeInstance;
}


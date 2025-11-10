import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");
    const size = parseInt(searchParams.get("size") || "200", 10);

    if (!url) {
      return NextResponse.json(
        { error: "URL parametresi gerekli" },
        { status: 400 }
      );
    }

    const qrDataUrl = await QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return NextResponse.json({ dataUrl: qrDataUrl });
  } catch (error) {
    console.error("QR kod oluşturma hatası:", error);
    return NextResponse.json(
      { error: "QR kod oluşturulamadı" },
      { status: 500 }
    );
  }
}


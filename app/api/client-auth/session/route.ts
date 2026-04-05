import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import {
  buildClientPhoneCredentials,
  normalizeClientPhoneNumber,
} from "@/lib/client-phone-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { phoneNumber } = await request.json();
    const normalizedPhone = normalizeClientPhoneNumber(phoneNumber);

    if (!normalizedPhone) {
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            code: "INVALID_PHONE",
            error: "Geçerli bir Türkiye cep telefonu giriniz.",
          },
          { status: 400 }
        )
      );
    }

    const exists = await prisma.clientPhoneAuth.findFirst({
      where: {
        phoneNormalized: normalizedPhone,
      },
      select: {
        id: true,
      },
    });

    if (!exists) {
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            code: "PHONE_NOT_REGISTERED",
            error:
              "Bu telefon numarası kayıtlı değil. Lütfen diyetisyeninizle iletişime geçin.",
          },
          { status: 404 }
        )
      );
    }

    const credentials = buildClientPhoneCredentials(normalizedPhone);

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        normalizedPhone,
        ...credentials,
      })
    );
  } catch (error: any) {
    console.error("Client session preparation error:", error);
    return addCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: error.message || "Giriş hazırlanırken bir hata oluştu.",
        },
        { status: 500 }
      )
    );
  }
}

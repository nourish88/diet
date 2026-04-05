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

    const mappings = await prisma.clientPhoneAuth.findMany({
      where: {
        phoneNormalized: normalizedPhone,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            surname: true,
            birthdate: true,
            userId: true,
          },
        },
      },
    });

    if (mappings.length === 0) {
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            code: "PHONE_NOT_REGISTERED",
            error:
              "Bu telefon numarası sistemde kayıtlı değil. Lütfen diyetisyeninizden telefon numaranızı kaydetmesini isteyin.",
          },
          { status: 404 }
        )
      );
    }

    let singleClientAutoLogin = false;

    if (mappings.length === 1) {
      const credentials = buildClientPhoneCredentials(normalizedPhone);
      const phoneAuthUser = await prisma.user.findUnique({
        where: {
          email: credentials.email,
        },
        select: {
          id: true,
          role: true,
          isApproved: true,
        },
      });

      singleClientAutoLogin =
        Boolean(phoneAuthUser) &&
        phoneAuthUser?.role === "client" &&
        phoneAuthUser?.isApproved === true &&
        mappings[0].client.userId === phoneAuthUser?.id;
    }

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        normalizedPhone,
        singleClientAutoLogin,
        clients: mappings
          .map((mapping) => ({
            id: mapping.client.id,
            name: mapping.client.name,
            surname: mapping.client.surname,
            birthdate: mapping.client.birthdate,
          }))
          .sort((a, b) => a.id - b.id),
      })
    );
  } catch (error: any) {
    console.error("Phone lookup error:", error);
    return addCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: error.message || "Telefon sorgulanırken bir hata oluştu.",
        },
        { status: 500 }
      )
    );
  }
}

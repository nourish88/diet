import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import { normalizeClientPhoneNumber } from "@/lib/client-phone-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const dynamic = "force-dynamic";

async function getSupabaseIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    return null;
  }

  const user = await response.json();
  return user?.id || null;
}

export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const supabaseId = await getSupabaseIdFromRequest(request);

    if (!supabaseId) {
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            error: "Unauthorized",
          },
          { status: 401 }
        )
      );
    }

    const { phoneNumber, clientId } = await request.json();
    const normalizedPhone = normalizeClientPhoneNumber(phoneNumber);
    const parsedClientId = Number(clientId);

    if (!normalizedPhone) {
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            code: "INVALID_PHONE",
            error:
              "Geçerli bir telefon numarası giriniz. Türkiye için 05… veya +90…; yurtdışı için +ülke kodu ile deneyin.",
          },
          { status: 400 }
        )
      );
    }

    if (!Number.isInteger(parsedClientId)) {
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            error: "Geçersiz danışan seçimi.",
          },
          { status: 400 }
        )
      );
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user || user.role !== "client") {
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            error: "Sadece danışan hesabı ile işlem yapılabilir.",
          },
          { status: 403 }
        )
      );
    }

    const mapping = await prisma.clientPhoneAuth.findFirst({
      where: {
        clientId: parsedClientId,
        phoneNormalized: normalizedPhone,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
      },
    });

    if (!mapping) {
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Bu profil seçilen telefon numarasıyla eşleşmiyor. Lütfen diyetisyeninizle iletişime geçin.",
          },
          { status: 404 }
        )
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.client.updateMany({
        where: {
          userId: user.id,
          id: {
            not: parsedClientId,
          },
        },
        data: {
          userId: null,
        },
      });

      await tx.client.update({
        where: {
          id: parsedClientId,
        },
        data: {
          userId: user.id,
        },
      });

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          referenceCode: null,
        },
      });
    });

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        message: "Eşleştirme onaylandı.",
        client: mapping.client,
      })
    );
  } catch (error: any) {
    console.error("Client phone confirm error:", error);
    return addCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: error.message || "Eşleştirme yapılırken bir hata oluştu.",
        },
        { status: 500 }
      )
    );
  }
}

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import {
  MAX_MESSAGE_PHOTO_BYTES,
  MESSAGE_PHOTO_CONTENT_TYPES,
} from "@/lib/message-photo";
import prisma from "@/lib/prisma";

type UploadContext = {
  clientId: number;
  dietId: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const auth = await authenticateRequest(request);
        if (!auth.user || auth.user.role !== "client") {
          throw new Error("Bu işlem için danışan oturumu gerekli.");
        }

        const context = parseUploadContext(clientPayload);
        const ownsConversation = await prisma.diet.findFirst({
          where: {
            id: context.dietId,
            clientId: context.clientId,
            client: { userId: auth.user.id },
          },
          select: { id: true },
        });
        if (!ownsConversation) {
          throw new Error("Bu görüşmeye görsel yükleme yetkiniz yok.");
        }

        const expectedPrefix = `message-photos/${context.clientId}/${context.dietId}/`;
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error("Geçersiz görsel yolu.");
        }

        return {
          allowedContentTypes: [...MESSAGE_PHOTO_CONTENT_TYPES],
          maximumSizeInBytes: MAX_MESSAGE_PHOTO_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify(context),
        };
      },
      onUploadCompleted: async () => {
        // The message request links the uploaded Blob URL to its database row.
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Görsel yükleme başlatılamadı.",
      },
      { status: 400 },
    );
  }
}

function parseUploadContext(clientPayload: string | null): UploadContext {
  let value: unknown;
  try {
    value = clientPayload ? JSON.parse(clientPayload) : null;
  } catch {
    throw new Error("Geçersiz yükleme bilgisi.");
  }

  const context = value as Partial<UploadContext> | null;
  if (
    !context ||
    !Number.isInteger(context.clientId) ||
    !Number.isInteger(context.dietId) ||
    Number(context.clientId) <= 0 ||
    Number(context.dietId) <= 0
  ) {
    throw new Error("Geçerli danışan ve diyet bilgisi gerekli.");
  }

  return {
    clientId: Number(context.clientId),
    dietId: Number(context.dietId),
  };
}

import { randomUUID } from "crypto";
import { del, put } from "@vercel/blob";

type StoreMealPhotoOptions = {
  clientId: number;
  dietId: number;
};

const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/;

export async function storeMealPhotoImage(
  imageData: string,
  options: StoreMealPhotoOptions
): Promise<string> {
  const parsed = parseDataUrl(imageData);
  if (!parsed) {
    return imageData;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn(
      "[MealPhotoStorage] BLOB_READ_WRITE_TOKEN missing; storing data URL in database."
    );
    return imageData;
  }

  const extension = contentTypeToExtension(parsed.contentType);
  const pathname = `meal-photos/${options.clientId}/${options.dietId}/${randomUUID()}.${extension}`;
  const blob = await put(pathname, parsed.buffer, {
    access: "public",
    contentType: parsed.contentType,
  });

  return blob.url;
}

export async function deleteMealPhotoImage(imageData: string | null | undefined) {
  if (!imageData || !isVercelBlobUrl(imageData)) {
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn(
      "[MealPhotoStorage] BLOB_READ_WRITE_TOKEN missing; skipping blob delete."
    );
    return;
  }

  await del(imageData);
}

export function isVercelBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

function parseDataUrl(value: string) {
  const match = value.match(DATA_URL_PATTERN);
  if (!match) {
    return null;
  }

  const [, contentType, base64] = match;
  if (!contentType.startsWith("image/")) {
    return null;
  }

  return {
    contentType,
    buffer: Buffer.from(base64, "base64"),
  };
}

function contentTypeToExtension(contentType: string): string {
  switch (contentType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "jpg";
  }
}

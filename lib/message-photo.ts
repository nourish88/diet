export const MESSAGE_PHOTO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export const MAX_MESSAGE_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_MESSAGE_PHOTOS = 4;

export function buildMessagePhotoPath({
  clientId,
  dietId,
  fileId,
  contentType,
}: {
  clientId: number;
  dietId: number;
  fileId: string;
  contentType: string;
}) {
  return `message-photos/${clientId}/${dietId}/${fileId}.${extensionForContentType(contentType)}`;
}

export function isSupportedMessagePhoto(file: Pick<File, "size" | "type">) {
  return (
    file.size > 0 &&
    file.size <= MAX_MESSAGE_PHOTO_BYTES &&
    MESSAGE_PHOTO_CONTENT_TYPES.includes(
      file.type.toLowerCase() as (typeof MESSAGE_PHOTO_CONTENT_TYPES)[number],
    )
  );
}

export function isStoredMessagePhotoUrl(
  value: string,
  clientId: number,
  dietId: number,
) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com") &&
      url.pathname.startsWith(`/message-photos/${clientId}/${dietId}/`)
    );
  } catch {
    return false;
  }
}

export function isLegacyMessagePhotoDataUrl(value: string) {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
}

function extensionForContentType(contentType: string) {
  switch (contentType.toLowerCase()) {
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

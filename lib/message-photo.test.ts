import { describe, expect, it } from "vitest";
import {
  buildMessagePhotoPath,
  isLegacyMessagePhotoDataUrl,
  isStoredMessagePhotoUrl,
} from "./message-photo";

describe("message photo helpers", () => {
  it("builds a diet-scoped storage path", () => {
    expect(
      buildMessagePhotoPath({
        clientId: 12,
        dietId: 34,
        fileId: "photo-id",
        contentType: "image/png",
      }),
    ).toBe("message-photos/12/34/photo-id.png");
  });

  it("only accepts Blob URLs scoped to the current conversation", () => {
    expect(
      isStoredMessagePhotoUrl(
        "https://store.public.blob.vercel-storage.com/message-photos/12/34/photo-id.png",
        12,
        34,
      ),
    ).toBe(true);
    expect(
      isStoredMessagePhotoUrl(
        "https://store.public.blob.vercel-storage.com/message-photos/99/34/photo-id.png",
        12,
        34,
      ),
    ).toBe(false);
    expect(
      isStoredMessagePhotoUrl("https://example.com/photo.png", 12, 34),
    ).toBe(false);
  });

  it("recognizes legacy image data URLs", () => {
    expect(isLegacyMessagePhotoDataUrl("data:image/jpeg;base64,Zm9v")).toBe(true);
    expect(isLegacyMessagePhotoDataUrl("data:text/plain;base64,Zm9v")).toBe(false);
  });
});

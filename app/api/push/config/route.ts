import { NextResponse } from "next/server";
import { getWebPushPublicKey, isWebPushConfigured } from "@/lib/web-push";

export const dynamic = "force-dynamic";

/** VAPID public keys are public; private keys never leave the sender. */
export function GET() {
  const configured = isWebPushConfigured();
  return NextResponse.json(
    { configured, publicKey: configured ? getWebPushPublicKey() : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

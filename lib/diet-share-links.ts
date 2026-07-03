import { randomBytes } from "crypto";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

function createToken() {
  return randomBytes(24).toString("base64url");
}

export async function getRequestOrigin() {
  const headersList = await headers();
  const host = headersList.get("host") || process.env.NEXT_PUBLIC_SITE_URL || "";
  if (host.startsWith("http://") || host.startsWith("https://")) return host;
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function getOrCreateDietShareLink({
  dietId,
  dietitianId,
}: {
  dietId: number;
  dietitianId: number;
}) {
  const existing = await prisma.dietShareLink.findUnique({
    where: { dietId },
    select: { token: true },
  });
  if (existing) return existing;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.dietShareLink.create({
        data: {
          dietId,
          createdById: dietitianId,
          token: createToken(),
        },
        select: { token: true },
      });
    } catch (error: any) {
      if (error?.code !== "P2002") throw error;
    }
  }

  throw new Error("Paylaşım linki oluşturulamadı.");
}

export async function buildDietShareUrl(token: string) {
  const origin = await getRequestOrigin();
  return `${origin}/diyet/${token}`;
}

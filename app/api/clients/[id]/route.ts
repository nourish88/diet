import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireOwnClient } from "@/lib/api-auth";
import { normalizeClientPhoneNumber } from "@/lib/client-phone-auth";
import { route, HttpError } from "@/lib/api/handler";

type Params = { id: string };

const PHONE_INVALID_MESSAGE =
  "Telefon numarası geçerli değil. Türkiye için 05… veya +90…; yurtdışı için +ülke kodu ile gerçek bir numara girin.";

const CLIENT_INCLUDE = {
  diets: {
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, tarih: true },
  },
  bannedFoods: { include: { besin: true } },
  user: { select: { id: true, email: true } },
  phoneAuth: true,
} satisfies Prisma.ClientInclude;

function parseGender(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value === "" ? null : parseInt(value, 10);
  if (typeof value === "number") return value;
  return null;
}

function parseClientId(raw: string): number {
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) throw new HttpError("bad_request", "Invalid client ID");
  return id;
}

async function ensureOwnership(clientId: number, auth: Parameters<typeof requireOwnClient>[1]) {
  if (!(await requireOwnClient(clientId, auth))) {
    throw new HttpError("forbidden", "Access denied");
  }
}

/** GET /api/clients/[id] — client detail (dietitian, owner). */
export const GET = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "clients.get",
  handler: async ({ params, auth }) => {
    const clientId = parseClientId(params.id);
    await ensureOwnership(clientId, auth);

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: CLIENT_INCLUDE,
    });
    if (!client) throw new HttpError("not_found", "Client not found");
    return client;
  },
});

/** PUT /api/clients/[id] — full update incl. banned foods + phone auth (dietitian, owner). */
export const PUT = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "clients.update",
  handler: async ({ request, params, auth }) => {
    const clientId = parseClientId(params.id);

    const data = (await request.json()) as Record<string, unknown> & {
      phoneNumber?: string;
      bannedBesins?: Array<{ besinId: number; reason?: string }>;
      birthdate?: string | null;
    };
    const normalizedPhone = normalizeClientPhoneNumber(data.phoneNumber);
    if (data.phoneNumber && !normalizedPhone) {
      throw new HttpError("bad_request", PHONE_INVALID_MESSAGE);
    }
    await ensureOwnership(clientId, auth);

    const { bannedBesins, ...clientData } = data;
    const gender = parseGender(clientData.gender);

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: {
          ...(clientData as Prisma.ClientUpdateInput),
          gender,
          birthdate: data.birthdate ? new Date(data.birthdate) : null,
          bannedFoods: { deleteMany: {} },
        },
      });

      if (bannedBesins && bannedBesins.length > 0) {
        await tx.bannedFood.createMany({
          data: bannedBesins.map((banned) => ({
            clientId,
            besinId: banned.besinId,
            reason: banned.reason || "",
          })),
        });
      }

      if (normalizedPhone && data.phoneNumber) {
        await tx.clientPhoneAuth.upsert({
          where: { clientId },
          create: {
            clientId,
            phoneRaw: data.phoneNumber,
            phoneNormalized: normalizedPhone,
          },
          update: {
            phoneRaw: data.phoneNumber,
            phoneNormalized: normalizedPhone,
          },
        });
      } else {
        await tx.clientPhoneAuth.deleteMany({ where: { clientId } });
      }
    });

    return prisma.client.findUnique({
      where: { id: clientId },
      include: CLIENT_INCLUDE,
    });
  },
});

/** PATCH /api/clients/[id] — partial update + optional phone auth sync (dietitian, owner). */
export const PATCH = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "clients.patch",
  handler: async ({ request, params, auth }) => {
    const clientId = parseClientId(params.id);

    const data = (await request.json()) as Record<string, unknown> & {
      phoneNumber?: string;
    };
    const normalizedPhone = normalizeClientPhoneNumber(data.phoneNumber);
    if (data.phoneNumber && !normalizedPhone) {
      throw new HttpError("bad_request", PHONE_INVALID_MESSAGE);
    }
    await ensureOwnership(clientId, auth);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.client.update({
        where: { id: clientId },
        data: data as Prisma.ClientUpdateInput,
        include: CLIENT_INCLUDE,
      });

      if (Object.prototype.hasOwnProperty.call(data, "phoneNumber")) {
        if (normalizedPhone && data.phoneNumber) {
          await tx.clientPhoneAuth.upsert({
            where: { clientId },
            create: {
              clientId,
              phoneRaw: data.phoneNumber,
              phoneNormalized: normalizedPhone,
            },
            update: {
              phoneRaw: data.phoneNumber,
              phoneNormalized: normalizedPhone,
            },
          });
        } else {
          await tx.clientPhoneAuth.deleteMany({ where: { clientId } });
        }
      }

      return updated;
    });
  },
});

/** DELETE /api/clients/[id] — delete a client (dietitian, owner). */
export const DELETE = route<undefined, Params>({
  cors: true,
  auth: "dietitian",
  scope: "clients.delete",
  handler: async ({ params, auth }) => {
    const clientId = parseClientId(params.id);
    await ensureOwnership(clientId, auth);
    await prisma.client.delete({ where: { id: clientId } });
    return { message: "Client deleted successfully" };
  },
});

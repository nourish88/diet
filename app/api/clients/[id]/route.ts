import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireOwnClient } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";
import { normalizeClientPhoneNumber } from "@/lib/client-phone-auth";
import { route } from "@/lib/api/handler";

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

/** GET /api/clients/[id] — client detail (dietitian, owner). */
export const GET = route<undefined, Params>({
  auth: "dietitian",
  scope: "clients.get",
  handler: async ({ params, auth, log }) => {
    try {
      const clientId = parseInt(params.id, 10);
      if (Number.isNaN(clientId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid client ID" }, { status: 400 }),
        );
      }
      if (!(await requireOwnClient(clientId, auth))) {
        return addCorsHeaders(
          NextResponse.json({ error: "Access denied" }, { status: 403 }),
        );
      }

      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: CLIENT_INCLUDE,
      });
      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client not found" }, { status: 404 }),
        );
      }
      return addCorsHeaders(NextResponse.json(client));
    } catch (err) {
      log.error("get failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to fetch client" }, { status: 500 }),
      );
    }
  },
});

/** PUT /api/clients/[id] — full update incl. banned foods + phone auth (dietitian, owner). */
export const PUT = route<undefined, Params>({
  auth: "dietitian",
  scope: "clients.update",
  handler: async ({ request, params, auth, log }) => {
    try {
      const clientId = parseInt(params.id, 10);
      if (Number.isNaN(clientId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid client ID" }, { status: 400 }),
        );
      }

      const data = (await request.json()) as Record<string, unknown> & {
        phoneNumber?: string;
        bannedBesins?: Array<{ besinId: number; reason?: string }>;
        birthdate?: string | null;
      };
      const normalizedPhone = normalizeClientPhoneNumber(data.phoneNumber);

      if (data.phoneNumber && !normalizedPhone) {
        return addCorsHeaders(
          NextResponse.json({ error: PHONE_INVALID_MESSAGE }, { status: 400 }),
        );
      }
      if (!(await requireOwnClient(clientId, auth))) {
        return addCorsHeaders(
          NextResponse.json({ error: "Access denied" }, { status: 403 }),
        );
      }

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

      const finalClient = await prisma.client.findUnique({
        where: { id: clientId },
        include: CLIENT_INCLUDE,
      });
      return addCorsHeaders(NextResponse.json(finalClient));
    } catch (err) {
      log.error("update failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to update client" }, { status: 500 }),
      );
    }
  },
});

/** PATCH /api/clients/[id] — partial update + optional phone auth sync (dietitian, owner). */
export const PATCH = route<undefined, Params>({
  auth: "dietitian",
  scope: "clients.patch",
  handler: async ({ request, params, auth, log }) => {
    try {
      const clientId = parseInt(params.id, 10);
      if (Number.isNaN(clientId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid client ID" }, { status: 400 }),
        );
      }

      const data = (await request.json()) as Record<string, unknown> & {
        phoneNumber?: string;
      };
      const normalizedPhone = normalizeClientPhoneNumber(data.phoneNumber);

      if (data.phoneNumber && !normalizedPhone) {
        return addCorsHeaders(
          NextResponse.json({ error: PHONE_INVALID_MESSAGE }, { status: 400 }),
        );
      }
      if (!(await requireOwnClient(clientId, auth))) {
        return addCorsHeaders(
          NextResponse.json({ error: "Access denied" }, { status: 403 }),
        );
      }

      const updatedClient = await prisma.$transaction(async (tx) => {
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

      return addCorsHeaders(NextResponse.json(updatedClient));
    } catch (err) {
      log.error("patch failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to update client" }, { status: 500 }),
      );
    }
  },
});

/** DELETE /api/clients/[id] — delete a client (dietitian, owner). */
export const DELETE = route<undefined, Params>({
  auth: "dietitian",
  scope: "clients.delete",
  handler: async ({ params, auth, log }) => {
    try {
      const clientId = parseInt(params.id, 10);
      if (Number.isNaN(clientId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid client ID" }, { status: 400 }),
        );
      }
      if (!(await requireOwnClient(clientId, auth))) {
        return addCorsHeaders(
          NextResponse.json({ error: "Access denied" }, { status: 403 }),
        );
      }

      await prisma.client.delete({ where: { id: clientId } });
      return addCorsHeaders(
        NextResponse.json({ message: "Client deleted successfully" }),
      );
    } catch (err) {
      log.error("delete failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to delete client" }, { status: 500 }),
      );
    }
  },
});

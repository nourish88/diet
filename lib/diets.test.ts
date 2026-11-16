import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), ownsClient: vi.fn(), create: vi.fn(), findFirst: vi.fn(),
  findMany: vi.fn(), count: vi.fn(), update: vi.fn(), deleteMeals: vi.fn(),
  target: vi.fn(), deleteLinks: vi.fn(), deletePresence: vi.fn(), audit: vi.fn(),
  transaction: vi.fn(), config: vi.fn(), notify: vi.fn(), invalidateStats: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({ authenticateRequest: mocks.auth, requireOwnClient: mocks.ownsClient }));
vi.mock("next/server", async (original) => ({ ...await original<typeof import("next/server")>(), after: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: {
  diet: { create: mocks.create, findFirst: mocks.findFirst, findMany: mocks.findMany, count: mocks.count, update: mocks.update },
  ogun: { deleteMany: mocks.deleteMeals },
  systemConfig: { findUnique: mocks.config },
  $transaction: mocks.transaction,
} }));
vi.mock("@/lib/cache", () => ({ invalidate: { besinler: vi.fn(), birims: vi.fn(), analyticsStats: mocks.invalidateStats } }));
vi.mock("@/lib/besin-birim-refs", () => ({
  resolveBesinIds: vi.fn(async () => new Map([["Elma", 1], ["Armut", 2]])),
  resolveBirimIds: vi.fn(async () => new Map([["Adet", 1]])),
}));
vi.mock("@/services/DietNotificationService", () => ({ notifyClientOfNewDiet: mocks.notify }));

import { POST, GET } from "@/app/api/diets/route";
import { PATCH } from "@/app/api/diets/[id]/reassign/route";

const context = { params: Promise.resolve({ id: "41" }) };
const transactionDb = {
  diet: { findFirst: mocks.findFirst, update: mocks.update },
  client: { findFirst: mocks.target },
  dietShareLink: { deleteMany: mocks.deleteLinks },
  conversationPresence: { deleteMany: mocks.deletePresence },
  dietFormLog: { create: mocks.audit },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 9, role: "dietitian", callerId: 11 }, authType: "supabase" });
  mocks.ownsClient.mockResolvedValue(true);
  mocks.findFirst.mockResolvedValue({ id: 41, clientId: 12, _count: { comments: 0, mealPhotos: 0 } });
  mocks.target.mockResolvedValue({ id: 13 });
  mocks.update.mockResolvedValue({ id: 41, client: { id: 13, name: "Hedef", surname: "Danışan" } });
  mocks.transaction.mockImplementation((fn) => fn(transactionDb));
});

function reassign(body: unknown = { clientId: 13, previousClientId: 12 }, id = "41") {
  return PATCH(new NextRequest(`http://localhost/api/diets/${id}/reassign`, {
    method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" },
  }), { params: Promise.resolve({ id }) });
}

describe("diet creation preserves same-day programs", () => {
  it("creates and lists both programs without replacing the first program's meals", async () => {
    const saved: Array<{ id: number; clientId: number; tarih: Date; oguns: { create: unknown[] } }> = [];
    mocks.create.mockImplementation(async ({ data }) => {
      const diet = { ...data, id: saved.length + 41 };
      saved.push(diet);
      return diet;
    });
    for (const food of ["Elma", "Armut"]) {
      const response = await POST(new NextRequest("http://localhost/api/diets", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: 12, tarih: "2026-11-14T08:00:00Z", oguns: [
          { name: "Kahvaltı", items: [{ besin: food, birim: "Adet", miktar: "1" }] },
        ] }),
      }), context);
      expect(response.status).toBe(200);
    }
    expect(saved).toHaveLength(2);
    expect(saved.map((diet) => diet.id)).toEqual([41, 42]);
    expect(saved[0].oguns.create).toEqual([expect.objectContaining({ items: {
      create: [expect.objectContaining({ besin: { connect: { id: 1 } } })],
    } })]);
    expect(mocks.deleteMeals).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();

    mocks.findMany.mockResolvedValue(saved);
    mocks.count.mockResolvedValue(2);
    const listing = await GET(new NextRequest("http://localhost/api/diets?clientId=12"), context);
    expect((await listing.json()).data.diets.map((diet: { id: number }) => diet.id)).toEqual([41, 42]);
  });

  it("does not save a program for another dietitian's client", async () => {
    mocks.ownsClient.mockResolvedValue(false);
    const response = await POST(new NextRequest("http://localhost/api/diets", {
      method: "POST", body: JSON.stringify({ clientId: 12 }),
    }), context);
    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe("diet reassignment", () => {
  it("moves only the selected program, preserves its meals, revokes old links and records both clients", async () => {
    expect((await reassign()).status).toBe(200);
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 41, dietitianId: 9 } }));
    expect(mocks.target).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 13, dietitianId: 9 } }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 41 },
      data: { clientId: 13, isBirthdayCelebration: false, notifiedAt: null, viewCount: 0, downloadCount: 0 },
    }));
    expect(mocks.deleteMeals).not.toHaveBeenCalled();
    expect(mocks.deleteLinks).toHaveBeenCalledWith({ where: { dietId: 41 } });
    expect(mocks.deletePresence).toHaveBeenCalledWith({ where: { dietId: 41 } });
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({
      dietId: 41, clientId: 13, action: "diet_reassigned",
      metadata: { previousClientId: 12, clientId: 13, callerId: 11 },
    }) });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
  });

  it.each(["client", null])("rejects callers without dietitian access (%s)", async (role) => {
    mocks.auth.mockResolvedValue({ user: role ? { id: 12, role } : null });
    expect((await reassign()).status).toBe(role ? 403 : 401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a program belonging to another dietitian", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect((await reassign()).status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.deleteLinks).not.toHaveBeenCalled();
  });

  it("rejects a target belonging to another dietitian", async () => {
    mocks.target.mockResolvedValue(null);
    expect((await reassign()).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.deleteLinks).not.toHaveBeenCalled();
  });

  it("rejects a stale source client", async () => {
    expect((await reassign({ clientId: 13, previousClientId: 10 })).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([{ comments: 1, mealPhotos: 0 }, { comments: 0, mealPhotos: 1 }])("preserves client-specific conversations/photos (%j)", async (_count) => {
    mocks.findFirst.mockResolvedValue({ clientId: 12, _count });
    expect((await reassign()).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.deleteLinks).not.toHaveBeenCalled();
  });

  it.each([
    { clientId: -1, previousClientId: 12 },
    { clientId: "13", previousClientId: 12 },
    { clientId: 13.5, previousClientId: 12 },
    { clientId: 13 },
    { clientId: 13, previousClientId: 12, oguns: [] },
  ])("rejects invalid request data (%j)", async (body) => {
    expect((await reassign(body)).status).toBe(422);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("requires a different target client", async () => {
    expect((await reassign({ clientId: 12, previousClientId: 12 })).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects malformed diet IDs", async () => {
    expect((await reassign(undefined, "41other")).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns a retryable conflict for a concurrent ownership change", async () => {
    mocks.transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("write conflict", { code: "P2034", clientVersion: "6.5.0" }));
    expect((await reassign()).status).toBe(409);
    expect(mocks.invalidateStats).not.toHaveBeenCalled();
  });
});

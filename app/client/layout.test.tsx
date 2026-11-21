// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ get: vi.fn(), router: { replace: vi.fn() }, auth: { user: { id: "user-1" }, databaseUser: { id: 7, role: "client", isApproved: true }, loading: false, syncError: null as string | null } }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router, usePathname: () => "/client" }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/api-client", () => ({ apiClient: { get: mocks.get } }));
vi.mock("@/components/client/InstallAppCard", () => ({ default: () => null }));
vi.mock("@/components/client/ClientTopNav", () => ({ default: () => null }));
vi.mock("@/components/AuthSyncNotice", () => ({ AuthSyncNotice: () => <p>Oturum yeniden deneme</p> }));
import ClientLayout from "./layout";
beforeEach(() => { vi.clearAllMocks(); mocks.auth.loading = false; mocks.auth.syncError = null; });
afterEach(cleanup);
describe("portal access recovery", () => {
  it("keeps the session on transient privacy/API errors and recovers on retry", async () => {
    mocks.get.mockRejectedValueOnce(new TypeError("Load failed")).mockResolvedValueOnce({ noticeAcknowledged: true, canProcessHealth: true });
    render(<ClientLayout><p>Danışan programı</p></ClientLayout>);
    await screen.findByText("Hesap erişimi şu anda doğrulanamadı. Oturumunuz kapatılmadı.");
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(screen.queryByText("Danışan programı")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Yeniden dene" }));
    await screen.findByText("Danışan programı");
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
  it("does not release protected content or duplicate profile requests while authentication is loading", () => {
    mocks.auth.loading = true;
    render(<ClientLayout><p>Danışan programı</p></ClientLayout>);
    expect(screen.queryByText("Danışan programı")).toBeNull();
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it("still enforces notice acknowledgement", async () => {
    mocks.get.mockResolvedValue({ noticeAcknowledged: false, canProcessHealth: false });
    render(<ClientLayout><p>Danışan programı</p></ClientLayout>);
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/client/kvkk-onay"));
    expect(screen.queryByText("Danışan programı")).toBeNull();
  });
});

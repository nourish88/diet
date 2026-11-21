// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), onAuth: vi.fn(), request: vi.fn(), clear: vi.fn(), replace: vi.fn() }));
vi.mock("./supabase-browser", () => ({ createClient: () => ({ auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuth } }) }));
vi.mock("./api-client", () => ({ apiClient: { clearSessionCache: mocks.clear } }));
vi.mock("./http-request", () => ({ requestJson: mocks.request, describeRequestError: (error: Error) => error.message }));
vi.mock("@/lib/push-notifications", () => ({ removePushNotificationsForCurrentBrowser: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
import { AuthProvider, useAuth } from "./auth-context";
const session = { user: { id: "user-1", email: "test@example.com" }, access_token: "token" };
let callback: (event: string, session: unknown) => unknown;
function State() {
  const auth = useAuth();
  return <div><span>{auth.loading ? "loading" : "settled"}</span><span>{auth.databaseUser?.id ?? "no-profile"}</span><span>{auth.syncError}</span></div>;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.onAuth.mockImplementation((cb) => { callback = cb; return { data: { subscription: { unsubscribe: vi.fn() } } }; });
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
});
afterEach(cleanup);
describe("auth initialization", () => {
  it("keeps loading until the authenticated profile arrives and never returns a promise from the auth listener", async () => {
    let resolve!: (value: unknown) => void;
    mocks.request.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<AuthProvider><State /></AuthProvider>);
    await act(async () => { expect(callback("SIGNED_IN", session)).toBeUndefined(); });
    expect(screen.getByText("loading")).toBeTruthy();
    await act(async () => { resolve({ success: true, user: { id: 7, supabaseId: "user-1" } }); });
    expect(screen.getByText("settled")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
  });
  it("discards a profile response that arrives after sign-out", async () => {
    let resolve!: (value: unknown) => void;
    mocks.request.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<AuthProvider><State /></AuthProvider>);
    await act(async () => { callback("SIGNED_IN", session); });
    await act(async () => { callback("SIGNED_OUT", null); });
    await act(async () => { resolve({ success: true, user: { id: 7, supabaseId: "user-1" } }); });
    expect(screen.queryByText("7")).toBeNull();
    expect(screen.getByText("no-profile")).toBeTruthy();
  });
  it("shows transient failures and retries on reconnection without signing out", async () => {
    mocks.request.mockRejectedValueOnce(new Error("network failure")).mockResolvedValueOnce({ success: true, user: { id: 7, supabaseId: "user-1" } });
    render(<AuthProvider><State /></AuthProvider>);
    await act(async () => { callback("SIGNED_IN", session); });
    expect(screen.getByText("network failure")).toBeTruthy();
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(screen.getByText("7")).toBeTruthy());
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});

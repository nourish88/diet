// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NotificationLogsTable } from "./NotificationLogsTable";
import type { NotificationLog } from "@/lib/notification-log";

afterEach(cleanup);
const base: NotificationLog = {
  id: 1, type: "meal_time", title: null, body: null, status: "success", errorMessage: null,
  sentAt: "2026-01-01T12:00:00Z", receivedAt: null,
  client: { name: "Test", surname: "Danışan" }, ogun: { name: "Öğle", time: "12:00" },
};
it("keeps multiple subscriptions for the same client distinguishable and opens the relevant instructions", () => {
  const deviceInfo = {
    os: "Android", osVersion: "14", browser: "Samsung Internet", browserVersion: "25", model: "SM-S921B",
    standalone: true, permission: "granted", capturedAt: "2025-12-31T10:00:00Z",
  };
  render(<NotificationLogsTable isLoading={false} onRefresh={vi.fn()} logs={[
    { ...base, subscriptionId: 7, deviceInfo },
    { ...base, id: 2, subscriptionId: 8, receivedAt: base.sentAt },
  ]} />);
  expect(screen.getByRole("columnheader", { name: "Hedef cihaz" })).toBeTruthy();
  const row = screen.getByText("Abonelik #7").closest("tr")!;
  expect(within(row).getByText("Model: SM-S921B")).toBeTruthy();
  const summary = within(row).getByText("Kontrol adımları (4)");
  fireEvent.click(summary);
  expect(summary.closest("details")?.open).toBe(true);
  expect(within(row).getByText(/Samsung Internet ve varsa/)).toBeTruthy();
  const otherRow = screen.getByText("Abonelik #8").closest("tr")!;
  expect(within(otherRow).getByText("Ulaştı")).toBeTruthy();
  expect(within(otherRow).queryByText("Model: SM-S921B")).toBeNull();
});
it("offers a useful fallback for legacy rows", () => {
  render(<NotificationLogsTable isLoading={false} onRefresh={vi.fn()} logs={[base]} />);
  expect(screen.getByText(/Bu gönderimde cihaz özellikleri kaydedilmemiş/)).toBeTruthy();
  expect(screen.getByText("Abonelik bilgisi yok")).toBeTruthy();
});
it("refreshes on request and prevents concurrent refresh clicks", () => {
  const onRefresh = vi.fn();
  const view = render(<NotificationLogsTable isLoading={false} onRefresh={onRefresh} logs={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Yenile" }));
  expect(onRefresh).toHaveBeenCalledOnce();
  view.rerender(<NotificationLogsTable isLoading={false} isRefreshing onRefresh={onRefresh} logs={[]} />);
  expect((screen.getByRole("button", { name: "Yenile" }) as HTMLButtonElement).disabled).toBe(true);
});

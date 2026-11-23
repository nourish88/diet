// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NotificationRetry } from "./NotificationRetry";

const mock = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: mock }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetAllMocks(); });
const source = { id: 7, subscriptionId: 4, receivedAt: null };

it("follows the new notification until the phone responds without sending it again", async () => {
  vi.useFakeTimers();
  const attempt = { id: 8, status: "success", sentAt: new Date().toISOString(), receivedAt: null };
  mock.post.mockResolvedValue({ receivedAt: null, attempt });
  mock.get.mockResolvedValue({ receivedAt: null, attempt: { ...attempt, receivedAt: attempt.sentAt } });
  render(<NotificationRetry source={source} />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Tekrar dene" })); });
  expect(mock.post).toHaveBeenCalledWith("/analytics/notification-logs/7/retry", { previousAttemptId: 0 });
  expect(screen.getByRole("status").textContent).toContain("yanıt bekleniyor");
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(screen.getByRole("status").textContent).toBe("Deneme bildirimi telefona ulaştı.");
  expect(mock.post).toHaveBeenCalledTimes(1);
});

it("restores an older inconclusive attempt and checks a late receipt on demand", async () => {
  const attempt = { id: 8, status: "success", sentAt: "2025-01-01T00:00:00Z", receivedAt: null };
  mock.get.mockResolvedValue({ receivedAt: null, attempt: { ...attempt, receivedAt: new Date().toISOString() } });
  render(<NotificationRetry source={{ ...source, retries: [attempt] }} />);
  expect(screen.getByRole("status").textContent).toContain("hâlâ bilinmiyor");
  fireEvent.click(screen.getByRole("button", { name: "Sonuca bak" }));
  expect(await screen.findByText("Deneme bildirimi telefona ulaştı.")).toBeTruthy();
  expect(mock.post).not.toHaveBeenCalled();
});

import { describe, expect, it } from "vitest";
import { diagnoseNotification, getDeviceDeliveryStatus, type NotificationLog } from "./notification-log";

const now = Date.parse("2026-11-17T09:00:00Z");
const base: NotificationLog = {
  id: 1, type: "meal_time", title: null, body: null, status: "success", errorMessage: null,
  sentAt: "2026-11-17T08:00:00Z", receivedAt: null,
  client: { name: "Test", surname: "Danışan" }, ogun: null,
};
const deviceInfo = {
  os: "Android", osVersion: "14", browser: "Samsung Internet", browserVersion: "25.0",
  model: "SM-S921B", standalone: true, permission: "granted", capturedAt: "2026-11-16T09:00:00Z",
};

describe("notification diagnosis", () => {
  it("never treats a missing acknowledgement as proof of a disabled permission or battery restriction", () => {
    const result = diagnoseNotification({ ...base, deviceInfo }, now);
    expect(result.label).toBe("Ulaşmama nedeni belirlenemedi");
    expect(result.detail).toContain("ayırt edilemiyor");
    expect(result.steps.join(" ")).toContain("Samsung Internet");
  });
  it("keeps legacy targets unknown instead of borrowing another device", () => {
    expect(diagnoseNotification(base, now).steps[0]).toContain("kaydedilmemiş");
  });
  it("gives iOS-specific instructions without calling them a proven failure", () => {
    const result = diagnoseNotification({ ...base, deviceInfo: { ...deviceInfo, os: "iOS / iPadOS" } }, now);
    expect(result.steps[0]).toContain("ana ekran simgesinden");
    expect(result.label).toContain("belirlenemedi");
    expect(result.steps.join(" ")).not.toContain("pil");
  });
  it.each([404, 410])("diagnoses invalid subscriptions from actual HTTP %i", (pushStatusCode) => {
    const result = diagnoseNotification({ ...base, status: "failed", pushStatusCode }, now);
    expect(result.label).toBe("Bildirim aboneliği geçersiz");
    expect(result.steps.join(" ")).toContain("kaydını yenile");
  });
  it.each([401, 403, 413, 429, 503])("routes HTTP %i to server remediation", (pushStatusCode) => {
    const result = diagnoseNotification({ ...base, status: "failed", pushStatusCode }, now);
    expect(result.steps[0]).toContain("Teknik ekip");
    expect(result.steps.join(" ")).not.toContain("pil");
  });
  it("reads historical structured error prefixes but does not infer codes from arbitrary message text", () => {
    expect(diagnoseNotification({ ...base, status: "failed", errorMessage: "[410] Gone" }, now).label).toBe("Bildirim aboneliği geçersiz");
    expect(diagnoseNotification({ ...base, status: "failed", errorMessage: "endpoint-410-other" }, now).label).toBe("Sunucu gönderimi tamamlayamadı");
  });
  it("separates sending, waiting, untracked and acknowledged states", () => {
    expect(getDeviceDeliveryStatus({ ...base, status: "pending" }, now)).toBe("sending");
    expect(getDeviceDeliveryStatus({ ...base, sentAt: new Date(now - 1000).toISOString() }, now)).toBe("waiting");
    expect(getDeviceDeliveryStatus({ ...base, sentAt: "2025-01-01T00:00:00Z" }, now)).toBe("untracked");
    expect(getDeviceDeliveryStatus({ ...base, receivedAt: new Date(now).toISOString() }, now)).toBe("delivered");
  });
  it("handles malformed stored device metadata without crashing", () => {
    expect(diagnoseNotification({ ...base, deviceInfo: { capturedAt: "not-a-date" } }, now).steps[0]).toContain("kaydedilmemiş");
  });
});

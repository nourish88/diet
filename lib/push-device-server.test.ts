import { describe, expect, it } from "vitest";
import { buildPushDeviceInfo } from "./push-device-server";
import { PushDeviceReportSchema } from "./push-device";

const androidUA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";
const report = { standalone: true, ios: false, permission: "granted" as const };

describe("device metadata", () => {
  it("does not mistake reduced Android UA placeholders for real hardware", () => {
    expect(buildPushDeviceInfo(androidUA, report)).toMatchObject({ os: "Android", osVersion: null, model: null, browser: "Chrome" });
  });
  it("uses Android client hints when provided", () => {
    expect(buildPushDeviceInfo(androidUA, { ...report, model: "Pixel 9", platformVersion: "15.0.0" }))
      .toMatchObject({ model: "Pixel 9", osVersion: "15.0.0" });
  });
  it("never labels a desktop-mode iPad with the macOS version", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
    expect(buildPushDeviceInfo(ua, { ...report, ios: true })).toMatchObject({ os: "iOS / iPadOS", osVersion: null });
  });
  it("supports old clients and missing user agents without inventing device details", () => {
    expect(buildPushDeviceInfo(null)).toMatchObject({ os: null, browser: null, model: null, permission: null, standalone: null });
  });
  it("bounds metadata and strips unrecognized fields", () => {
    expect(PushDeviceReportSchema.safeParse({ ...report, model: "x".repeat(121) }).success).toBe(false);
    expect(PushDeviceReportSchema.parse({ ...report, endpoint: "secret" })).not.toHaveProperty("endpoint");
    expect(buildPushDeviceInfo(androidUA, report)).not.toHaveProperty("ua");
  });
});

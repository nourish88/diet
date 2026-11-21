import { userAgentFromString } from "next/server";
import type { PushDeviceInfo, PushDeviceReport } from "./push-device";

/** Store normalized diagnostics only, never the raw UA, IP or push endpoint. */
export function buildPushDeviceInfo(userAgent: string | null, report?: PushDeviceReport): PushDeviceInfo {
  const ua = (userAgent ?? "").slice(0, 1024);
  const parsed = userAgentFromString(ua);
  const ios = report?.ios || parsed.os.name === "iOS";
  const android = parsed.os.name === "Android";
  const reducedAndroid = android && /Android 10; K[;)]/.test(ua);
  const bounded = (value: string | undefined, max = 80) => value?.slice(0, max) || null;
  return {
    os: ios ? "iOS / iPadOS" : bounded(parsed.os.name),
    // iPad desktop mode reports macOS; never present that as the iPadOS version.
    osVersion: ios && parsed.os.name !== "iOS" ? null
      : android ? bounded(report?.platformVersion || (reducedAndroid ? undefined : parsed.os.version), 60)
      : bounded(parsed.os.version, 60),
    browser: bounded(parsed.browser.name),
    browserVersion: bounded(parsed.browser.version, 60),
    model: android ? bounded(report?.model || (reducedAndroid ? undefined : parsed.device.model), 120)
      : bounded(parsed.device.model, 120),
    standalone: report?.standalone ?? null,
    permission: report?.permission ?? null,
    capturedAt: new Date().toISOString(),
  };
}

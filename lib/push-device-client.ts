"use client";

import { isIOSDevice, isStandalonePWA } from "./pwa";
import type { PushDeviceReport } from "./push-device";

type HintsNavigator = Navigator & {
  userAgentData?: {
    platform: string;
    getHighEntropyValues?: (keys: string[]) => Promise<{ model?: string; platformVersion?: string }>;
  };
};

export async function collectPushDeviceReport(): Promise<PushDeviceReport> {
  const report: PushDeviceReport = {
    standalone: isStandalonePWA(),
    ios: isIOSDevice(),
    permission: Notification.permission,
  };
  const hints = (navigator as HintsNavigator).userAgentData;
  if (hints?.platform !== "Android" || !hints.getHighEntropyValues) return report;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Some browsers hide model/version. Do not delay or fail registration for it.
    const values = await Promise.race([
      hints.getHighEntropyValues(["model", "platformVersion"]),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 800); }),
    ]);
    if (typeof values?.model === "string") report.model = values.model.slice(0, 120);
    if (typeof values?.platformVersion === "string") report.platformVersion = values.platformVersion.slice(0, 60);
  } catch {
    // Diagnostic metadata is best effort.
  } finally {
    clearTimeout(timer);
  }
  return report;
}

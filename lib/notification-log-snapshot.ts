import { Prisma } from "@prisma/client";
import { readPushDeviceInfo } from "./push-device";

export function notificationDeviceSnapshot(subscription: { id: number; deviceInfo: unknown }) {
  return {
    subscriptionId: subscription.id,
    deviceInfo: readPushDeviceInfo(subscription.deviceInfo) ?? Prisma.DbNull,
  };
}

export function pushErrorStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return null;
  const code = error.statusCode;
  return typeof code === "number" && Number.isInteger(code) && code >= 100 && code <= 599 ? code : null;
}

import { z } from "zod";

// Optional for old clients. Diagnostics must never determine authorization.
export const PushDeviceReportSchema = z.object({
  standalone: z.boolean(),
  ios: z.boolean(),
  permission: z.enum(["granted", "denied", "default"]),
  model: z.string().max(120).optional(),
  platformVersion: z.string().max(60).optional(),
});
export type PushDeviceReport = z.infer<typeof PushDeviceReportSchema>;

export const PushDeviceInfoSchema = z.object({
  os: z.string().max(80).nullable(),
  osVersion: z.string().max(60).nullable(),
  browser: z.string().max(80).nullable(),
  browserVersion: z.string().max(60).nullable(),
  model: z.string().max(120).nullable(),
  standalone: z.boolean().nullable(),
  permission: z.enum(["granted", "denied", "default"]).nullable(),
  capturedAt: z.string().datetime(),
});
export type PushDeviceInfo = z.infer<typeof PushDeviceInfoSchema>;

export function readPushDeviceInfo(value: unknown): PushDeviceInfo | null {
  const parsed = PushDeviceInfoSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

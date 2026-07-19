export const WATER_REMINDER_SLOTS = ["12", "17"] as const;

export type WaterReminderSlot = (typeof WATER_REMINDER_SLOTS)[number];

export const DEFAULT_WATER_REMINDER_SLOT: WaterReminderSlot = "12";

export function parseWaterReminderSlot(
  value: string | null,
): WaterReminderSlot | null {
  return WATER_REMINDER_SLOTS.find((slot) => slot === value) ?? null;
}

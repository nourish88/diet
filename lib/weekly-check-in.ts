export type WeeklyCheckInMode = "initial" | "reminder";

const TURKEY_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Returns a stable UTC-midnight key for the Monday of the evaluated week.
 * Monday reminders belong to the week that ended the previous day.
 */
export function getWeeklyCheckInWeekStart(
  now: Date,
  mode: WeeklyCheckInMode,
): Date {
  const turkeyTime = new Date(now.getTime() + TURKEY_UTC_OFFSET_MS);
  const day = turkeyTime.getUTCDay();
  let daysSinceMonday = (day + 6) % 7;

  if (mode === "reminder" && day === 1) {
    daysSinceMonday = 7;
  }

  return new Date(
    Date.UTC(
      turkeyTime.getUTCFullYear(),
      turkeyTime.getUTCMonth(),
      turkeyTime.getUTCDate() - daysSinceMonday,
    ),
  );
}

export function turkeyDateKey(now = new Date()): string {
  return new Date(now.getTime() + TURKEY_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

export function isDissatisfied(satisfaction: number | null): boolean {
  return satisfaction !== null && satisfaction <= 2;
}

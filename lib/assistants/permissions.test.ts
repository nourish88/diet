import { describe, expect, it } from "vitest";
import {
  defaultAssistantPermissions,
  hasBirthdayPermission,
  mergeAssistantPermissions,
} from "./permissions";

describe("defaultAssistantPermissions", () => {
  it("enables birthday reminders by default", () => {
    expect(defaultAssistantPermissions()).toEqual({
      notifications: { birthdayReminders: true },
    });
  });
});

describe("hasBirthdayPermission", () => {
  it("returns true when explicitly enabled", () => {
    expect(
      hasBirthdayPermission({ notifications: { birthdayReminders: true } }),
    ).toBe(true);
  });

  it("returns false when explicitly disabled", () => {
    expect(
      hasBirthdayPermission({ notifications: { birthdayReminders: false } }),
    ).toBe(false);
  });

  it("returns false when missing", () => {
    expect(hasBirthdayPermission(null)).toBe(false);
    expect(hasBirthdayPermission(undefined)).toBe(false);
    expect(hasBirthdayPermission({})).toBe(false);
    expect(hasBirthdayPermission({ notifications: {} })).toBe(false);
  });
});

describe("mergeAssistantPermissions", () => {
  it("starts from defaults when current is null", () => {
    const merged = mergeAssistantPermissions(null, {
      notifications: { birthdayReminders: false },
    });
    expect(merged.notifications?.birthdayReminders).toBe(false);
  });

  it("preserves existing notification fields not in the patch", () => {
    const merged = mergeAssistantPermissions(
      { notifications: { birthdayReminders: false } },
      { notifications: {} },
    );
    expect(merged.notifications?.birthdayReminders).toBe(false);
  });

  it("overwrites only the specified notification field", () => {
    const merged = mergeAssistantPermissions(
      { notifications: { birthdayReminders: false } },
      { notifications: { birthdayReminders: true } },
    );
    expect(merged.notifications?.birthdayReminders).toBe(true);
  });

  it("returns a new object without mutating the input", () => {
    const current = { notifications: { birthdayReminders: true } };
    const merged = mergeAssistantPermissions(current, {
      notifications: { birthdayReminders: false },
    });
    expect(current.notifications.birthdayReminders).toBe(true);
    expect(merged.notifications?.birthdayReminders).toBe(false);
  });
});

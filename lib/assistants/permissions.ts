import type { AssistantPermissions } from "@/lib/api-auth";

export function defaultAssistantPermissions(): AssistantPermissions {
  return {
    notifications: {
      birthdayReminders: true,
    },
  };
}

export function hasBirthdayPermission(
  permissions: AssistantPermissions | null | undefined
): boolean {
  return permissions?.notifications?.birthdayReminders === true;
}

export function mergeAssistantPermissions(
  current: AssistantPermissions | null | undefined,
  patch: AssistantPermissions
): AssistantPermissions {
  const base = current ?? defaultAssistantPermissions();
  return {
    ...base,
    ...patch,
    notifications: {
      ...(base.notifications ?? {}),
      ...(patch.notifications ?? {}),
    },
  };
}

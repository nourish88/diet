export interface DietFormLog {
  id: number;
  sessionId: string;
  clientId: number | null;
  dietId: number | null;
  action: string;
  fieldName: string | null;
  fieldValue: string | null;
  previousValue: string | null;
  metadata: unknown;
  source: string;
  createdAt: string;
  dietitian: {
    id: number;
    email: string;
  };
}

export type { NotificationLog } from "@/lib/notification-log";

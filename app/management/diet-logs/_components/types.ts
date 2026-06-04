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

export interface NotificationLog {
  id: number;
  type: string;
  title: string | null;
  body: string | null;
  status: string;
  errorMessage: string | null;
  sentAt: string;
  receivedAt: string | null;
  client: {
    name: string;
    surname: string;
  };
  ogun: {
    name: string;
    time: string;
  } | null;
}

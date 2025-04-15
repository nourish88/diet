declare global {
  interface Window {
    pdfMake: any;
  }
}

export interface Diet {
  id: number;
  createdAt: string;
  client?: {
    name?: string;
    surname?: string;
    fullName?: string;
  };
  meals: Array<{
    name: string;
    time: string;
    items: Array<{
      amount: string;
      unit: string;
      name: string;
    }>;
    notes?: string;
  }>;
  weeklyResult?: string;
  target?: string;
  waterConsumption?: string;
  physicalActivity?: string;
  isBirthdayCelebration?: boolean;
}
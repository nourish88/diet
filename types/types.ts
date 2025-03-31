export interface Diet {
  id?: string;
  createdAt?: string;
  weeklyResult?: string;
  target?: string;
  waterConsumption?: string;
  physicalActivity?: string;
  meals?: Meal[];
  client?: {
    fullName: string;
    name?: string;
    surname?: string;
  };
}

export interface Meal {
  name: string;
  time: string;
  items?: MenuItem[];
  notes?: string;
}

export interface MenuItem {
  name: string;
  amount?: string;
  unit?: string;
}

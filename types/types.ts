export interface PDFData {
  id?: number;
  fullName: string;
  dietDate: string;
  weeklyResult: string;
  target: string;
  ogunler: {
    name: string;
    time: string;
    menuItems: string[];
    notes?: string;
    detail?: string;
  }[];
  waterConsumption: string;
  physicalActivity: string;
  isBirthdayCelebration?: boolean;
  isImportantDateCelebrated?: boolean;
  importantDateName?: string;
  importantDateId?: number;
  dietitianNote?: string;
}

export interface Diet {
  id?: number;
  clientId?: number;
  AdSoyad: string;
  Tarih: string | null; // ISO string format or null
  Sonuc: string;
  Hedef: string;
  Su: string;
  Fizik: string;
  Oguns: Ogun[];
  isBirthdayCelebration?: boolean;
  isImportantDateCelebrated?: boolean;
  importantDateId?: number | null;
  importantDateName?: string | null;
  dietitianNote?: string;
}

export interface Ogun {
  id?: number;
  name: string;
  time: string;
  detail: string;
  order: number;
  dietId?: number;
  items: MenuItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Item {
  miktar: string;
  birim: string;
  besin: string;
}

export interface Meal {
  name: string;
  time: string;
  items?: MenuItem[];
  notes?: string;
}

export interface MenuItem {
  id?: number;
  miktar: string;
  birim: Birim | string;
  besin: Besin | string;
  besinPriority?: number | null;
  ogunId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Besin {
  id?: number;
  name: string;
  priority?: number | null;
  menuItems?: MenuItem[];
  createdAt?: Date;
  updatedAt?: Date;
  group?: {
    id: number;
    description: string;
  } | null;
}

export interface Birim {
  id?: number;
  name: string;
}

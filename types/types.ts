export interface Diet {
  AdSoyad: string;
  Tarih: string | null; // ISO string format or null
  Sonuc: string;
  Hedef: string;
  Su: string;
  Fizik: string;
  Oguns: Ogun[];
}

export interface Ogun {
  name: string;
  time: string;
  detail: string;
  order: number;
  items: Item[];
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
  name: string;
  amount?: string;
  unit?: string;
}

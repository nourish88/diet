export interface Diet {
  AdSoyad: string;
  Tarih?: string | null; // ISO string format or null
  Sonuc: string;
  Hedef: string;
  Su: string;
  Fizik: string;
  Oguns: Ogun[];
}

export interface Ogun {
  name: string;
  time: string;
  items: MenuItem[];
  detail: string;
  order: number;
}

export interface MenuItem {
  besin: string;
  miktar: string;
  birim: string;
}

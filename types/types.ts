export interface Diet {
  AdSoyad: string;
  Tarih: string | null;
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

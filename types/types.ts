export interface Diet {
  AdSoyad: string;
  Tarih: string;
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
}

export interface MenuItem {
  besin: string;
  miktar: string;
  birim: string;
}
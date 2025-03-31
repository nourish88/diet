export interface Diet {
  id?: string;
  createdAt?: string;
  AdSoyad?: string;
  Tarih?: string | null;
  Sonuc?: string;
  Hedef?: string;
  Su?: string;
  Fizik?: string;
  Oguns: Ogun[];
  client?: {
    fullName: string;
    name?: string;
    surname?: string;
  };
}

export interface Ogun {
  name: string;
  time: string;
  items: {
    miktar: string;
    birim: string;
    besin: string;
  }[];
  detail: string;
  order: number;
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

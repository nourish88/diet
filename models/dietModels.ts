import { Diet, Ogun, MenuItem, Birim, Besin } from "@/types/types";

// Create an empty menu item template
const emptyMenuItem: MenuItem = {
  miktar: "",
  birim: {} as Birim,
  besin: {} as Besin,
};

// Create default empty menu items for each meal
const defaultMenuItems: MenuItem[] = Array(3).fill(null).map(() => ({ ...emptyMenuItem }));

export const OGUN: Ogun[] = [
  {
    name: "Uyanınca",
    time: "07:00",
    detail: "",
    order: 1,
    items: [...defaultMenuItems],
  },
  {
    name: "Kahvaltı",
    time: "07:30",
    detail: "",
    order: 2,
    items: [...defaultMenuItems],
  },
  {
    name: "İlk Ara Öğün",
    time: "10:00",
    detail: "",
    order: 3,
    items: [...defaultMenuItems],
  },
  {
    name: "Öğlen",
    time: "12:30",
    detail: "",
    order: 4,
    items: [...defaultMenuItems],
  },
  {
    name: "İkindi Ara Öğünü",
    time: "15:30",
    detail: "",
    order: 5,
    items: [...defaultMenuItems],
  },
  {
    name: "Akşam",
    time: "19:30",
    detail: "",
    order: 6,
    items: [...defaultMenuItems],
  },
  {
    name: "Son Ara Öğün",
    time: "21:30",
    detail: "",
    order: 7,
    items: [...defaultMenuItems],
  },
];

export const initialDiet: Diet = {
  AdSoyad: "",
  Tarih: new Date().toISOString(),
  Sonuc: "",
  Hedef: "",
  Su: "",
  Fizik: "",
  Oguns: OGUN,
  dietitianNote: "",
  isBirthdayCelebration: false,
  isImportantDateCelebrated: false,
  importantDateId: null,
  importantDateName: null,
};

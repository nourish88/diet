import { Diet, Ogun } from "@/types/types";
export const OGUN: Ogun[] = [
  {
    name: "",
    time: "",
    detail: "",
    order: 0,
    items: [],
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
};

import { Diet, Ogun } from "@/types/types";
export const OGUN: Ogun[] = [
  {
    time: "07:00",
    items: [
      {
        birim: "",
        miktar: "",
        besin: "",
      },
    ],
    name: "Uyanınca",
    detail: "",
    order: 1,
  },
  {
    time: "07:30",
    items: [
      {
        birim: "",
        miktar: "",
        besin: "",
      },
    ],
    name: "Kahvaltı",
    detail: "",
    order: 2,
  },
  {
    time: "10:00",
    items: [
      {
        birim: "",
        miktar: "",
        besin: "",
      },
    ],
    name: "İlk Ara Öğün",
    detail: "",
    order: 3,
  },
  {
    time: "15:30",
    items: [
      {
        birim: "",
        miktar: "",
        besin: "",
      },
    ],
    name: "Öğlen",
    detail: "",
    order: 5,
  },
  {
    time: "19:30",
    items: [
      {
        birim: "",
        miktar: "",
        besin: "",
      },
    ],
    name: "Akşam",
    detail: "",
    order: 6,
  },
  {
    time: "21:30",
    items: [
      {
        birim: "",
        miktar: "",
        besin: "",
      },
    ],
    name: "Son Ara Öğün",
    detail: "",
    order: 7,
  },
];

export const initialDiet: Diet = {
  Tarih: new Date().toISOString(), // Store as ISO string
  Sonuc: "",
  Hedef: "",
  Su: "",
  Fizik: "",
  Oguns: OGUN,
};

import { describe, expect, it } from "vitest";

import {
  buildDietPdfFileName,
  formatDateForFileName,
  formatDateTR,
  prepareDatabasePdfData,
  prepareDirectPdfData,
} from "@/components/diet/pdf/pdfData";
import { Diet } from "@/types/types";

describe("pdfData", () => {
  it("formats display and file dates", () => {
    expect(formatDateTR("2026-06-02T09:00:00.000Z")).toContain("2026");
    expect(formatDateForFileName("2026-06-02T09:00:00.000Z")).toBe(
      "2026-06-02"
    );
    expect(formatDateTR("not-a-date")).toBe("Geçersiz Tarih");
    expect(formatDateForFileName("not-a-date")).toBe("tarihsiz");
  });

  it("prepares direct diet data with sorted meals and important date message", () => {
    const diet = {
      AdSoyad: "Ayse Yilmaz",
      Tarih: "2026-06-02T09:00:00.000Z",
      Sonuc: "Harika",
      Hedef: "Koruma",
      Su: "2L",
      Fizik: "Yuruyus",
      Oguns: [
        {
          name: "Ogle",
          time: "12:00",
          detail: "Not",
          order: 2,
          items: [{ besin: "Salata", miktar: "1", birim: "kase" }],
        },
        {
          name: "Kahvalti",
          time: "08:00",
          detail: "",
          order: 1,
          items: [{ besin: "Yumurta", miktar: "1", birim: "adet" }],
        },
      ],
      isImportantDateCelebrated: true,
    } satisfies Diet;

    const result = prepareDirectPdfData(diet, undefined, "Kutlama mesaji");

    expect(result?.fullName).toBe("Ayse Yilmaz");
    expect(result?.ogunler.map((meal) => meal.name)).toEqual([
      "Kahvalti",
      "Ogle",
    ]);
    expect(result?.importantDate?.message).toBe("Kutlama mesaji");
  });

  it("prepares database diet data from nested client and lowercase diet fields", () => {
    const result = prepareDatabasePdfData({
      client: { name: "Mehmet", surname: "Kaya" },
      tarih: "2026-06-02T09:00:00.000Z",
      sonuc: "Iyi",
      hedef: "Kilo verme",
      su: "2.5L",
      fizik: "Pilates",
      oguns: [
        {
          name: "Aksam",
          time: "19:00",
          detail: "",
          items: [{ besin: "Corba", miktar: "1", birim: "kase" }],
        },
      ],
    });

    expect(result?.fullName).toBe("Mehmet Kaya");
    expect(result?.ogunler[0].menuItems[0]).toContain("Corba");
    expect(buildDietPdfFileName(result!)).toBe(
      "Beslenme_Programi_Mehmet_Kaya_2026-06-02.pdf"
    );
  });
});

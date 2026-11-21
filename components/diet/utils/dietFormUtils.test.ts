import { describe, expect, it } from "vitest";
import { convertDbDietToUiDiet, getClientFullName, prepareDietDataForPDF } from "./dietFormUtils";
import { prepareDirectPdfData, prepareDatabasePdfData } from "../pdf/pdfData";
import { requireClientName } from "@/lib/client-name";

describe("diet client identity", () => {
  it("uses the saved diet's client even when React's previous selection is stale", () => {
    const diet = convertDbDietToUiDiet({ id: 2, client: { name: "Yeni", surname: "Danışan" }, oguns: [] }, 9, () => "Önceki Danışan");
    expect(diet.AdSoyad).toBe("Yeni Danışan");
  });
  it("preserves the resolved identity when an unnamed historical draft is exported", () => {
    const draft = { AdSoyad: "İsimsiz Danışan", Tarih: "2026-11-21", Sonuc: "", Hedef: "", Su: "", Fizik: "", Oguns: [] };
    const data = prepareDietDataForPDF(draft, "Ayşe Yılmaz", "2026-11-21");
    expect(prepareDirectPdfData(draft, data)?.fullName).toBe("Ayşe Yılmaz");
  });
  it("never downloads a report under a placeholder or whitespace-only client name", () => {
    expect(() => requireClientName("İsimsiz Danışan")).toThrow("Danışan adı");
    expect(() => requireClientName("   ")).toThrow("Danışan adı");
    expect(getClientFullName(null, "Başka Danışan")).toBe("");
    expect(prepareDatabasePdfData({ client: { name: "   " } })?.fullName).toBe("");
  });
});

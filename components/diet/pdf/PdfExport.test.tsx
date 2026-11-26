// @vitest-environment jsdom
import React from "react";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createPdf: vi.fn(), download: vi.fn(), toast: vi.fn(), assets: vi.fn() }));
vi.mock("@/lib/pdfmake", () => ({ ensurePdfMake: async () => ({ createPdf: mocks.createPdf }) }));
vi.mock("@/lib/api-client", () => ({ apiClient: { post: vi.fn().mockResolvedValue({}) } }));
vi.mock("@/components/ui/use-toast", () => ({ toast: mocks.toast }));
vi.mock("./pdfAssets", async (importOriginal) => ({ ...await importOriginal<object>(), loadDietPdfAssets: mocks.assets }));
import DirectPDFButton from "@/components/DirectPDFButton";
import DatabasePDFButton from "@/components/DatabasePDFButton";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createPdf.mockReturnValue({ download: mocks.download });
  mocks.assets.mockResolvedValue({ logo: `data:image/png;base64,${readFileSync(join(process.cwd(), "public/ezgi_evgin.png")).toString("base64")}`, nazar: "" });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("diet PDF export", () => {
  it.each(["direct", "database"])("includes the correct name and header logo in the %s PDF", async (kind) => {
    const fullName = "Deneme Danışanı";
    if (kind === "direct") render(<DirectPDFButton pdfData={{ fullName, dietDate: "2026-11-21", weeklyResult: "", target: "", ogunler: [{ name: "Öğle", time: "12:00", menuItems: ["1 kase çorba"], notes: "" }], waterConsumption: "", physicalActivity: "" }} />);
    else render(<DatabasePDFButton diet={{
      client: { name: "Deneme", surname: "Danışanı" }, tarih: "2026-11-21",
      hedef: "Öğün düzeni", sonuc: "Planlanan öğünler tamamlandı",
      su: "Gün içine yayılacak", fizik: "Yürüyüş", dietitianNote: "Bir sonraki görüşmede birlikte değerlendirelim.",
      oguns: [
        { name: "Kahvaltı", time: "08:30", items: [{ besin: "Yumurta", miktar: "1", birim: "adet" }] },
        { name: "Öğle", time: "12:30", detail: "Evde veya işte", items: [{ besin: "Çorba", miktar: "1", birim: "kase" }] },
        { name: "Akşam", time: "19:00", items: [{ besin: "Sebze yemeği", miktar: "1", birim: "porsiyon" }] },
      ],
    }} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce());
    const definition = mocks.createPdf.mock.calls[0][0];
    expect(JSON.stringify(definition.content)).toContain(fullName);
    expect(definition.content[0].columns[0].image).toMatch(/^data:image\/png;base64,/);
    expect(definition.content[0].columns[1].stack).toContainEqual(expect.objectContaining({ text: fullName }));
    expect(definition.background).toBeUndefined();
    const table = definition.content.find((item: { table?: object }) => item.table).table;
    expect(table.body[0].map((cell: { text: string }) => cell.text).includes("Notlar")).toBe(kind === "database");
    // Render the actual component definition through pdfmake, including bundled fonts.
    const require = createRequire(import.meta.url);
    const Printer = require("pdfmake");
    const vfs = require("pdfmake/build/vfs_fonts");
    const font = (name: string) => Buffer.from(vfs[name], "base64");
    const printer = new Printer({ Roboto: { normal: font("Roboto-Regular.ttf"), bold: font("Roboto-Medium.ttf"), italics: font("Roboto-Italic.ttf"), bolditalics: font("Roboto-MediumItalic.ttf") } });
    const document = printer.createPdfKitDocument(definition);
    const chunks: Buffer[] = [];
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      document.on("data", (chunk: Buffer) => chunks.push(chunk));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);
      document.end();
    });
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    if (process.env.DIET_PDF_PREVIEW === "1") writeFileSync(join(tmpdir(), `diet-${kind}-preview.pdf`), buffer);
  });
  it("stops before generating a nameless PDF and reports a failed export", async () => {
    const ref = React.createRef<import("@/components/DirectPDFButton").DirectPDFButtonHandle>();
    render(<DirectPDFButton ref={ref} hidden diet={{ AdSoyad: "İsimsiz Danışan", Tarih: "2026-11-21", Sonuc: "", Hedef: "", Su: "", Fizik: "", Oguns: [] }} />);
    let result: boolean | undefined;
    await act(async () => { result = await ref.current!.generate(); });
    expect(result).toBe(false);
    expect(mocks.createPdf).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });
});

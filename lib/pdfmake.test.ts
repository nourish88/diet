import { afterEach, expect, it, vi } from "vitest";
vi.mock("pdfmake/build/pdfmake", () => ({ default: {} }));
vi.mock("pdfmake/build/vfs_fonts", () => ({ default: { "Roboto-Regular.ttf": "font-data" } }));
afterEach(() => vi.unstubAllGlobals());
it("registers the flat VFS export used by the installed pdfmake version", async () => {
  vi.stubGlobal("window", {});
  const { ensurePdfMake } = await import("./pdfmake");
  expect((await ensurePdfMake()).vfs["Roboto-Regular.ttf"]).toBe("font-data");
});

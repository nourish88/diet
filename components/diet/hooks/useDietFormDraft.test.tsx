// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { Diet } from "@/types/types";
import { useDietFormDraft } from "./useDietFormDraft";
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const diet = { AdSoyad: "Önceki Danışan", Oguns: [{ items: [{ name: "Önceki menü" }] }] } as unknown as Diet;
describe("diet draft identity during slow client changes", () => {
  it("never persists the previous client's meals under a new selection while loading", () => {
    renderHook(() => useDietFormDraft(diet, vi.fn(), 2, false, false));
    act(() => vi.advanceTimersByTime(60000));
    expect(localStorage.getItem("diet-draft-2")).toBe(null);
  });
  it("preserves an existing draft until the user decides and restores the current verified name", () => {
    localStorage.setItem("diet-draft-2", JSON.stringify(diet));
    const setDiet = vi.fn();
    const { result } = renderHook(() => useDietFormDraft({ ...diet, AdSoyad: "Doğru Danışan" }, setDiet, 2, false, true));
    expect(result.current.showDraftPrompt).toBe(true);
    act(() => vi.advanceTimersByTime(60000));
    expect(JSON.parse(localStorage.getItem("diet-draft-2")!).AdSoyad).toBe("Önceki Danışan");
    act(() => result.current.restoreDraft());
    expect(setDiet).toHaveBeenCalledWith(expect.objectContaining({ AdSoyad: "Doğru Danışan", clientId: 2 }));
  });
});

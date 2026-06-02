import { describe, expect, it } from "vitest";

import {
  getMenuItemName,
  getMenuItemPriority,
  reorderMeals,
  sortMenuItemsByPriority,
} from "@/components/diet/utils/dietTableUtils";
import { MenuItem, Ogun } from "@/types/types";

describe("dietTableUtils", () => {
  it("reorders meals without mutating the original list", () => {
    const meals = [
      { name: "Kahvalti", order: 1, time: "", detail: "", items: [] },
      { name: "Ogle", order: 2, time: "", detail: "", items: [] },
      { name: "Aksam", order: 3, time: "", detail: "", items: [] },
    ] satisfies Ogun[];

    const result = reorderMeals(meals, 0, 2);

    expect(result.map((meal) => meal.name)).toEqual([
      "Ogle",
      "Aksam",
      "Kahvalti",
    ]);
    expect(meals.map((meal) => meal.name)).toEqual([
      "Kahvalti",
      "Ogle",
      "Aksam",
    ]);
  });

  it("reads priority and name from string or object food values", () => {
    const stringItem = {
      besin: "Yumurta",
      birim: "adet",
      miktar: "1",
      besinPriority: 2,
    } satisfies MenuItem;
    const objectItem = {
      besin: { name: "Avokado", priority: 1 },
      birim: { name: "gram" },
      miktar: "50",
    } satisfies MenuItem;

    expect(getMenuItemName(stringItem)).toBe("Yumurta");
    expect(getMenuItemName(objectItem)).toBe("Avokado");
    expect(getMenuItemPriority(stringItem)).toBe(2);
    expect(getMenuItemPriority(objectItem)).toBe(1);
  });

  it("sorts menu items by priority, Turkish name, then original order", () => {
    const items = [
      { besin: "Zeytin", birim: "adet", miktar: "5", besinPriority: 2 },
      { besin: "cilek", birim: "gram", miktar: "100", besinPriority: 1 },
      { besin: "Armut", birim: "adet", miktar: "1", besinPriority: 1 },
      { besin: "Armut", birim: "adet", miktar: "2", besinPriority: 1 },
      { besin: "Ekmek", birim: "dilim", miktar: "1" },
    ] satisfies MenuItem[];

    const result = sortMenuItemsByPriority(items);

    expect(result.map((item) => item.miktar)).toEqual([
      "1",
      "2",
      "100",
      "5",
      "1",
    ]);
  });
});

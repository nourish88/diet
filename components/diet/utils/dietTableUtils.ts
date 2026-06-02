import { MenuItem, Ogun } from "@/types/types";

export const reorderMeals = (
  meals: Ogun[],
  startIndex: number,
  endIndex: number
) => {
  const result = Array.from(meals);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export const getMenuItemPriority = (item: MenuItem) => {
  if (
    typeof item.besinPriority === "number" &&
    !Number.isNaN(item.besinPriority)
  ) {
    return item.besinPriority;
  }

  if (
    typeof item.besin === "object" &&
    item.besin &&
    typeof item.besin.priority === "number"
  ) {
    return item.besin.priority ?? Number.POSITIVE_INFINITY;
  }

  return Number.POSITIVE_INFINITY;
};

export const getMenuItemName = (item: MenuItem) => {
  if (typeof item.besin === "string") {
    return item.besin || "";
  }

  if (
    typeof item.besin === "object" &&
    item.besin &&
    typeof item.besin.name === "string"
  ) {
    return item.besin.name;
  }

  return "";
};

export const sortMenuItemsByPriority = (items: MenuItem[]) =>
  items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((a, b) => {
      const priorityDiff =
        getMenuItemPriority(a.item) - getMenuItemPriority(b.item);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const nameDiff = getMenuItemName(a.item).localeCompare(
        getMenuItemName(b.item),
        "tr",
        { sensitivity: "base" }
      );
      if (nameDiff !== 0) {
        return nameDiff;
      }

      return a.originalIndex - b.originalIndex;
    })
    .map(({ item }) => item);

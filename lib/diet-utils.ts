type TimeLike = {
  time?: string | null;
  order?: number | null;
};

const emojiPattern =
  /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Component}\uFE0F\u200D]+/gu;

const stripEmojiFromString = (value: string): string => {
  if (!value) {
    return "";
  }

  return Array.from(value)
    .filter((char) => {
      // Always keep ASCII digits
      if (char >= "0" && char <= "9") {
        return true;
      }

      emojiPattern.lastIndex = 0;
      return !emojiPattern.test(char);
    })
    .join("");
};

const flattenValue = (value: unknown, visited = new WeakSet<object>()): string => {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : "";
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (Array.isArray(value)) {
    return value.map((item) => flattenValue(item, visited)).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (visited.has(obj)) {
      return "";
    }
    visited.add(obj);

    if (typeof obj.name === "string") {
      return obj.name;
    }

    if (typeof obj.label === "string") {
      return obj.label;
    }

    if (typeof obj.value === "string") {
      return obj.value;
    }

    return Object.values(obj)
      .map((item) => flattenValue(item, visited))
      .filter(Boolean)
      .join(" ");
  }

  return "";
};

const ZERO_WIDTH_SPACE = "\u200B";
const MIN_SOFT_BREAK_LENGTH = 32;

const insertSoftBreaks = (text: string, limit = MIN_SOFT_BREAK_LENGTH): string => {
  if (typeof text !== "string" || text.length <= limit) {
    return text;
  }

  const effectiveLimit = Math.max(limit, MIN_SOFT_BREAK_LENGTH);
  const pattern = new RegExp(`([^\\s]{${effectiveLimit}})(?=[^\\s])`, "g");
  return text.replace(pattern, `$1${ZERO_WIDTH_SPACE}`);
};

const parseTimeToMinutes = (rawTime?: string | null): number => {
  if (!rawTime) {
    return Number.POSITIVE_INFINITY;
  }

  const cleaned = rawTime.toString().trim();
  if (!cleaned) {
    return Number.POSITIVE_INFINITY;
  }

  const normalized = cleaned.replace(/[^\d:]/g, "");
  if (!normalized) {
    return Number.POSITIVE_INFINITY;
  }

  const parts = normalized.split(":");
  const [hourPart, minutePart] = [
    parts[0],
    parts.length > 1 ? parts[1] : "0",
  ];

  const hour = Math.max(0, Math.min(23, parseInt(hourPart || "0", 10)));
  const minute = Math.max(0, Math.min(59, parseInt(minutePart || "0", 10)));

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return Number.POSITIVE_INFINITY;
  }

  return hour * 60 + minute;
};

export const sortMealsByTime = <T extends TimeLike>(meals: T[]): T[] => {
  if (!Array.isArray(meals) || meals.length === 0) {
    return meals;
  }

  const enriched = meals.map((meal, index) => ({
    meal,
    index,
    minutes: parseTimeToMinutes(meal.time),
    originalOrder:
      typeof meal.order === "number" && Number.isFinite(meal.order)
        ? meal.order
        : index + 1,
  }));

  enriched.sort((a, b) => {
    if (a.minutes === b.minutes) {
      if (a.originalOrder === b.originalOrder) {
        return a.index - b.index;
      }
      return a.originalOrder - b.originalOrder;
    }
    return a.minutes - b.minutes;
  });

  enriched.forEach(({ meal }, position) => {
    if (meal) {
      (meal as any).order = position + 1;
    }
  });

  return enriched.map(({ meal }) => meal);
};

export const formatMenuItemText = (item: unknown): string => {
  if (item == null) {
    return "";
  }

  if (typeof item === "string" || typeof item === "number") {
    return item.toString().trim();
  }

  if (typeof item !== "object") {
    return "";
  }

  const obj = item as Record<string, unknown>;

  if (
    obj &&
    typeof obj === "object" &&
    "type" in obj &&
    obj.type === "menuItem"
  ) {
    const miktarValue = flattenValue(obj.miktar);
    const birimValue = flattenValue(obj.birim);
    const besinValue = flattenValue(obj.besin);
    const detailValue = flattenValue(obj.detail ?? obj.notes);

    const parts = [miktarValue, birimValue, besinValue]
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const mainText = parts.join(" ").trim();
    const detailText = detailValue.replace(/\s+/g, " ").trim();

    if (mainText && detailText) {
      return `${mainText} (${detailText})`;
    }

    if (mainText) {
      return mainText;
    }

    if (detailText) {
      return detailText;
    }
  }

  const parts = [
    flattenValue(obj.miktar),
    flattenValue(obj.birim),
    flattenValue(obj.besin),
  ].filter(Boolean);

  if (parts.length === 0) {
    return flattenValue(item).replace(/\s+/g, " ").trim();
  }

  const detail = flattenValue(obj.detail ?? obj.notes);
  const formatted = parts.join(" ").replace(/\s+/g, " ").trim();

  if (detail) {
    return `${formatted} (${detail.replace(/\s+/g, " ").trim()})`.trim();
  }

  return formatted;
};

const sanitizeNoteTextWithOptions = (
  value: unknown,
  options: { removeEmojis?: boolean } = {}
) => {
  const { removeEmojis = false } = options;

  let raw = flattenValue(value).replace(/\r\n/g, "\n");
  if (removeEmojis) {
    raw = stripEmojiFromString(raw);
  }

  const lines = raw
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const text = lines.length > 0 ? lines.join("\n") : "-";

  return { text };
};

export const sanitizeNoteText = (value: unknown): string => {
  const { text } = sanitizeNoteTextWithOptions(value);
  return text
    .split("\n")
    .map((line) => insertSoftBreaks(line))
    .join("\n");
};

export const sanitizeMealNote = (value: unknown): string => {
  const { text } = sanitizeNoteTextWithOptions(value, { removeEmojis: true });
  return text
    .split("\n")
    .map((line) => insertSoftBreaks(line))
    .join("\n");
};

export const sanitizeMenuItems = (items: unknown[]): string[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => formatMenuItemText(item))
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((text) => insertSoftBreaks(text));
};

export const stripEmojis = (text: string): string => {
  return stripEmojiFromString(text);
};


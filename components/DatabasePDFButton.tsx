import { useEffect, useState } from "react";
import { Button, ButtonProps } from "./ui/button";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import twemoji from "twemoji";
import { ensurePdfMake } from "@/lib/pdfmake";
import {
  sanitizeMenuItems,
  sanitizeMealNote,
  sortMealsByTime,
} from "@/lib/diet-utils";
interface TableCell {
  text?: string | any[];
  style: string;
  alignment: string;
  colSpan?: number;
}
type PDFContentItem = {
  text?: string;
  style?: string;
  margin?: number[];
  columns?: any[];
  stack?: any[];
  table?: {
    widths?: (string | number)[];
    headerRows?: number;
    body?: any[][];
  };
  layout?: any;
  image?: string;
  width?: number;
  opacity?: number;
  alignment?: string;
  absolutePosition?: { x: number; y: number };
};
interface PDFData {
  fullName: string;
  dietDate: string;
  weeklyResult: string;
  target: string;
  ogunler: {
    name: string;
    time: string;
    menuItems: string[];
    notes: string;
  }[];
  waterConsumption: string;
  physicalActivity: string;
  isBirthdayCelebration?: boolean;
  dietitianNote?: string;
}

const buildInlineColumns = (
  parts: Array<{
    text?: string;
    image?: string;
    width?: number;
    height?: number;
  }>,
  options?: { textStyle?: string; imageMarginTop?: number }
) => {
  const columnGap = 3;
  return {
    columns: parts.map((part) => {
      if (part.image) {
        return {
          image: part.image,
          width: part.width || 12,
          height: part.height || 12,
          margin: [0, options?.imageMarginTop ?? -1, 0, 0],
        };
      }
      return {
        text: part.text ?? "",
        width: "auto",
        style: options?.textStyle,
      };
    }),
    columnGap,
  } as any;
};

interface DatabasePDFButtonProps extends ButtonProps {
  diet: any;
}

const DatabasePDFButton = ({
  diet,
  className,
  ...props
}: DatabasePDFButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundDataUrl, setBackgroundDataUrl] = useState<string>("");
  const [nazarBoncuguDataUrl, setNazarBoncuguDataUrl] = useState<string>("");

  useEffect(() => {
    const loadBackgroundImage = async () => {
      try {
        const response = await fetch("/ezgi_evgin.png");
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setBackgroundDataUrl(reader.result as string);
        reader.readAsDataURL(blob);

        // Load nazar boncuğu image
        const nazarResponse = await fetch("/nazar-boncugu.png");
        if (nazarResponse.ok) {
          const nazarBlob = await nazarResponse.blob();
          const nazarReader = new FileReader();
          nazarReader.onloadend = () => {
            setNazarBoncuguDataUrl(nazarReader.result as string);
            console.log("Nazar boncuğu loaded successfully");
          };
          nazarReader.readAsDataURL(nazarBlob);
        }
      } catch (error) {
        console.error("Error loading background image:", error);
      }
    };
    loadBackgroundImage();
  }, []);

  const formatDateTR = (dateString: string | null | undefined) => {
    if (!dateString) return "Tarih Belirtilmemiş";
    console.log("formatDateTR received:", dateString, typeof dateString);
    try {
      const date = new Date(dateString);
      console.log("Parsed date:", date, "isValid:", !isNaN(date.getTime()));
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
      }
      return format(date, "d MMMM yyyy", { locale: tr });
    } catch (error) {
      console.error("Date parsing error:", error, "Input:", dateString);
      return "Geçersiz Tarih";
    }
  };

  const generatePDF = async () => {
    try {
      setIsLoading(true);
      const pdfMake = await ensurePdfMake();
      if (!backgroundDataUrl) throw new Error("Logo yüklenemedi");

      const pdfData = preparePdfDataFromDatabase(diet);
      if (!pdfData) throw new Error("Beslenme programı verisi bulunamadı");

      console.log("PDF data prepared:", pdfData);

      // Wait for nazar boncuğu image to load if weekly result exists
      if (
        pdfData.weeklyResult &&
        pdfData.weeklyResult.trim() &&
        pdfData.weeklyResult !== "Sonuç belirtilmemiş" &&
        !nazarBoncuguDataUrl
      ) {
        // Wait a bit for image to load
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const docDefinition = await createDocDefinition(
        pdfData,
        backgroundDataUrl,
        nazarBoncuguDataUrl
      );
      const fileName = `Beslenme_Programi_${pdfData.fullName.replace(
        /\s+/g,
        "_"
      )}_${formatDateForFileName(pdfData.dietDate)}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error("PDF oluşturma hatası:", error);
      alert(`PDF oluşturulamadı: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateForFileName = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime())
      ? format(date, "yyyy-MM-dd")
      : "tarihsiz";
  };

  const preparePdfDataFromDatabase = (diet: any): PDFData | null => {
    if (!diet) return null;

    console.log("Preparing PDF data from database diet:", diet);

    let clientName = "İsimsiz Danışan";
    if (diet.client) {
      clientName =
        diet.client.fullName ||
        `${diet.client.name || ""} ${diet.client.surname || ""}`.trim();
    }

    const unsortedMeals: PDFData["ogunler"] = (diet.oguns || []).map(
      (ogun: any) => {
        const menuItems = sanitizeMenuItems(
          Array.isArray(ogun.items) ? ogun.items : []
        );

        return {
          name: (ogun.name || "Belirtilmemiş").toString(),
          time: (ogun.time || "").toString(),
          menuItems: menuItems.length > 0 ? menuItems : ["-"],
          notes: sanitizeMealNote(ogun.detail || ogun.notes || ""),
        };
      }
    ) as PDFData["ogunler"];

    const sortedMeals = sortMealsByTime(unsortedMeals);

    const pdfData = {
      fullName: clientName,
      dietDate: diet.tarih || diet.createdAt || new Date().toISOString(),
      weeklyResult: diet.sonuc || "Sonuç belirtilmemiş",
      target: diet.hedef || "Hedef belirtilmemiş",
      ogunler: sortedMeals,
      waterConsumption: diet.su || "Belirtilmemiş",
      physicalActivity: diet.fizik || "Belirtilmemiş",
      isBirthdayCelebration: diet.isBirthdayCelebration || false,
      dietitianNote: diet.dietitianNote || "",
    };

    console.log("Prepared PDF data:", pdfData);
    return pdfData;
  };

  // Convert emojis in text to base64 images using twemoji
  const convertEmojisToImages = async (text: string): Promise<any[]> => {
    console.log(
      "[EMOJI DEBUG DB] convertEmojisToImages called with text:",
      text
    );
    if (!text) {
      console.log("[EMOJI DEBUG DB] Text is empty, returning empty array");
      return [{ text: "" }];
    }

    const parts: any[] = [];
    // Match Unicode emojis including variations
    const unicodeEmojiRegex =
      /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)/gu;

    // Match text-based emojis like :) :( :D etc.
    const textEmojiMap: { [key: string]: string } = {
      ":)": "1f642", // 🙂
      ":-)": "1f642",
      "(:": "1f642",
      ":(": "1f641", // 🙁
      ":-(": "1f641",
      ":D": "1f600", // 😀
      ":-D": "1f600",
      ":P": "1f61b", // 😛
      ":-P": "1f61b",
      ";)": "1f609", // 😉
      ";-)": "1f609",
      ":O": "1f62e", // 😮
      ":-O": "1f62e",
      ":*": "1f618", // 😘
      ":-*": "1f618",
      "<3": "2764", // ❤️
      "</3": "1f494", // 💔
      ":3": "1f60a", // 😊
    };

    let lastIndex = 0;
    let match;
    const matches: Array<{
      index: number;
      emoji: string;
      isUnicode: boolean;
      originalText?: string;
    }> = [];

    // Collect Unicode emoji matches
    const unicodeRegex = new RegExp(
      unicodeEmojiRegex.source,
      unicodeEmojiRegex.flags
    );
    while ((match = unicodeRegex.exec(text)) !== null) {
      matches.push({ index: match.index, emoji: match[0], isUnicode: true });
      console.log(
        "[EMOJI DEBUG DB] Found Unicode emoji:",
        match[0],
        "at index:",
        match.index
      );
    }

    // Collect text-based emoji matches
    for (const [textEmoji, unicodeCode] of Object.entries(textEmojiMap)) {
      let searchIndex = 0;
      while ((searchIndex = text.indexOf(textEmoji, searchIndex)) !== -1) {
        // Check if this position is not already covered by a Unicode emoji match
        const isOverlapping = matches.some((m) => {
          if (m.isUnicode) {
            return (
              m.index <= searchIndex && m.index + m.emoji.length > searchIndex
            );
          } else {
            // For text emojis, we need to find the original text
            const textEmojiKey = Object.keys(textEmojiMap).find(
              (key) => textEmojiMap[key] === m.emoji
            );
            if (textEmojiKey) {
              return (
                m.index <= searchIndex &&
                m.index + textEmojiKey.length > searchIndex
              );
            }
          }
          return false;
        });
        if (!isOverlapping) {
          matches.push({
            index: searchIndex,
            emoji: unicodeCode,
            isUnicode: false,
            originalText: textEmoji,
          });
          console.log(
            "[EMOJI DEBUG DB] Found text emoji:",
            textEmoji,
            "at index:",
            searchIndex,
            "mapped to:",
            unicodeCode
          );
        }
        searchIndex += textEmoji.length;
      }
    }

    console.log(
      "[EMOJI DEBUG DB] Total matches found:",
      matches.length,
      matches
    );

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Process each match
    for (const matchData of matches) {
      // Add text before emoji
      if (matchData.index > lastIndex) {
        const textBefore = text.substring(lastIndex, matchData.index);
        console.log("[EMOJI DEBUG DB] Adding text before emoji:", textBefore);
        parts.push({
          text: textBefore,
        });
      }

      // Convert emoji to image
      try {
        let emojiCode: string;
        if (matchData.isUnicode) {
          // Unicode emoji
          if (twemoji && twemoji.convert && twemoji.convert.toCodePoint) {
            emojiCode = twemoji.convert.toCodePoint(matchData.emoji);
            console.log(
              "[EMOJI DEBUG DB] Unicode emoji converted:",
              matchData.emoji,
              "->",
              emojiCode
            );
          } else {
            // Fallback: manual conversion
            emojiCode = Array.from(matchData.emoji)
              .map((char) => char.codePointAt(0)?.toString(16))
              .filter(Boolean)
              .join("-");
            console.log(
              "[EMOJI DEBUG DB] Manual Unicode conversion:",
              matchData.emoji,
              "->",
              emojiCode
            );
          }
        } else {
          // Text-based emoji - already have the code
          emojiCode = matchData.emoji;
          console.log("[EMOJI DEBUG DB] Text emoji code:", emojiCode);
        }

        const svgUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${emojiCode}.svg`;
        console.log("[EMOJI DEBUG DB] Fetching SVG from:", svgUrl);

        // Fetch SVG and convert to base64 data URL
        const response = await fetch(svgUrl);
        console.log(
          "[EMOJI DEBUG DB] Fetch response status:",
          response.status,
          response.ok
        );
        if (response.ok) {
          const svgText = await response.text();
          // Convert SVG to base64 data URL
          const svgBase64 = btoa(unescape(encodeURIComponent(svgText)));
          const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

          console.log(
            "[EMOJI DEBUG DB] SVG data URL length:",
            svgDataUrl?.length,
            "First 50 chars:",
            svgDataUrl?.substring(0, 50)
          );

          // Try PNG conversion as fallback, but first try SVG directly
          try {
            // Convert SVG to PNG using canvas for better compatibility
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (ctx) {
              canvas.width = 24;
              canvas.height = 24;

              const img = new Image();
              const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
              const url = URL.createObjectURL(svgBlob);

              await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                  ctx.drawImage(img, 0, 0, 24, 24);
                  const pngDataUrl = canvas.toDataURL("image/png");
                  console.log(
                    "[EMOJI DEBUG DB] PNG conversion successful, data URL length:",
                    pngDataUrl?.length
                  );
                  // Try using data URL directly (ChatGPT suggests this format)
                  parts.push({
                    image: pngDataUrl, // Use data URL as ChatGPT suggested
                    width: 12,
                    height: 12,
                  });
                  console.log(
                    "[EMOJI DEBUG DB] Added PNG image part to array (data URL format)"
                  );
                  URL.revokeObjectURL(url);
                  resolve();
                };
                img.onerror = () => {
                  console.warn(
                    "[EMOJI DEBUG DB] PNG conversion failed, using SVG data URL"
                  );
                  // Use SVG data URL directly
                  parts.push({
                    image: svgDataUrl, // Use data URL as ChatGPT suggested
                    width: 12,
                    height: 12,
                  });
                  URL.revokeObjectURL(url);
                  resolve();
                };
                img.src = url;
              });
            } else {
              // Fallback to SVG if canvas not available
              parts.push({
                image: svgDataUrl, // Use data URL as ChatGPT suggested
                width: 12,
                height: 12,
              });
              console.log(
                "[EMOJI DEBUG DB] Added SVG image part to array (canvas not available, data URL)"
              );
            }
          } catch (error) {
            console.warn(
              "[EMOJI DEBUG DB] Error converting to PNG, using SVG:",
              error
            );
            parts.push({
              image: svgDataUrl, // Use data URL as ChatGPT suggested
              width: 12,
              height: 12,
            });
          }
        } else {
          // Fallback: keep original text
          const originalText = matchData.isUnicode
            ? matchData.emoji
            : matchData.originalText || "";
          console.warn(
            `[EMOJI DEBUG DB] Failed to fetch emoji SVG for ${emojiCode}: ${response.status}, using text: ${originalText}`
          );
          parts.push({ text: originalText });
        }
      } catch (error) {
        // Fallback: keep original text
        const originalText = matchData.isUnicode
          ? matchData.emoji
          : matchData.originalText || "";
        console.error(
          `[EMOJI DEBUG DB] Error converting emoji ${matchData.emoji}:`,
          error
        );
        parts.push({ text: originalText });
      }

      lastIndex =
        matchData.index +
        (matchData.isUnicode
          ? matchData.emoji.length
          : matchData.originalText?.length || 0);
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      console.log("[EMOJI DEBUG DB] Adding remaining text:", remainingText);
      parts.push({
        text: remainingText,
      });
    }

    console.log("[EMOJI DEBUG DB] Final parts array:", parts);
    return parts.length > 0 ? parts : [{ text }];
  };

  const buildMealTableRows = async (dietData: PDFData) => {
    const rows: TableCell[][] = [
      [
        { text: "ÖĞÜN", style: "tableHeader", alignment: "center" },
        { text: "SAAT", style: "tableHeader", alignment: "center" },
        { text: "MENÜ", style: "tableHeader", alignment: "center" },
        { text: "NOTLAR", style: "tableHeader", alignment: "center" },
      ],
    ];

    for (const ogun of dietData.ogunler) {
      const menuItems =
        Array.isArray(ogun.menuItems) && ogun.menuItems.length > 0
          ? ogun.menuItems
          : ["-"];
      const hasRealItems = menuItems.some(
        (item) => item && item.trim() && item.trim() !== "-"
      );
      const menuText = hasRealItems
        ? menuItems.map((item) => `• ${item}`).join("\n")
        : "-";
      const cleanedNote = sanitizeMealNote(ogun.notes);
      const noteCell = {
        text: cleanedNote || "-",
        style: "tableCell",
        alignment: "left",
        noWrap: false,
      };
      rows.push([
        {
          text: ogun.name || "-",
          style: "tableCell",
          alignment: "center",
        },
        {
          text: ogun.time || "-",
          style: "tableCell",
          alignment: "center",
        },
        {
          text: menuText,
          style: "tableCell",
          alignment: "left",
        },
        noteCell as any,
      ]);
    }

    // Append water consumption row only if it has a value
    if (dietData.waterConsumption?.trim()) {
      rows.push([
        {
          text: "SU TÜKETİMİ",
          style: "tableCell",
          alignment: "left",
          colSpan: 2,
        },
        {
          text: "",
          style: "tableCell",
          alignment: "left",
        },
        {
          text: dietData.waterConsumption,
          style: "tableCell",
          alignment: "left",
          colSpan: 2,
        },
        {
          text: "",
          style: "tableCell",
          alignment: "left",
        },
      ]);
    }

    // Append physical activity row only if it has a value
    if (dietData.physicalActivity?.trim()) {
      rows.push([
        {
          text: "FİZİKSEL AKTİVİTE",
          style: "tableCell",
          alignment: "left",
          colSpan: 2,
        },
        {
          text: "",
          style: "tableCell",
          alignment: "left",
        },
        {
          text: dietData.physicalActivity,
          style: "tableCell",
          alignment: "left",
          colSpan: 2,
        },
        {
          text: "",
          style: "tableCell",
          alignment: "left",
        },
      ]);
    }

    return rows;
  };

  // Create circular badge with nazar boncuğu as base64 image
  const createWeeklyResultBadgeImage = async (
    text: string,
    nazarImage: string
  ): Promise<string> => {
    const canvas = document.createElement("canvas");
    const size = 50; // Smaller size
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Draw empty circular ring (hollow circle)
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 3, 0, 2 * Math.PI);
    ctx.strokeStyle = "#d32d7e";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw nazar boncuğu image (attached to the ring edge, top right)
    if (nazarImage) {
      return new Promise<string>((resolve) => {
        const nazarImg = new Image();
        nazarImg.crossOrigin = "anonymous";
        nazarImg.src = nazarImage;

        nazarImg.onload = () => {
          const nazarSize = 22;
          const nazarX = size - nazarSize - 1;
          const nazarY = -2; // Slightly above to be more visible

          ctx.drawImage(nazarImg, nazarX, nazarY, nazarSize, nazarSize);

          // Draw text inside the hollow circle
          ctx.fillStyle = "#d32d7e";
          ctx.font = "bold 9px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const displayText =
            text.length > 8 ? text.substring(0, 8) + "..." : text;
          ctx.fillText(displayText, size / 2, size / 2 + 2);

          resolve(canvas.toDataURL("image/png"));
        };

        nazarImg.onerror = () => {
          // Fallback if image fails to load
          ctx.fillStyle = "#d32d7e";
          ctx.font = "bold 9px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const displayText =
            text.length > 8 ? text.substring(0, 8) + "..." : text;
          ctx.fillText(displayText, size / 2, size / 2);
          resolve(canvas.toDataURL("image/png"));
        };
      });
    }

    // Draw text inside the hollow circle (fallback)
    ctx.fillStyle = "#d32d7e";
    ctx.font = "bold 9px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const displayText = text.length > 8 ? text.substring(0, 8) + "..." : text;
    ctx.fillText(displayText, size / 2, size / 2);

    return canvas.toDataURL("image/png");
  };

  const createDocDefinition = async (
    pdfData: PDFData,
    backgroundDataUrl: string,
    nazarBoncuguDataUrl: string
  ) => {
    // Color scheme - Updated to use #d32d7e
    const primaryColor = "#d32d7e"; // Changed from "#8B5CF6" to "#d32d7e"
    const secondaryColor = "#64748b"; // Subtle slate gray
    const borderColor = "#e2e8f0"; // Light gray border
    const stripedRowColor = "#fce7f3"; // Light pink background for striped rows

    const formattedDietDate = formatDateTR(pdfData.dietDate);

    const content: PDFContentItem[] = [
      // Background logo in center
      {
        image: backgroundDataUrl,
        width: 300,
        opacity: 0.1,
        alignment: "center",
        margin: [0, 20, 0, -25],
        absolutePosition: { x: 50, y: 300 },
      },
      // Title at the very top
      {
        text: "KİŞİYE ÖZEL BESLENME PLANI",
        alignment: "center",
        style: "titleStyle",
        margin: [0, 0, 0, 8],
      },
      // Reformatted client info - name and date on one line, bold and centered
      {
        text: `${pdfData.fullName} / ${formattedDietDate}`,
        style: "clientInfoBold",
        alignment: "center",
        margin: [0, 0, 0, 12],
      },
      // Weekly Result Badge - Top Right Corner with circular design and nazar boncuğu
      // Only add if weekly result exists and is not empty
      ...(pdfData.weeklyResult &&
      pdfData.weeklyResult.trim() &&
      pdfData.weeklyResult !== "Sonuç belirtilmemiş"
        ? [
            {
              image: await createWeeklyResultBadgeImage(
                pdfData.weeklyResult,
                nazarBoncuguDataUrl
              ),
              width: 50,
              absolutePosition: { x: 520, y: 50 },
            },
          ]
        : []),
      // Main meals table
      {
        table: {
          headerRows: 1,
          widths: ["12%", "8%", "38%", "42%"],
          body: await buildMealTableRows(pdfData),
        },
        layout: {
          hLineWidth: (i, node) =>
            i === 0 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i) => (i === 0 ? primaryColor : borderColor),
          vLineColor: () => borderColor,
          fillColor: function (rowIndex) {
            if (rowIndex === 0) {
              return primaryColor;
            }
            return rowIndex % 2 === 1 ? stripedRowColor : null;
          },
          paddingTop: (i) => (i === 0 ? 6 : 4),
          paddingBottom: (i) => (i === 0 ? 6 : 4),
          paddingLeft: () => 6,
          paddingRight: () => 6,
        },
        margin: [0, 0, 0, 10],
      },
    ];

    // Add celebrations if they exist
    if (pdfData.isBirthdayCelebration) {
      content.push({
        table: {
          widths: ["*"],
          body: [
            [
              {
                text: "🎂 Doğum Gününüz Kutlu Olsun! İyi ki doğdunuz.",
                alignment: "center",
                style: "celebration",
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => borderColor,
          vLineColor: () => "#fbcfe8", // Updated to match new color scheme
          fillColor: () => stripedRowColor,
          paddingTop: () => 6,
          paddingBottom: () => 6,
          paddingLeft: () => 8,
          paddingRight: () => 8,
        },
        margin: [0, 8, 0, 8],
      });
    }

    // Add dietitian note if exists - simplified and compact
    if (pdfData.dietitianNote && pdfData.dietitianNote.trim()) {
      console.log(
        "[EMOJI DEBUG DB] Processing dietitian note:",
        pdfData.dietitianNote
      );
      const dietitianNoteLabelParts = await convertEmojisToImages(
        "💬 Diyetisyen Notu: "
      );
      console.log(
        "[EMOJI DEBUG DB] Dietitian note label parts:",
        dietitianNoteLabelParts
      );
      const dietitianNoteParts = await convertEmojisToImages(
        pdfData.dietitianNote
      );
      console.log("[EMOJI DEBUG DB] Dietitian note parts:", dietitianNoteParts);
      const combinedParts = [...dietitianNoteLabelParts, ...dietitianNoteParts];
      console.log(
        "[EMOJI DEBUG DB] Combined parts for dietitian note:",
        combinedParts
      );
      const dietitianNoteColumns = buildInlineColumns(dietitianNoteLabelParts, {
        textStyle: "dietitianNoteLabel",
      }).columns.concat(
        buildInlineColumns(dietitianNoteParts, {
          textStyle: "dietitianNoteText",
        }).columns
      );
      content.push({
        columns: dietitianNoteColumns,
        columnGap: 3,
        margin: [0, 8, 0, 8],
      } as any);
    }

    // Add signature
    content.push({
      columns: [
        {
          width: "*",
          stack: [],
        },
        {
          width: "auto",
          stack: [
            {
              text: "Dyt. Ezgi Evgin Aktaş",
              style: "signatureText",
              margin: [0, 10, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 0],
    });

    return {
      content,
      pageSize: "A4",
      pageMargins: [30, 30, 30, 50],
      header: {
        columns: [
          {
            image: backgroundDataUrl,
            width: 127, // Increased from 120 to 180 (1.5x)
            margin: [30, 10, 0, 0],
          },
          {
            text: "KİŞİYE ÖZEL BESLENME PLANI",
            alignment: "center",
            fontSize: 16,
            bold: true,
            margin: [0, 45, 0, -25], // Moved down by 10px (from 35 to 45)
            color: primaryColor,
          },
        ],
      },
      footer: function () {
        return {
          columns: [
            {
              text:
                "Eryaman 4.Etap Üç Şehitler Cad. Haznedatoğlu Bl. 173 Etimesgut/ANKARA\n" +
                "Tel: 0546 265 04 40 • E-posta: ezgievgin_dytsyn@hotmail.com",
              style: "footerText",
              alignment: "center",
              margin: [40, 0, 40, 0],
            },
          ],
          margin: [0, 20, 0, 0],
        };
      },
      styles: {
        titleStyle: {
          fontSize: 20,
          bold: true,
          color: primaryColor,
        },
        clientInfo: {
          fontSize: 11,
          color: "#374151",
        },
        // New style for bold client info
        clientInfoBold: {
          fontSize: 14, // Increased font size
          bold: true,
          color: "#374151",
        },
        tableHeader: {
          fontSize: 12,
          bold: true,
          color: "#ffffff",
        },
        tableCell: {
          fontSize: 11,
          color: "#374151",
        },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          color: primaryColor,
        },
        celebration: {
          fontSize: 12,
          color: primaryColor,
        },
        signatureText: {
          fontSize: 12,
          bold: true,
          color: primaryColor,
        },
        footerText: {
          fontSize: 9,
          color: secondaryColor,
          alignment: "center",
        },
        dietitianNote: {
          fontSize: 11,
          color: secondaryColor,
          lineHeight: 1.4,
        },
        dietitianNoteLabel: {
          fontSize: 10,
          bold: true,
          color: primaryColor,
        },
        dietitianNoteText: {
          fontSize: 10,
          color: "#374151",
          lineHeight: 1.2,
        },
        weeklyResultBadge: {
          fontSize: 10,
          bold: true,
          color: "#ffffff",
        },
      },
      defaultStyle: {
        font: "Roboto",
        lineHeight: 1.3,
      },
    };
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`gap-2 ${className}`}
      onClick={generatePDF}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      PDF İndir
    </Button>
  );
};

export default DatabasePDFButton;

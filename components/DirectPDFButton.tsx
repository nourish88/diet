import { useEffect, useState } from "react";
import { Button, ButtonProps } from "./ui/button";
import { Diet } from "@/types/types";
import { apiClient } from "@/lib/api-client";
import {
  Check,
  FileText,
  Loader2,
  X,
  Share,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import twemoji from "twemoji";
import { toast } from "@/components/ui/use-toast";
import { ensurePdfMake } from "@/lib/pdfmake";
import {
  sanitizeMenuItems,
  sanitizeMealNote,
  sortMealsByTime,
} from "@/lib/diet-utils";

const formatDateTR = (dateString: string | null | undefined | Date) => {
  if (!dateString) return "Tarih Belirtilmemiş";
  console.log(
    "DirectPDF formatDateTR received:",
    dateString,
    typeof dateString
  );
  try {
    const date =
      typeof dateString === "string"
        ? new Date(dateString)
        : dateString instanceof Date
        ? dateString
        : new Date();
    console.log(
      "DirectPDF parsed date:",
      date,
      "isValid:",
      !isNaN(date.getTime())
    );
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    return format(date, "d MMMM yyyy", { locale: tr });
  } catch (error) {
    console.error("DirectPDF date parsing error:", error, "Input:", dateString);
    return "Geçersiz Tarih";
  }
};

interface PDFData {
  id?: number;
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
  isImportantDateCelebrated?: boolean;
  importantDate?: {
    message: string;
  };
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

interface DirectPDFButtonProps {
  diet?: Diet;
  pdfData?: PDFData;
  phoneNumber?: string;
  isDietSaved?: boolean;
  dietId?: number;
  importantDateId?: number | null;
  disabled?: boolean;
  onError?: (error: string) => void;
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  onClick?: () => void;
}

const DirectPDFButton: React.FC<DirectPDFButtonProps> = ({
  diet,
  pdfData,
  phoneNumber,
  className,
  isDietSaved = false,
  dietId,
  importantDateId,
  disabled,
  onError,
  variant = "ghost",
  size = "sm",
  onClick,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundDataUrl, setBackgroundDataUrl] = useState<string>("");
  const [nazarBoncuguDataUrl, setNazarBoncuguDataUrl] = useState<string>("");
  const [importantDateMessage, setImportantDateMessage] = useState<string>("");

  useEffect(() => {
    const loadImages = async () => {
      try {
        const logoResponse = await fetch("/ezgi_evgin.png");
        if (!logoResponse.ok)
          throw new Error(`HTTP error! status: ${logoResponse.status}`);
        const logoBlob = await logoResponse.blob();
        const logoReader = new FileReader();
        logoReader.onloadend = () => {
          setBackgroundDataUrl(logoReader.result as string);
          console.log("Logo loaded successfully");
        };
        logoReader.readAsDataURL(logoBlob);

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
        console.error("Error loading images:", error);
      }
    };
    loadImages();
  }, []);

  useEffect(() => {
    const fetchImportantDate = async () => {
      console.log("Starting fetchImportantDate with:", {
        importantDateId,
        isImportantDateCelebrated: pdfData?.isImportantDateCelebrated,
      });
      if (!importantDateId || !pdfData?.isImportantDateCelebrated) {
        console.log("Skipping fetch - missing required data");
        return;
      }
      try {
        const data = await apiClient.get<{ message?: string }>(`/important-dates/${importantDateId}`);
        console.log("Fetched important date data:", data);
        if (data.message) {
          setImportantDateMessage(data.message);
        }
      } catch (error) {
        console.error("Error fetching important date:", error);
      }
    };
    // Immediately invoke the fetch when conditions are met
    if (importantDateId && pdfData?.isImportantDateCelebrated) {
      fetchImportantDate();
    }
  }, [importantDateId, pdfData?.isImportantDateCelebrated]); // Dependencies

  const handleSuccess = () => {
    toast({
      title: "PDF Başarıyla Oluşturuldu",
      description: "Beslenme programınız indiriliyor...",
      variant: "default",
      duration: 3000,
      action: (
        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-4 w-4 text-green-600" />
        </div>
      ),
    });
  };

  const generatePDF = async () => {
    setIsLoading(true);
    try {
      const pdfMake = await ensurePdfMake();
      if (!backgroundDataUrl) throw new Error("Logo yüklenemedi");
      const pdfDataToUse = preparePdfData(diet, pdfData);
      if (!pdfDataToUse) throw new Error("Beslenme programı verisi bulunamadı");

      // Wait for nazar boncuğu image to load if weekly result exists
      if (
        pdfDataToUse.weeklyResult &&
        pdfDataToUse.weeklyResult.trim() &&
        !nazarBoncuguDataUrl
      ) {
        // Wait a bit for image to load
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Note: Emojis will be converted to VFS during createDocDefinition
      // VFS is initialized above, and convertEmojisToImages will add emojis to VFS

      const docDefinition = await createDocDefinition(
        pdfDataToUse,
        backgroundDataUrl,
        nazarBoncuguDataUrl
      );
      const fileName = `Beslenme_Programi_${pdfDataToUse.fullName.replace(
        /\s+/g,
        "_"
      )}_${formatDateForFileName(pdfDataToUse.dietDate)}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
      handleSuccess();
    } catch (error) {
      console.error("PDF oluşturma hatası:", error);
      toast({
        title: "Hata",
        description: `PDF oluşturulamadı: ${(error as Error).message}`,
        variant: "destructive",
        duration: 5000,
        action: (
          <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
            <X className="h-4 w-4 text-red-600" />
          </div>
        ),
      });
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

  const preparePdfData = (
    diet: Diet | undefined,
    pdfData: PDFData | undefined
  ): PDFData | null => {
    console.log("Starting preparePdfData with message:", importantDateMessage);
  const normalizeMeals = (
    meals: any[],
    options: { fromDiet?: boolean } = {}
  ) => {
    const { fromDiet = false } = options;
    const normalizedMeals = (meals || []).map((meal: any) => {
      const sourceItems = fromDiet ? meal.items : meal.menuItems;
      const menuItems = sanitizeMenuItems(
        Array.isArray(sourceItems) ? sourceItems : []
      );

      const notesSource = fromDiet
        ? meal.detail ?? meal.notes ?? ""
        : meal.notes ?? meal.detail ?? "";

      return {
        name: (meal.name || "").toString().trim(),
        time: (meal.time || "").toString().trim(),
        menuItems: menuItems.length > 0 ? menuItems : ["-"],
        notes: fromDiet
          ? sanitizeMealNote(notesSource)
          : sanitizeMealNote(notesSource),
      };
    });

    return sortMealsByTime(normalizedMeals);
  };

    if (pdfData) {
    return {
        ...pdfData,
      ogunler: normalizeMeals(pdfData.ogunler || []),
        isBirthdayCelebration: pdfData.isBirthdayCelebration || false,
        isImportantDateCelebrated: pdfData.isImportantDateCelebrated || false,
        importantDate: pdfData.isImportantDateCelebrated
        ? { message: importantDateMessage || pdfData.importantDate?.message || "" }
          : undefined,
      waterConsumption: pdfData.waterConsumption || "",
      physicalActivity: pdfData.physicalActivity || "",
      };
    }

    if (!diet) return null;

    const clientName = (diet.AdSoyad || "İsimsiz Danışan").trim();

    return {
      fullName: clientName,
      dietDate: diet.Tarih || new Date().toISOString(),
      weeklyResult: diet.Sonuc || "Sonuç belirtilmemiş",
      target: diet.Hedef || "Hedef belirtilmemiş",
    ogunler: normalizeMeals(diet.Oguns || [], { fromDiet: true }),
      waterConsumption: diet.Su || "Belirtilmemiş",
      physicalActivity: diet.Fizik || "Belirtilmemiş",
      dietitianNote: diet.dietitianNote || "",
      isBirthdayCelebration: diet.isBirthdayCelebration || false,
      isImportantDateCelebrated: diet.isImportantDateCelebrated || false,
      importantDate: diet.isImportantDateCelebrated
        ? { message: importantDateMessage }
        : undefined,
    };
  };

  interface TableCell {
    text?: string | any[];
    style: string;
    alignment: string;
    colSpan?: number;
  }

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

  // Convert emojis in text to base64 images using twemoji
  const convertEmojisToImages = async (text: string): Promise<any[]> => {
    console.log("[EMOJI DEBUG] convertEmojisToImages called with text:", text);
    if (!text) {
      console.log("[EMOJI DEBUG] Text is empty, returning empty array");
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
        "[EMOJI DEBUG] Found Unicode emoji:",
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
            "[EMOJI DEBUG] Found text emoji:",
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

    console.log("[EMOJI DEBUG] Total matches found:", matches.length, matches);

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Process each match
    for (const matchData of matches) {
      // Add text before emoji
      if (matchData.index > lastIndex) {
        const textBefore = text.substring(lastIndex, matchData.index);
        console.log("[EMOJI DEBUG] Adding text before emoji:", textBefore);
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
              "[EMOJI DEBUG] Unicode emoji converted:",
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
              "[EMOJI DEBUG] Manual Unicode conversion:",
              matchData.emoji,
              "->",
              emojiCode
            );
          }
        } else {
          // Text-based emoji - already have the code
          emojiCode = matchData.emoji;
          console.log("[EMOJI DEBUG] Text emoji code:", emojiCode);
        }

        const svgUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${emojiCode}.svg`;
        console.log("[EMOJI DEBUG] Fetching SVG from:", svgUrl);

        // Fetch SVG and convert to base64 data URL
        const response = await fetch(svgUrl);
        console.log(
          "[EMOJI DEBUG] Fetch response status:",
          response.status,
          response.ok
        );
        if (response.ok) {
          const svgText = await response.text();
          // Convert SVG to base64 data URL
          const svgBase64 = btoa(unescape(encodeURIComponent(svgText)));
          const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;
          const svgBase64String = svgDataUrl.split(",")[1]; // Extract base64 for VFS

          console.log(
            "[EMOJI DEBUG] SVG data URL length:",
            svgDataUrl?.length,
            "First 50 chars:",
            svgDataUrl?.substring(0, 50)
          );

          // Try PNG conversion for better compatibility
          try {
            // Convert SVG to PNG using canvas
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
                  // Extract base64 string for VFS
                  const pngBase64String = pngDataUrl.split(",")[1];
                  const emojiFileName = `emoji_${emojiCode}_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(7)}.png`;

                  console.log(
                    "[EMOJI DEBUG] PNG conversion successful, using base64 data URL"
                  );

                  // Use base64 data URL directly (pdfmake supports this)
                  parts.push({
                    image: pngDataUrl, // Use data URL directly
                    width: 12,
                    height: 12,
                  });
                  console.log(
                    "[EMOJI DEBUG] Added PNG image part to array (base64 data URL)"
                  );
                  URL.revokeObjectURL(url);
                  resolve();
                };
                img.onerror = () => {
                  console.warn(
                    "[EMOJI DEBUG] PNG conversion failed, using SVG in VFS"
                  );
                  // Use SVG data URL directly as fallback
                  parts.push({
                    image: svgDataUrl, // Use data URL directly
                    width: 12,
                    height: 12,
                  });
                  console.log(
                    "[EMOJI DEBUG] Added SVG image part to array (base64 data URL fallback)"
                  );
                  URL.revokeObjectURL(url);
                  resolve();
                };
                img.src = url;
              });
            } else {
              // Fallback to SVG if canvas not available - use data URL directly
              parts.push({
                image: svgDataUrl, // Use data URL directly
                width: 12,
                height: 12,
              });
              console.log(
                "[EMOJI DEBUG] Added SVG image part to array (canvas not available, base64 data URL)"
              );
            }
          } catch (error) {
            console.warn(
              "[EMOJI DEBUG] Error converting to PNG, using SVG:",
              error
            );
            // Fallback: use SVG data URL directly
            parts.push({
              image: svgDataUrl, // Use data URL directly
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
            `[EMOJI DEBUG] Failed to fetch emoji SVG for ${emojiCode}: ${response.status}, using text: ${originalText}`
          );
          parts.push({ text: originalText });
        }
      } catch (error) {
        // Fallback: keep original text
        const originalText = matchData.isUnicode
          ? matchData.emoji
          : matchData.originalText || "";
        console.error(
          `[EMOJI DEBUG] Error converting emoji ${matchData.emoji}:`,
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
      console.log("[EMOJI DEBUG] Adding remaining text:", remainingText);
      parts.push({
        text: remainingText,
      });
    }

    console.log("[EMOJI DEBUG] Final parts array:", parts);
    return parts.length > 0 ? parts : [{ text }];
  };

  const createDocDefinition = async (
    pdfData: PDFData,
    backgroundDataUrl: string,
    nazarBoncuguDataUrl: string
  ) => {
    console.log("Creating doc definition with data:", {
      isBirthdayCelebration: pdfData.isBirthdayCelebration,
      isImportantDateCelebrated: pdfData.isImportantDateCelebrated,
      importantDate: pdfData.importantDate,
    });
    // Color scheme - vibrant but light pink for printing
    const primaryColor = "#e06fa3"; // Vibrant light pink
    const secondaryColor = "#64748b"; // Subtle slate gray
    const borderColor = "#e2e8f0"; // Light gray border
    const formattedDietDate = formatDateTR(pdfData.dietDate);

    // Celebrations content - only create if they exist
    const celebrationsContent: {
      text: string;
      style: string;
      color: string;
      margin: number[];
    }[] = [];
    if (pdfData.isBirthdayCelebration) {
      console.log("Adding birthday celebration");
      celebrationsContent.push({
        text: "🎂 Doğum Gününüz Kutlu Olsun! İyi ki doğdunuz.",
        style: "celebration",
        color: "#d32d7e",
        margin: [0, 5, 0, 0], // Reduced margin
      });
    }
    if (pdfData.isImportantDateCelebrated && pdfData.importantDate?.message) {
      console.log(
        "Adding important date celebration with message:",
        pdfData.importantDate.message
      );
      celebrationsContent.push({
        text: `🎉 ${pdfData.importantDate.message}`,
        style: "celebration",
        color: "#D97706",
        margin: [0, pdfData.isBirthdayCelebration ? 3 : 5, 0, 0], // Reduced margin
      });
    }
    console.log("Final celebrations content:", celebrationsContent);

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

    const content: PDFContentItem[] = [
      // Client info - two columns (name left, date right)
      {
        columns: [
          {
            text: `İSİM SOYİSİM: ${pdfData.fullName}`,
            style: "clientInfoLeft",
            alignment: "left",
            width: "*",
          },
          {
            text: `Tarih: ${formattedDietDate}`,
            style: "clientInfoRight",
            alignment: "right",
            width: "auto",
          },
        ],
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
      // Nutrition Program section
      {
        image: backgroundDataUrl,
        width: 300,
        opacity: 0.1,
        alignment: "center",
        margin: [0, 20, 0, -25],
        absolutePosition: { x: 50, y: 300 }, // Changed x from 150 to 50
      },
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
              return "#e06fa3"; // Vibrant light pink for header
            }
            return rowIndex % 2 === 1 ? "#fce7f3" : null; // Light pink for alternating rows
          },
          paddingTop: (i) => (i === 0 ? 6 : 4), // Reduced padding
          paddingBottom: (i) => (i === 0 ? 6 : 4), // Reduced padding
          paddingLeft: () => 6, // Reduced padding
          paddingRight: () => 6, // Reduced padding
        },
        margin: [0, 0, 0, 10], // Reduced margin
      },
      // Water and Physical Activity section
      {
        columns: [
          {
            width: "50%",
            stack: [
              {
                text: "",
                style: "recommendationHeader",
                margin: [0, 0, 0, 3], // Reduced margin
              },
              {
                text: "",
                style: "recommendationContent",
              },
            ],
          },
          {
            width: "50%",
            stack: [
              {
                text: "",
                style: "recommendationHeader",
                margin: [0, 0, 0, 3], // Reduced margin
              },
              {
                text: "",
                style: "recommendationContent",
              },
            ],
          },
        ],
        margin: [0, 0, 0, 8], // Reduced margin
      },
    ];

    // Add Dietitian Note if exists - simplified and compact
    if (pdfData.dietitianNote && pdfData.dietitianNote.trim()) {
      console.log(
        "[EMOJI DEBUG] Processing dietitian note:",
        pdfData.dietitianNote
      );
      const dietitianNoteLabelParts = await convertEmojisToImages(
        "💬 Diyetisyen Notu: "
      );
      console.log(
        "[EMOJI DEBUG] Dietitian note label parts:",
        dietitianNoteLabelParts
      );
      const dietitianNoteParts = await convertEmojisToImages(
        pdfData.dietitianNote
      );
      console.log("[EMOJI DEBUG] Dietitian note parts:", dietitianNoteParts);
      
      // Combine label and text parts into a single text element
      const labelText = dietitianNoteLabelParts
        .map((part) => (part.text ? part.text : ""))
        .join("")
        .trim();
      
      const noteText = dietitianNoteParts
        .map((part) => (part.text ? part.text : ""))
        .join("")
        .trim();
      
      // Create a single text element with both label and content
      content.push({
        text: [
          {
            text: labelText,
            style: "dietitianNoteLabel",
          },
          {
            text: noteText,
            style: "dietitianNoteText",
          },
        ],
        margin: [0, 8, 0, 8],
      } as any);
    }

    // Add Celebrations if exist - more compact
    if (celebrationsContent.length > 0) {
      content.push({
        table: {
          widths: ["*"],
          body: [
            [
              {
                text: celebrationsContent.map((c) => c.text).join("\n"),
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
          vLineColor: () => "#fbcfe8",
          fillColor: () => "#e06fa3",
          paddingTop: () => 6,
          paddingBottom: () => 6,
          paddingLeft: () => 8,
          paddingRight: () => 8,
        },
        margin: [0, 8, 0, 8],
      } as PDFContentItem);
    }

    // Add signature to content - more compact
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
              margin: [0, 10, 0, 0], // Reduced margin
            },
          ],
        },
      ],
      margin: [0, 0, 0, 0],
    });

    return {
      content,
      pageSize: "A4",
      pageMargins: [30, 30, 30, 50], // Reduced margins
      styles: {
        sectionHeader: {
          fontSize: 14, // Reduced from 16
          bold: true,
          color: primaryColor,
          alignment: "left",
          borderBottom: {
            width: 1,
            color: primaryColor,
          },
          margin: [0, 3, 0, 5], // Reduced margins
        },
        labelBold: {
          fontSize: 12, // Reduced from 13
          bold: true,
          color: "#374151",
        },
        valueText: {
          fontSize: 12, // Reduced from 13
          color: "#1f2937",
        },
        tableHeader: {
          fontSize: 12, // Reduced from 13
          bold: true,
          color: "#ffffff",
        },
        tableCell: {
          fontSize: 11, // Reduced from 12
          color: "#374151",
        },
        tableCellItalic: {
          fontSize: 11, // Reduced from 12
          italics: true,
          color: "#9ca3af",
        },
        recommendationHeader: {
          fontSize: 13, // Reduced from 14
          bold: true,
          color: primaryColor,
        },
        recommendationContent: {
          fontSize: 12, // Reduced from 13
          color: "#374151",
        },
        celebration: {
          fontSize: 14, // Reduced from 15
          bold: true,
          alignment: "center",
        },
        signatureText: {
          fontSize: 13, // Reduced from 14
          bold: true,
          color: primaryColor,
          alignment: "right",
          decoration: "underline",
          decorationStyle: "solid",
          decorationColor: primaryColor,
        },
        footerText: {
          fontSize: 9, // Reduced from 10
          color: secondaryColor,
          alignment: "center",
        },
        clientInfoLeft: {
          fontSize: 13,
          color: "#555",
          bold: true,
          lineHeight: 1.2,
        },
        clientInfoRight: {
          fontSize: 13,
          color: "#555",
          bold: false,
          lineHeight: 1.2,
        },
        dietitianNote: {
          fontSize: 10, // Reduced from 11
          color: secondaryColor,
          lineHeight: 1.3, // Reduced line height
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
        titleStyle: {
          fontSize: 15, // Daha küçük
          bold: true,
          color: "#c2185b", // Updated to more professional pink
        },
      },
      header: {
        stack: [
          {
            image: backgroundDataUrl,
            width: 165, // Logo büyütüldü
            alignment: "center",
            margin: [0, 15, 0, 8],
          },
          {
            text: "KİŞİYE ÖZEL BESLENME PLANI",
            alignment: "center",
            style: "titleStyle",
            margin: [0, 0, 0, 0],
          },
        ],
        margin: [0, 0, 0, 10],
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
              margin: [30, 0, 30, 0], // Reduced margins
            },
          ],
          margin: [0, 10, 0, 0], // Reduced margin
        };
      },
      defaultStyle: {
        font: "Roboto",
        lineHeight: 1.2, // Reduced line height
      },
    };
  };

  return (
    <Button
      variant={variant}
      size={size}
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
export default DirectPDFButton;

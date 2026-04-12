"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";

interface ParsedItem {
  besin: string;
  miktar: string;
  birim: string;
  status: "valid" | "unknown_food" | "missing_quantity" | "missing_unit";
  suggestion?: string; // closest food name from DB
}

interface BulkPasteModalProps {
  open: boolean;
  onClose: () => void;
  ogunName: string;
  onApply: (
    items: Array<{ besin: string; miktar: string; birim: string }>
  ) => void;
}

// Common Turkish units
const UNITS = [
  "gr", "g", "ml", "kg", "lt", "l",
  "adet", "dilim", "bardak", "kase", "kaşık", "çay kaşığı", "yemek kaşığı",
  "porsiyon", "avuç", "demet", "su bardağı", "çay bardağı",
  "kap", "tabak", "kâse", "kutu",
];

// Turkish number words
const TR_NUMBERS: Record<string, string> = {
  bir: "1", iki: "2", üç: "3", dört: "4", beş: "5",
  altı: "6", yedi: "7", sekiz: "8", dokuz: "9", on: "10",
  yarım: "0.5", çeyrek: "0.25",
};

function parseText(text: string): ParsedItem[] {
  const lines = text
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const lower = line.toLowerCase();

    // Replace Turkish number words
    let processed = lower;
    for (const [word, num] of Object.entries(TR_NUMBERS)) {
      processed = processed.replace(new RegExp(`\\b${word}\\b`, "g"), num);
    }

    // Try to extract: [quantity] [unit] [food] or [food] [quantity] [unit]
    const unitPattern = UNITS.join("|");
    const quantityPattern = `(\\d+(?:[.,]\\d+)?)`;
    const unitRe = new RegExp(
      `(?:^|\\s)(${unitPattern})(?:\\s|$)`,
      "i"
    );
    const quantityRe = new RegExp(quantityPattern, "i");

    const unitMatch = unitRe.exec(processed);
    const quantityMatch = quantityRe.exec(processed);

    const foundUnit = unitMatch ? unitMatch[1].trim() : "";
    const foundQuantity = quantityMatch
      ? quantityMatch[1].replace(",", ".")
      : "";

    // Remove quantity and unit from text to get food name
    let foodPart = processed;
    if (foundQuantity) foodPart = foodPart.replace(foundQuantity, "").trim();
    if (foundUnit)
      foodPart = foodPart.replace(new RegExp(`\\b${foundUnit}\\b`, "i"), "").trim();

    // Clean up extra whitespace and capitalize
    const besinName = foodPart
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());

    let status: ParsedItem["status"] = "valid";
    if (!besinName) status = "valid";
    if (!foundQuantity) status = "missing_quantity";
    if (!foundUnit) status = "missing_unit";

    return {
      besin: besinName || line,
      miktar: foundQuantity,
      birim: foundUnit,
      status,
    };
  });
}

export function BulkPasteModal({
  open,
  onClose,
  ogunName,
  onApply,
}: BulkPasteModalProps) {
  const [text, setText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const isPWA =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);

  const hasSpeechRecognition =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (!open) {
      setText("");
      setParsedItems([]);
      stopListening();
    }
  }, [open]);

  const parseAndValidate = async (inputText: string) => {
    if (!inputText.trim()) {
      setParsedItems([]);
      return;
    }
    setIsParsing(true);

    const items = parseText(inputText);

    // Try to validate food names against DB
    const validated = await Promise.all(
      items.map(async (item) => {
        if (!item.besin || item.besin.length < 2) return item;
        try {
          const suggestions = await apiClient.get<any[]>(
            `/suggestions/besin?q=${encodeURIComponent(item.besin)}`
          );
          if (suggestions && suggestions.length > 0) {
            const exactMatch = suggestions.find(
              (s: any) =>
                s.name?.toLowerCase() === item.besin.toLowerCase()
            );
            if (exactMatch) {
              return { ...item, status: "valid" as const };
            }
            return {
              ...item,
              status: "unknown_food" as const,
              suggestion: suggestions[0]?.name,
            };
          }
          return { ...item, status: "unknown_food" as const };
        } catch {
          return item;
        }
      })
    );

    setParsedItems(validated);
    setIsParsing(false);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    // Debounce parse
    clearTimeout((handleTextChange as any)._timer);
    (handleTextChange as any)._timer = setTimeout(
      () => parseAndValidate(value),
      600
    );
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Desteklenmiyor",
        description: "Tarayıcınız ses tanıma desteklemiyor.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setText(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (text.trim()) {
        parseAndValidate(text);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast({
        title: "Ses tanıma hatası",
        description: "Ses algılanamadı. Tekrar deneyin.",
        variant: "destructive",
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleApply = () => {
    const validItems = parsedItems.filter(
      (item) => item.besin && item.miktar && item.birim
    );

    if (validItems.length === 0) {
      toast({
        title: "Uyarı",
        description:
          "Uygulanacak geçerli besin bulunamadı. Miktar ve birim alanlarını kontrol edin.",
        variant: "destructive",
      });
      return;
    }

    onApply(
      validItems.map((item) => ({
        besin: item.besin,
        miktar: item.miktar,
        birim: item.birim,
      }))
    );
    onClose();
  };

  const updateItem = (index: number, field: keyof ParsedItem, value: string) => {
    setParsedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value, status: "valid" } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validCount = parsedItems.filter(
    (item) => item.miktar && item.birim
  ).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Toplu Besin Girişi — {ogunName}</DialogTitle>
          <DialogDescription>
            Besinleri yazın veya dikte edin. Her satır bir besin.{" "}
            <span className="font-medium">
              Örnek: &quot;2 dilim ekmek, 1 yumurta, 200 gr tavuk&quot;
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={
                "2 dilim ekmek\n1 yumurta\n200 gr tavuk göğsü\n1 bardak süt"
              }
              rows={5}
              className="resize-none pr-10"
            />
            {(isPWA || hasSpeechRecognition) && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`absolute right-2 top-2 p-1.5 rounded-full transition-colors ${
                  isListening
                    ? "bg-red-100 text-red-600 animate-pulse"
                    : "bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600"
                }`}
                title={isListening ? "Kaydı Durdur" : "Sesli Giriş (Türkçe)"}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {isParsing && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analiz ediliyor...
            </div>
          )}

          {parsedItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Algılanan besinler ({validCount}/{parsedItems.length} geçerli):
              </p>
              {parsedItems.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded-md border text-sm ${
                    item.miktar && item.birim
                      ? "border-green-200 bg-green-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  {item.miktar && item.birim ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}

                  <div className="flex-1 grid grid-cols-3 gap-1">
                    <input
                      className="col-span-1 border rounded px-1 py-0.5 text-xs bg-white"
                      value={item.miktar}
                      placeholder="Miktar"
                      onChange={(e) => updateItem(i, "miktar", e.target.value)}
                    />
                    <input
                      className="col-span-1 border rounded px-1 py-0.5 text-xs bg-white"
                      value={item.birim}
                      placeholder="Birim (gr, adet...)"
                      onChange={(e) => updateItem(i, "birim", e.target.value)}
                    />
                    <input
                      className="col-span-1 border rounded px-1 py-0.5 text-xs bg-white"
                      value={item.besin}
                      placeholder="Besin adı"
                      onChange={(e) => updateItem(i, "besin", e.target.value)}
                    />
                  </div>

                  {item.status === "unknown_food" && item.suggestion && (
                    <button
                      type="button"
                      className="text-xs text-blue-600 underline whitespace-nowrap"
                      onClick={() => updateItem(i, "besin", item.suggestion!)}
                    >
                      → {item.suggestion}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            İptal
          </Button>
          <Button
            onClick={handleApply}
            disabled={validCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {validCount} Besin Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

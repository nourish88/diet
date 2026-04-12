"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, ChevronRight, ClipboardList } from "lucide-react";
import PresetService, { MealPreset } from "@/services/PresetService";
import { PresetSelector } from "./presets/PresetSelector";
import { BulkPasteModal } from "./BulkPasteModal";
import { useToast } from "@/components/ui/use-toast";
import { MenuItem } from "@/types/types";

interface OgunQuickActionsProps {
  ogunName: string;
  ogunItems: MenuItem[];
  onApplyPreset: (preset: MealPreset) => void;
  onBulkAdd?: (items: Array<{ besin: string; miktar: string; birim: string }>) => void;
  compact?: boolean;
}

export const OgunQuickActions = ({
  ogunName,
  ogunItems,
  onApplyPreset,
  onBulkAdd,
  compact = true,
}: OgunQuickActionsProps) => {
  const [showPresetSelector, setShowPresetSelector] = useState(false);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [presets, setPresets] = useState<MealPreset[]>([]);
  const [inlinePresets, setInlinePresets] = useState<MealPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Determine meal type from name
  const getMealType = (name: string): string => {
    const lower = name.toLowerCase();
    // Check "uyanınca" FIRST before "ara" check
    if (lower.includes("uyanınca") || lower.includes("uyaninca"))
      return "uyaninca";
    if (lower.includes("kahvaltı")) return "kahvalti";
    if (lower.includes("öğle") || lower.includes("öğlen")) return "ogle";
    if (lower.includes("akşam")) return "aksam";
    if (lower.includes("ara")) return "ara_ogun";
    return "";
  };

  const loadPresets = async () => {
    try {
      setIsLoading(true);
      const mealType = getMealType(ogunName);
      let data = await PresetService.getPresets(mealType);

      if ((!data || data.length === 0) && mealType) {
        data = await PresetService.getPresets();
      }

      setPresets(data);
      console.log("🔍 Preset fetch result", {
        ogunName,
        mealType,
        count: data?.length ?? 0,
      });

      if (!data || data.length === 0) {
        toast({
          title: "Preset bulunamadı",
          description: "Bu öğün için kayıtlı preset mevcut değil.",
        });
      }
    } catch (error) {
      console.error("Error loading presets:", error);
      const description =
        error instanceof Error
          ? error.message
          : "Preset'ler yüklenirken bir hata oluştu.";
      toast({
        title: "Hata",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load inline presets on mount (silent — no error toast)
  useEffect(() => {
    const loadInlinePresets = async () => {
      try {
        const mealType = getMealType(ogunName);
        let data = await PresetService.getPresets(mealType);
        if ((!data || data.length === 0) && mealType) {
          data = await PresetService.getPresets();
        }
        setInlinePresets((data || []).slice(0, 3));
      } catch {
        // silent fail
      }
    };
    loadInlinePresets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ogunName]);

  const handleOpenPresets = () => {
    loadPresets();
    setShowPresetSelector(true);
  };

  const handleSaveAsPreset = async () => {
    // Validate items
    const validItems = ogunItems.filter(
      (item) => item.besin && item.miktar && item.birim
    );

    if (validItems.length === 0) {
      toast({
        title: "Uyarı",
        description: "Öğünde kayıt edilecek besin bulunmuyor.",
        variant: "destructive",
      });
      return;
    }

    // Ask for preset name
    const presetName = prompt(
      `"${ogunName}" öğünü için preset adı girin:
`,
      `${ogunName} - ${new Date().toLocaleDateString("tr-TR")}`
    );

    if (!presetName || presetName.trim() === "") {
      return;
    }

    try {
      setIsSaving(true);

      const presetData = {
        name: presetName.trim(),
        mealType: getMealType(ogunName),
        items: validItems.map((item) => ({
          besinName:
            typeof item.besin === "string" ? item.besin : item.besin.name,
          miktar: item.miktar,
          birim: typeof item.birim === "string" ? item.birim : item.birim.name,
        })),
      };

      await PresetService.createPreset(presetData);

      toast({
        title: "Başarılı",
        description: `"${presetName}" preset olarak kaydedildi.`,
      });

      // Reload presets to show the new one
      await loadPresets();
    } catch (error) {
      console.error("Error saving preset:", error);
      toast({
        title: "Hata",
        description: "Preset kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {/* Inline preset buttons — top 3, single click to apply */}
      {inlinePresets.map((preset) => (
        <Button
          key={preset.id}
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onApplyPreset(preset)}
          className="text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 max-w-[130px] truncate"
          title={`Uygula: ${preset.name}`}
        >
          <Sparkles className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{preset.name}</span>
        </Button>
      ))}

      {/* "More presets" button — opens full modal */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleOpenPresets}
        className="text-xs border-purple-300 text-purple-600 hover:bg-purple-50"
        aria-label="Tüm presetler"
        title="Tüm presetleri gör"
      >
        <ChevronRight className="h-3 w-3" />
        {!compact && " Tümü"}
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleSaveAsPreset}
        disabled={isSaving || ogunItems.length === 0}
        className="text-xs border-green-300 text-green-600 hover:bg-green-50"
        aria-label={compact ? "Preset kaydet" : undefined}
      >
        <Save className={`h-3 w-3 ${compact ? "" : "mr-1"}`} />
        {!compact && (isSaving ? "Kaydediliyor..." : "Preset Kaydet")}
        {compact && isSaving && <span className="ml-2 text-xs">…</span>}
      </Button>

      {/* Toplu besin girişi / sesli dikte */}
      {onBulkAdd && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowBulkPaste(true)}
          className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
          title="Toplu besin girişi veya sesli dikte"
        >
          <ClipboardList className="h-3 w-3 mr-1" />
          {!compact && "Toplu Ekle"}
        </Button>
      )}

      <PresetSelector
        open={showPresetSelector}
        onClose={() => setShowPresetSelector(false)}
        presets={presets}
        isLoading={isLoading}
        mealType={ogunName}
        onSelect={(preset) => {
          onApplyPreset(preset);
          setShowPresetSelector(false);
        }}
      />

      {onBulkAdd && (
        <BulkPasteModal
          open={showBulkPaste}
          onClose={() => setShowBulkPaste(false)}
          ogunName={ogunName}
          onApply={onBulkAdd}
        />
      )}
    </div>
  );
};

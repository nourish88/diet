"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Save } from "lucide-react";
import PresetService, { MealPreset } from "@/services/PresetService";
import { PresetSelector } from "./presets/PresetSelector";
import { useToast } from "@/components/ui/use-toast";
import { MenuItem } from "@/types/types";

interface OgunQuickActionsProps {
  ogunName: string;
  ogunItems: MenuItem[];
  onApplyPreset: (preset: MealPreset) => void;
}

export const OgunQuickActions = ({
  ogunName,
  ogunItems,
  onApplyPreset,
}: OgunQuickActionsProps) => {
  const [showPresetSelector, setShowPresetSelector] = useState(false);
  const [presets, setPresets] = useState<MealPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Determine meal type from name
  const getMealType = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes("kahvaltı")) return "kahvalti";
    if (lower.includes("öğle")) return "ogle";
    if (lower.includes("akşam")) return "aksam";
    if (lower.includes("ara")) return "ara_ogun";
    return "";
  };

  const loadPresets = async () => {
    try {
      setIsLoading(true);
      const mealType = getMealType(ogunName);
      const data = await PresetService.getPresets(mealType);
      setPresets(data);
    } catch (error) {
      console.error("Error loading presets:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
      `"${ogunName}" öğünü için preset adı girin:`,
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
          besinName: typeof item.besin === "string" ? item.besin : item.besin.name,
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
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleOpenPresets}
        className="text-xs border-purple-300 text-purple-600 hover:bg-purple-50"
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Preset Kullan
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleSaveAsPreset}
        disabled={isSaving || ogunItems.length === 0}
        className="text-xs border-green-300 text-green-600 hover:bg-green-50"
      >
        <Save className="h-3 w-3 mr-1" />
        {isSaving ? "Kaydediliyor..." : "Preset Kaydet"}
      </Button>

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
    </div>
  );
};

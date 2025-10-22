"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText } from "lucide-react";
import PresetService, { MealPreset } from "@/services/PresetService";
import { PresetSelector } from "./presets/PresetSelector";

interface OgunQuickActionsProps {
  ogunName: string;
  onApplyPreset: (preset: MealPreset) => void;
}

export const OgunQuickActions = ({
  ogunName,
  onApplyPreset,
}: OgunQuickActionsProps) => {
  const [showPresetSelector, setShowPresetSelector] = useState(false);
  const [presets, setPresets] = useState<MealPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        Preset
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

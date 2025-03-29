import React from "react";
import { Button } from "@/components/ui/button";
import { useFontStore } from "@/components/DietForm";
import { Plus, Minus, RotateCcw } from "lucide-react";

const FontSizeControl = () => {
  const { fontSize, increase, decrease, reset } = useFontStore();

  return (
    <div className="flex items-center space-x-2 mb-4">
      <div className="text-sm text-gray-500">Yazı Boyutu:</div>
      <Button
        variant="outline"
        size="icon"
        onClick={decrease}
        className="h-8 w-8"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium">{fontSize}px</span>
      <Button
        variant="outline"
        size="icon"
        onClick={increase}
        className="h-8 w-8"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={reset}
        className="h-8 w-8 ml-2"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default FontSizeControl;

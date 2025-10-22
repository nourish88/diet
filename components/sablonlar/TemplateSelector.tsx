"use client";

import { useState, useEffect } from "react";
import { DietTemplate } from "@/services/TemplateService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";

interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: DietTemplate) => void;
  templates: DietTemplate[];
  isLoading?: boolean;
}

export const TemplateSelector = ({
  open,
  onClose,
  onSelect,
  templates,
  isLoading = false,
}: TemplateSelectorProps) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleSelect = () => {
    const selected = templates.find((t) => t.id === selectedId);
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  // Group by category
  const grouped = templates.reduce((acc, template) => {
    const cat = template.category || "Diğer";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, DietTemplate[]>);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">📋 Şablon Seç</DialogTitle>
          <p className="text-sm text-gray-600">
            Hazır şablonlardan birini seçerek hızlıca başlayın
          </p>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">
                Şablonlar yükleniyor...
              </span>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Henüz şablon bulunmuyor</p>
              <p className="text-sm mt-1">
                İlk şablonunuzu "/sablonlar" sayfasından oluşturabilirsiniz
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryTemplates.map((template) => {
                      const totalItems = template.oguns.reduce(
                        (sum, ogun) => sum + ogun.items.length,
                        0
                      );

                      return (
                        <div
                          key={template.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedId === template.id
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                          }`}
                          onClick={() => setSelectedId(template.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {template.name}
                              </h4>
                              {template.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {template.description}
                                </p>
                              )}
                              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                <span>📋 {template.oguns.length} öğün</span>
                                <span>🍽️ {totalItems} besin</span>
                              </div>
                            </div>
                            {selectedId === template.id && (
                              <div className="ml-2">
                                <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                  <svg
                                    className="h-3 w-3 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            İptal
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedId}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            Şablonu Kullan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

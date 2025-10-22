"use client";

import { DietTemplate } from "@/services/TemplateService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Edit, Trash2, Play } from "lucide-react";

interface TemplateCardProps {
  template: DietTemplate;
  onUse: (templateId: number) => void;
  onEdit: (template: DietTemplate) => void;
  onDelete: (templateId: number) => void;
}

export const TemplateCard = ({
  template,
  onUse,
  onEdit,
  onDelete,
}: TemplateCardProps) => {
  const totalItems = template.oguns.reduce(
    (sum, ogun) => sum + ogun.items.length,
    0
  );

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {template.name}
            </CardTitle>
            {template.category && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                {template.category}
              </span>
            )}
          </div>
          <FileText className="h-5 w-5 text-gray-400" />
        </div>
        {template.description && (
          <p className="text-sm text-gray-600 mt-2">{template.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex gap-4 text-sm text-gray-600">
            <span>📋 {template.oguns.length} öğün</span>
            <span>🍽️ {totalItems} besin</span>
          </div>

          {/* Quick info */}
          {(template.su || template.fizik) && (
            <div className="text-xs text-gray-500 space-y-1">
              {template.su && <div>💧 {template.su}</div>}
              {template.fizik && <div>🏃 {template.fizik}</div>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onUse(template.id)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              <Play className="h-4 w-4 mr-1" />
              Kullan
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(template)}
              className="border-gray-300"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm("Bu şablonu silmek istediğinize emin misiniz?")) {
                  onDelete(template.id);
                }
              }}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

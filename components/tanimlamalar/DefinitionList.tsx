"use client";

import { useState } from "react";
import { Definition } from "@/services/DefinitionService";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DefinitionListProps {
  definitions: Definition[];
  onUpdate: (id: number, data: { name?: string; isActive?: boolean }) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

export const DefinitionList = ({
  definitions,
  onUpdate,
  onDelete,
  isLoading,
}: DefinitionListProps) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleStartEdit = (definition: Definition) => {
    setEditingId(definition.id);
    setEditValue(definition.name);
  };

  const handleSaveEdit = (id: number) => {
    if (editValue.trim()) {
      onUpdate(id, { name: editValue.trim() });
      setEditingId(null);
      setEditValue("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleToggleActive = (id: number, currentState: boolean) => {
    onUpdate(id, { isActive: !currentState });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Yükleniyor...</div>;
  }

  if (definitions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">Henüz tanımlama bulunmuyor</p>
        <p className="text-sm text-gray-400 mt-1">
          Yukarıdaki formu kullanarak yeni tanımlama ekleyin
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {definitions.map((definition) => (
        <div
          key={definition.id}
          className={`flex items-center justify-between p-4 rounded-lg border ${
            definition.isActive
              ? "bg-white border-gray-200"
              : "bg-gray-50 border-gray-300 opacity-60"
          }`}
        >
          <div className="flex-1">
            {editingId === definition.id ? (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="max-w-md"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveEdit(definition.id);
                  } else if (e.key === "Escape") {
                    handleCancelEdit();
                  }
                }}
              />
            ) : (
              <p
                className={`text-sm ${
                  definition.isActive ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {definition.name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            {editingId === definition.id ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSaveEdit(definition.id)}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    handleToggleActive(definition.id, definition.isActive)
                  }
                  className={`text-xs ${
                    definition.isActive
                      ? "text-green-600 hover:bg-green-50"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {definition.isActive ? "Aktif" : "Pasif"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStartEdit(definition)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (
                      confirm(
                        "Bu tanımlamayı silmek istediğinize emin misiniz?"
                      )
                    ) {
                      onDelete(definition.id);
                    }
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

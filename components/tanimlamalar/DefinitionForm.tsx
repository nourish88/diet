"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { DefinitionType } from "@/services/DefinitionService";

interface DefinitionFormProps {
  type: DefinitionType;
  onAdd: (name: string) => Promise<void>;
}

export const DefinitionForm = ({ type, onAdd }: DefinitionFormProps) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(name.trim());
      setName("");
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const placeholder =
    type === "su_tuketimi"
      ? "Örn: Günde 2-3 litre zencefilli su"
      : "Örn: Haftada 4-5 gün yürüyüş";

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        disabled={isSubmitting}
        className="flex-1"
      />
      <Button
        type="submit"
        disabled={!name.trim() || isSubmitting}
        className="bg-indigo-600 hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        {isSubmitting ? "Ekleniyor..." : "Ekle"}
      </Button>
    </form>
  );
};

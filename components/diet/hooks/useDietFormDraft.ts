import { useCallback, useEffect, useState } from "react";
import type { Diet } from "@/types/types";

/**
 * Local draft persistence for in-progress diets (new diet mode only).
 */
export function useDietFormDraft(
  diet: Diet,
  setDiet: React.Dispatch<React.SetStateAction<Diet>>,
  selectedClientId: number | null,
  isUpdateMode: boolean,
) {
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const DRAFT_KEY = selectedClientId
    ? `diet-draft-${selectedClientId}`
    : "diet-draft-new";

  useEffect(() => {
    if (!selectedClientId || isUpdateMode) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasData = parsed?.Oguns?.some(
          (o: { items?: unknown[] }) => (o.items?.length ?? 0) > 0,
        );
        if (hasData) setShowDraftPrompt(true);
      }
    } catch {
      /* ignore corrupt draft */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedClientId || isUpdateMode) return;
    const interval = setInterval(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(diet));
      } catch {
        /* quota exceeded */
      }
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diet, selectedClientId, isUpdateMode]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, [DRAFT_KEY]);

  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setDiet(JSON.parse(saved));
    } catch {
      /* ignore */
    }
    setShowDraftPrompt(false);
  }, [DRAFT_KEY, setDiet]);

  return {
    showDraftPrompt,
    setShowDraftPrompt,
    clearDraft,
    restoreDraft,
  };
}

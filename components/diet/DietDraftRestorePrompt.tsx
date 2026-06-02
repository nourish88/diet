interface DietDraftRestorePromptProps {
  onRestore: () => void;
  onDismiss: () => void;
}

export function DietDraftRestorePrompt({
  onRestore,
  onDismiss,
}: DietDraftRestorePromptProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm no-print">
      <span className="text-foreground flex-1">
        Kaydedilmemiş bir diyet taslağı var. Kaldığın yerden devam et mi?
      </span>
      <button
        type="button"
        onClick={onRestore}
        className="px-3 py-1 bg-warning text-warning-foreground rounded hover:opacity-90 text-xs font-medium transition-opacity"
      >
        Devam Et
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="px-3 py-1 bg-muted text-foreground rounded hover:bg-accent text-xs transition-colors"
      >
        Yoksay
      </button>
    </div>
  );
}

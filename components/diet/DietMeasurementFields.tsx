interface DietMeasurementFieldsProps {
  weight: string;
  bodyFat: string;
  disabled: boolean;
  onWeightChange: (value: string) => void;
  onBodyFatChange: (value: string) => void;
}

export function DietMeasurementFields({
  weight,
  bodyFat,
  disabled,
  onWeightChange,
  onBodyFatChange,
}: DietMeasurementFieldsProps) {
  return (
    <div className="mb-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/20">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        Bu tarihe ölçüm ekle (isteğe bağlı)
      </p>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Kilo (kg)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="ör. 72.5"
            className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={weight}
            onChange={(event) => onWeightChange(event.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Yağ (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="ör. 24.3"
            className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={bodyFat}
            onChange={(event) => onBodyFatChange(event.target.value)}
            disabled={disabled}
          />
        </div>
        <p className="text-[11px] text-slate-400 self-center">
          Diyet kaydedilirken otomatik olarak da kaydedilir.
        </p>
      </div>
    </div>
  );
}

"use client";
import { ProgressSummary as ProgressSummaryType } from "@/services/ProgressService";
import { TrendingDown, TrendingUp, Minus, Target } from "lucide-react";

interface ProgressSummaryProps {
  summary: ProgressSummaryType;
}

export default function ProgressSummary({ summary }: ProgressSummaryProps) {
  const getWeightIcon = () => {
    if (summary.weightChange === null) return null;
    if (summary.weightChange < 0) {
      return <TrendingDown className="w-5 h-5 text-green-600" />;
    } else if (summary.weightChange > 0) {
      return <TrendingUp className="w-5 h-5 text-red-600" />;
    } else {
      return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getWeightColor = () => {
    if (summary.weightChange === null) return "bg-accent";
    if (summary.weightChange < 0) return "bg-green-50 border-green-200";
    if (summary.weightChange > 0) return "bg-red-50 border-red-200";
    return "bg-muted/30 border-border";
  };

  return (
    <div className="space-y-4">
      {/* Main Summary Card */}
      <div
        className={`p-6 rounded-lg border-2 ${getWeightColor()} transition-all duration-300`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Target className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Gelişim Özeti
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{summary.message}</p>
            </div>
          </div>
          {getWeightIcon()}
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.weightChange !== null && (
          <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Kilo Değişimi</p>
            <p
              className={`text-2xl font-bold ${
                summary.weightChange < 0
                  ? "text-green-600"
                  : summary.weightChange > 0
                  ? "text-red-600"
                  : "text-muted-foreground"
              }`}
            >
              {summary.weightChange > 0 ? "+" : ""}
              {summary.weightChange.toFixed(1)} kg
            </p>
          </div>
        )}

        {summary.waistChange !== null && (
          <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Bel Çevresi</p>
            <p
              className={`text-2xl font-bold ${
                summary.waistChange < 0
                  ? "text-green-600"
                  : summary.waistChange > 0
                  ? "text-red-600"
                  : "text-muted-foreground"
              }`}
            >
              {summary.waistChange > 0 ? "+" : ""}
              {summary.waistChange.toFixed(1)} cm
            </p>
          </div>
        )}

        {summary.hipChange !== null && (
          <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Kalça Çevresi</p>
            <p
              className={`text-2xl font-bold ${
                summary.hipChange < 0
                  ? "text-green-600"
                  : summary.hipChange > 0
                  ? "text-red-600"
                  : "text-muted-foreground"
              }`}
            >
              {summary.hipChange > 0 ? "+" : ""}
              {summary.hipChange.toFixed(1)} cm
            </p>
          </div>
        )}

        {summary.bodyFatChange !== null && (
          <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Vücut Yağ Oranı</p>
            <p
              className={`text-2xl font-bold ${
                summary.bodyFatChange < 0
                  ? "text-green-600"
                  : summary.bodyFatChange > 0
                  ? "text-red-600"
                  : "text-muted-foreground"
              }`}
            >
              {summary.bodyFatChange > 0 ? "+" : ""}
              {summary.bodyFatChange.toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


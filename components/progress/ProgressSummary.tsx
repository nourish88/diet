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
      return <Minus className="w-5 h-5 text-gray-600" />;
    }
  };

  const getWeightColor = () => {
    if (summary.weightChange === null) return "bg-gray-100";
    if (summary.weightChange < 0) return "bg-green-50 border-green-200";
    if (summary.weightChange > 0) return "bg-red-50 border-red-200";
    return "bg-gray-50 border-gray-200";
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
              <h3 className="text-lg font-semibold text-gray-900">
                Gelişim Özeti
              </h3>
              <p className="text-sm text-gray-600 mt-1">{summary.message}</p>
            </div>
          </div>
          {getWeightIcon()}
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.weightChange !== null && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Kilo Değişimi</p>
            <p
              className={`text-2xl font-bold ${
                summary.weightChange < 0
                  ? "text-green-600"
                  : summary.weightChange > 0
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {summary.weightChange > 0 ? "+" : ""}
              {summary.weightChange.toFixed(1)} kg
            </p>
          </div>
        )}

        {summary.waistChange !== null && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Bel Çevresi</p>
            <p
              className={`text-2xl font-bold ${
                summary.waistChange < 0
                  ? "text-green-600"
                  : summary.waistChange > 0
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {summary.waistChange > 0 ? "+" : ""}
              {summary.waistChange.toFixed(1)} cm
            </p>
          </div>
        )}

        {summary.hipChange !== null && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Kalça Çevresi</p>
            <p
              className={`text-2xl font-bold ${
                summary.hipChange < 0
                  ? "text-green-600"
                  : summary.hipChange > 0
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {summary.hipChange > 0 ? "+" : ""}
              {summary.hipChange.toFixed(1)} cm
            </p>
          </div>
        )}

        {summary.bodyFatChange !== null && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Vücut Yağ Oranı</p>
            <p
              className={`text-2xl font-bold ${
                summary.bodyFatChange < 0
                  ? "text-green-600"
                  : summary.bodyFatChange > 0
                  ? "text-red-600"
                  : "text-gray-600"
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


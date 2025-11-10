"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartDataPoint } from "@/services/ProgressService";

interface ProgressChartProps {
  data: ChartDataPoint[];
  showWeight?: boolean;
  showWaist?: boolean;
  showHip?: boolean;
  showBodyFat?: boolean;
}

export default function ProgressChart({
  data,
  showWeight = true,
  showWaist = true,
  showHip = true,
  showBodyFat = true,
}: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Henüz veri bulunmuyor</p>
      </div>
    );
  }

  // Format date for display
  const formattedData = data.map((point) => ({
    ...point,
    dateFormatted: new Date(point.date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={formattedData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="dateFormatted"
          stroke="#6b7280"
          style={{ fontSize: "12px" }}
        />
        <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "8px",
          }}
          formatter={(value: any) => {
            if (value === null || value === undefined) return "N/A";
            if (typeof value === "number") {
              return value.toFixed(1);
            }
            return String(value);
          }}
        />
        <Legend />
        {showWeight && (
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Kilo (kg)"
            connectNulls={false}
          />
        )}
        {showWaist && (
          <Line
            type="monotone"
            dataKey="waist"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Bel Çevresi (cm)"
            connectNulls={false}
          />
        )}
        {showHip && (
          <Line
            type="monotone"
            dataKey="hip"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Kalça Çevresi (cm)"
            connectNulls={false}
          />
        )}
        {showBodyFat && (
          <Line
            type="monotone"
            dataKey="bodyFat"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Vücut Yağ Oranı (%)"
            connectNulls={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}


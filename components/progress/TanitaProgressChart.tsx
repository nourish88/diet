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
  ComposedChart,
  Bar,
  Area,
  AreaChart,
} from "recharts";

interface TanitaMeasurement {
  id: number;
  measureDate: string;
  weight: number | null;
  fatRate: number | null;
  fatMass: number | null;
  muscleMass: number | null;
  boneMass: number | null;
  totalBodyWater: number | null;
  bodyWaterRate: number | null;
  bmi: number | null;
  visceralFatRate: number | null;
  basalMetabolism: number | null;
  bmr: number | null;
}

interface TanitaProgressChartProps {
  data: TanitaMeasurement[];
}

export default function TanitaProgressChart({
  data,
}: TanitaProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Henüz Tanita ölçüm verisi bulunmuyor</p>
      </div>
    );
  }

  // Format data for charts
  const formattedData = data
    .map((point) => ({
      ...point,
      dateFormatted: new Date(point.measureDate).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
      }),
      date: new Date(point.measureDate).getTime(),
    }))
    .sort((a, b) => a.date - b.date);

  return (
    <div>
      {/* Weight and Body Composition Chart - ONLY THIS ONE */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dateFormatted"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            yAxisId="left"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
            label={{ value: "Kilo (kg)", angle: -90, position: "insideLeft" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
            label={{ value: "Oran (%)", angle: 90, position: "insideRight" }}
          />
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
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="weight"
            fill="#3b82f6"
            fillOpacity={0.2}
            stroke="#3b82f6"
            strokeWidth={2}
            name="Kilo (kg)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="fatRate"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Yağ Oranı (%)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bodyWaterRate"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Su Oranı (%)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

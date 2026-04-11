"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartDataPoint {
  label: string;
  km: number;
}

interface WorkoutBarChartProps {
  data: ChartDataPoint[];
}

export function WorkoutBarChart({ data }: WorkoutBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-800"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-gray-500"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-gray-500"
          unit=" km"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value) => [`${Number(value ?? 0).toFixed(1)} km`, "Distance"]}
        />
        <Bar
          dataKey="km"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

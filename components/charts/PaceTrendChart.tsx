"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { secondsToMMSS } from "@/lib/pace";

export interface PaceTrendPoint {
  week: string; // e.g. "W14"
  paceSeconds: number; // avg pace in seconds/km
}

interface PaceTrendChartProps {
  data: PaceTrendPoint[];
}

function formatPaceTick(value: number): string {
  if (!value) return "";
  return secondsToMMSS(value);
}

export function PaceTrendChart({ data }: PaceTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={data}
        margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-800"
        />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-gray-500"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-gray-500"
          tickFormatter={formatPaceTick}
          reversed
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--popover, #1f2937)",
            border: "1px solid var(--border, #374151)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value) => [
            `${secondsToMMSS(Number(value))} /km`,
            "Avg Pace",
          ]}
        />
        <Line
          type="monotone"
          dataKey="paceSeconds"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: "#10b981" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

"use client";

import dynamic from "next/dynamic";

const WorkoutBarChart = dynamic(
  () => import("@/components/WorkoutBarChart").then((m) => ({ default: m.WorkoutBarChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
    ),
  }
);

interface ChartDataPoint {
  label: string;
  km: number;
}

interface TraineeAnalyticsChartProps {
  data: ChartDataPoint[];
}

export function TraineeAnalyticsChart({ data }: TraineeAnalyticsChartProps) {
  return <WorkoutBarChart data={data} />;
}

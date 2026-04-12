"use client";

import dynamic from "next/dynamic";
import type { WeeklyNavPoint } from "./WeeklyVolumeNavigator";
import type { PaceTrendPoint } from "./PaceTrendChart";

const WeeklyVolumeNavigator = dynamic(
  () =>
    import("./WeeklyVolumeNavigator").then((m) => m.WeeklyVolumeNavigator),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
    ),
  }
);

const PaceTrendChart = dynamic(
  () => import("./PaceTrendChart").then((m) => m.PaceTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
    ),
  }
);

interface DashboardChartsProps {
  weeklyData: WeeklyNavPoint[];
  initialWeekIndex: number;
  paceData: PaceTrendPoint[];
}

export function DashboardCharts({
  weeklyData,
  initialWeekIndex,
  paceData,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 flex flex-col" style={{ minHeight: 260 }}>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Weekly Volume (km)
        </h2>
        <div className="flex-1">
          <WeeklyVolumeNavigator
            weeks={weeklyData}
            initialIndex={initialWeekIndex}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Pace Trend (min/km)
        </h2>
        {paceData.length > 0 ? (
          <PaceTrendChart data={paceData} />
        ) : (
          <div className="flex items-center justify-center h-[220px] text-sm text-gray-400 dark:text-gray-500">
            No pace data yet
          </div>
        )}
      </div>
    </div>
  );
}

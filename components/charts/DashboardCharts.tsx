"use client";

import dynamic from "next/dynamic";
import type { WeeklyVolumePoint } from "./WeeklyVolumeChart";
import type { PaceTrendPoint } from "./PaceTrendChart";

const WeeklyVolumeChart = dynamic(
  () => import("./WeeklyVolumeChart").then((m) => m.WeeklyVolumeChart),
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
  volumeData: WeeklyVolumePoint[];
  paceData: PaceTrendPoint[];
}

export function DashboardCharts({ volumeData, paceData }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Weekly Volume (km)
        </h2>
        <WeeklyVolumeChart data={volumeData} />
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

"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface WeeklyNavPoint {
  label: string; // e.g. "6 Apr – 12 Apr"
  km: number;
}

interface WeeklyVolumeNavigatorProps {
  weeks: WeeklyNavPoint[];
  initialIndex: number; // index of "current" week
}

export function WeeklyVolumeNavigator({
  weeks,
  initialIndex,
}: WeeklyVolumeNavigatorProps) {
  const [idx, setIdx] = useState(initialIndex);
  const week = weeks[idx]!;
  const isCurrentWeek = idx === initialIndex;

  return (
    <div className="flex flex-col h-full">
      {/* Navigation row */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-25 transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            {isCurrentWeek ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                This week
              </span>
            ) : (
              week.label
            )}
          </p>
          {!isCurrentWeek && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {week.label}
            </p>
          )}
        </div>

        <button
          onClick={() => setIdx((i) => Math.min(initialIndex, i + 1))}
          disabled={idx === initialIndex}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-25 transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Big number */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-5xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {week.km.toFixed(1)}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">km</p>
      </div>

      {/* Mini sparkline — all weeks as thin bars */}
      <div className="flex items-end gap-1 mt-4 h-8">
        {weeks.map((w, i) => {
          const maxKm = Math.max(...weeks.map((x) => x.km), 0.1);
          const heightPct = Math.max((w.km / maxKm) * 100, 4);
          return (
            <button
              key={i}
              onClick={() => setIdx(i)}
              title={`${w.label}: ${w.km.toFixed(1)} km`}
              style={{ height: `${heightPct}%` }}
              className={`flex-1 rounded-sm transition-colors ${
                i === idx
                  ? "bg-emerald-500"
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

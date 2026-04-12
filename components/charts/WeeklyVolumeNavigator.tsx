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

  const maxKm = Math.max(...weeks.map((w) => w.km), 0.1);

  return (
    <div className="flex flex-col" style={{ minHeight: 200 }}>
      {/* Navigation row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 text-center min-w-0">
          {isCurrentWeek && (
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-0.5">
              Current week
            </span>
          )}
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
            {week.label}
          </p>
        </div>

        <button
          onClick={() => setIdx((i) => Math.min(initialIndex, i + 1))}
          disabled={idx === initialIndex}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Big km number */}
      <div className="flex-1 flex flex-col items-center justify-center py-4">
        <p className="text-6xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
          {week.km.toFixed(1)}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">km this week</p>
      </div>

      {/* Sparkline — click a bar to jump to that week */}
      <div className="flex items-end gap-1 h-10">
        {weeks.map((w, i) => {
          const heightPct = Math.max((w.km / maxKm) * 100, 5);
          const isSelected = i === idx;
          const isThisWeek = i === initialIndex;
          return (
            <button
              key={i}
              onClick={() => setIdx(i)}
              title={`${w.label}: ${w.km.toFixed(1)} km`}
              style={{ height: `${heightPct}%` }}
              className={`flex-1 rounded-sm transition-colors ${
                isSelected
                  ? "bg-emerald-500"
                  : isThisWeek
                  ? "bg-emerald-200 dark:bg-emerald-900"
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-gray-400 dark:text-gray-600">
        <span>{weeks[0]?.label.split("–")[0]?.trim()}</span>
        <span>{weeks[weeks.length - 1]?.label.split("–")[0]?.trim()}</span>
      </div>
    </div>
  );
}

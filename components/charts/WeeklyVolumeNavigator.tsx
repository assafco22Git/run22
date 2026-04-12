"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DayPoint {
  day: string;   // "Sun" | "Mon" | …
  date: string;  // "6 Apr"
  km: number;
  workouts: { title: string; km: number }[];
}

export interface WeeklyNavPoint {
  label: string;  // "6 Apr – 12 Apr"
  km: number;     // week total
  days: DayPoint[]; // 7 entries, Sun → Sat
}

interface Props {
  weeks: WeeklyNavPoint[];
  initialIndex: number;
}

export function WeeklyVolumeNavigator({ weeks, initialIndex }: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const week = weeks[idx]!;
  const isCurrentWeek = idx === initialIndex;
  const maxKm = Math.max(...week.days.map((d) => d.km), 0.1);

  return (
    <div className="flex flex-col gap-3">
      {/* ── Navigation header ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 text-center min-w-0">
          {isCurrentWeek && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 leading-none mb-0.5">
              Current week
            </p>
          )}
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
            {week.label}
          </p>
        </div>

        <button
          onClick={() => setIdx((i) => Math.min(initialIndex, i + 1))}
          disabled={idx === initialIndex}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Total for the week ── */}
      <p className="text-center text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
        {week.km.toFixed(1)}{" "}
        <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
          km
        </span>
      </p>

      {/* ── Day bar chart ── */}
      <div className="relative flex items-end gap-1 h-28">
        {week.days.map((day, i) => {
          const heightPct = day.km > 0 ? Math.max((day.km / maxKm) * 100, 8) : 0;
          const isHovered = hoveredDay === i;
          const hasRun = day.km > 0;

          return (
            <div
              key={i}
              className="relative flex-1 h-full flex flex-col justify-end"
              onMouseEnter={() => setHoveredDay(i)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div
                  className={`
                    absolute bottom-full mb-2 z-20
                    bg-gray-900 dark:bg-gray-700 text-white
                    rounded-xl shadow-xl
                    px-3 py-2 text-xs whitespace-nowrap
                    pointer-events-none
                    ${i <= 1 ? "left-0" : i >= 5 ? "right-0" : "left-1/2 -translate-x-1/2"}
                  `}
                >
                  <p className="font-semibold mb-1">{day.date}</p>
                  {hasRun ? (
                    <>
                      {day.workouts.map((w, wi) => (
                        <p key={wi} className="text-gray-300">
                          {w.title}
                          {w.km > 0 && (
                            <span className="text-emerald-400 ml-1">
                              {w.km.toFixed(1)} km
                            </span>
                          )}
                        </p>
                      ))}
                      {day.workouts.length > 1 && (
                        <p className="mt-1 pt-1 border-t border-gray-600 text-emerald-400 font-medium">
                          Total: {day.km.toFixed(1)} km
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-400">Rest day</p>
                  )}
                  {/* Arrow */}
                  <div
                    className={`
                      absolute top-full w-0 h-0
                      border-l-4 border-r-4 border-t-4
                      border-l-transparent border-r-transparent
                      border-t-gray-900 dark:border-t-gray-700
                      ${i <= 1 ? "left-4" : i >= 5 ? "right-4" : "left-1/2 -translate-x-1/2"}
                    `}
                  />
                </div>
              )}

              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all duration-150 ${
                  hasRun
                    ? isHovered
                      ? "bg-emerald-400"
                      : "bg-emerald-500"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
                style={{ height: hasRun ? `${heightPct}%` : "3px" }}
              />
            </div>
          );
        })}
      </div>

      {/* ── Day labels ── */}
      <div className="flex gap-1">
        {week.days.map((day) => (
          <div
            key={day.day}
            className="flex-1 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500"
          >
            {day.day}
          </div>
        ))}
      </div>
    </div>
  );
}

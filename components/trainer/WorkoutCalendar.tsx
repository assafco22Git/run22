"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarWorkout {
  id: string;
  title: string;
  scheduledAt: string; // ISO string
  status: string;
}

interface WorkoutCalendarProps {
  workouts: CalendarWorkout[];
}

function statusColor(status: string) {
  if (status === "COMPLETED") return "bg-emerald-500";
  if (status === "SKIPPED") return "bg-amber-400";
  return "bg-blue-400"; // PENDING
}

function statusBg(status: string) {
  if (status === "COMPLETED") return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800";
  if (status === "SKIPPED") return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
  return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function WorkoutCalendar({ workouts }: WorkoutCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [selected, setSelected] = useState<string | null>(null); // "YYYY-MM-DD"

  // Build a map of date → workouts
  const workoutMap = new Map<string, CalendarWorkout[]>();
  for (const w of workouts) {
    const d = new Date(w.scheduledAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!workoutMap.has(key)) workoutMap.set(key, []);
    workoutMap.get(key)!.push(w);
  }

  // Calendar grid
  const firstDay = new Date(year, month, 1);
  // Week starts Monday: getDay() returns 0=Sun; shift so Mon=0
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedWorkouts = selected ? (workoutMap.get(selected) ?? []) : [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          Workout Calendar
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[130px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="bg-gray-50 dark:bg-gray-900/50 h-10 sm:h-12" />;
          }
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayWorkouts = workoutMap.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selected;

          return (
            <button
              key={key}
              onClick={() => setSelected(isSelected ? null : key)}
              className={cn(
                "bg-white dark:bg-gray-900 h-10 sm:h-12 flex flex-col items-center justify-start pt-1 relative transition-colors",
                "hover:bg-gray-50 dark:hover:bg-gray-800/60",
                isSelected && "bg-emerald-50 dark:bg-emerald-950/30"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                  isToday
                    ? "bg-emerald-500 text-white"
                    : "text-gray-700 dark:text-gray-300"
                )}
              >
                {day}
              </span>
              {dayWorkouts.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayWorkouts.slice(0, 3).map((w) => (
                    <span
                      key={w.id}
                      className={cn("w-1.5 h-1.5 rounded-full", statusColor(w.status))}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Completed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Pending</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Skipped</span>
      </div>

      {/* Selected day workouts */}
      {selected && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {new Date(selected + "T12:00:00").toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          {selectedWorkouts.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No workouts this day.</p>
          ) : (
            selectedWorkouts.map((w) => (
              <div
                key={w.id}
                className={cn(
                  "px-3 py-2 rounded-lg border text-sm font-medium",
                  statusBg(w.status)
                )}
              >
                <span className="text-gray-800 dark:text-gray-200">{w.title}</span>
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400 capitalize">
                  {w.status.toLowerCase()}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

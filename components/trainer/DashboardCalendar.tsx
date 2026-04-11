"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardWorkout {
  id: string;
  title: string;
  scheduledAt: string; // ISO string
  status: string;
  traineeName: string;
  traineeId: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function statusDot(status: string) {
  if (status === "COMPLETED") return "bg-emerald-500";
  if (status === "SKIPPED") return "bg-amber-400";
  return "bg-blue-400";
}

function statusLabel(status: string) {
  if (status === "COMPLETED") return "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800";
  if (status === "SKIPPED") return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
  return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800";
}

interface Props {
  workouts: DashboardWorkout[];
}

export function DashboardCalendar({ workouts }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  // Build date → workouts map
  const workoutMap = new Map<string, DashboardWorkout[]>();
  for (const w of workouts) {
    const d = new Date(w.scheduledAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!workoutMap.has(key)) workoutMap.set(key, []);
    workoutMap.get(key)!.push(w);
  }

  // Calendar grid
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

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

  const selectedWorkouts = selected ? (workoutMap.get(selected) ?? []) : [];

  // Month summary
  const monthWorkouts = Array.from(workoutMap.entries())
    .filter(([key]) => key.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .flatMap(([, ws]) => ws);
  const completedThisMonth = monthWorkouts.filter(w => w.status === "COMPLETED").length;
  const pendingThisMonth = monthWorkouts.filter(w => w.status === "PENDING").length;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          Schedule
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month summary pills */}
      <div className="flex gap-2 mb-4 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          {monthWorkouts.length} scheduled
        </span>
        {completedThisMonth > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            {completedThisMonth} completed
          </span>
        )}
        {pendingThisMonth > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
            {pendingThisMonth} pending
          </span>
        )}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`e${i}`} className="bg-gray-50 dark:bg-gray-900/50 h-12 sm:h-14" />;
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
                "bg-white dark:bg-gray-900 h-12 sm:h-14 flex flex-col items-center justify-start pt-1.5 transition-colors",
                "hover:bg-gray-50 dark:hover:bg-gray-800/60",
                isSelected && "bg-emerald-50 dark:bg-emerald-950/20"
              )}
            >
              <span className={cn(
                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                isToday
                  ? "bg-emerald-500 text-white"
                  : "text-gray-700 dark:text-gray-300"
              )}>
                {day}
              </span>
              {dayWorkouts.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-0.5 px-0.5">
                  {dayWorkouts.slice(0, 4).map(w => (
                    <span key={w.id} className={cn("w-1.5 h-1.5 rounded-full", statusDot(w.status))} />
                  ))}
                  {dayWorkouts.length > 4 && (
                    <span className="text-[9px] leading-none text-gray-400">+{dayWorkouts.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Completed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Pending</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Skipped</span>
      </div>

      {/* Selected day panel */}
      {selected && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {new Date(selected + "T12:00:00").toLocaleDateString("en-GB", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
          {selectedWorkouts.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No workouts this day.</p>
          ) : (
            selectedWorkouts.map(w => (
              <Link
                key={w.id}
                href={`/trainer/trainees/${w.traineeId}`}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-opacity hover:opacity-80",
                  statusLabel(w.status)
                )}
              >
                <span className="font-medium truncate">{w.title}</span>
                <span className="ml-3 text-xs font-normal shrink-0 opacity-80">{w.traineeName}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

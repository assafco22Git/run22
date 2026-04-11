"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardWorkout {
  id: string;
  title: string;
  scheduledAt: string; // ISO string
  status: string;
  traineeName: string;
  traineeId: string;
}

// ─── Per-trainee color palette ───────────────────────────────────────────────

const PALETTE = [
  { dot: "bg-blue-500",   faint: "bg-blue-100 dark:bg-blue-950/40",   text: "text-blue-700 dark:text-blue-300",   border: "border-blue-200 dark:border-blue-800"   },
  { dot: "bg-violet-500", faint: "bg-violet-100 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800" },
  { dot: "bg-rose-500",   faint: "bg-rose-100 dark:bg-rose-950/40",   text: "text-rose-700 dark:text-rose-300",   border: "border-rose-200 dark:border-rose-800"   },
  { dot: "bg-amber-500",  faint: "bg-amber-100 dark:bg-amber-950/40",  text: "text-amber-700 dark:text-amber-300",  border: "border-amber-200 dark:border-amber-800"  },
  { dot: "bg-cyan-500",   faint: "bg-cyan-100 dark:bg-cyan-950/40",   text: "text-cyan-700 dark:text-cyan-300",   border: "border-cyan-200 dark:border-cyan-800"   },
  { dot: "bg-pink-500",   faint: "bg-pink-100 dark:bg-pink-950/40",   text: "text-pink-700 dark:text-pink-300",   border: "border-pink-200 dark:border-pink-800"   },
  { dot: "bg-teal-500",   faint: "bg-teal-100 dark:bg-teal-950/40",   text: "text-teal-700 dark:text-teal-300",   border: "border-teal-200 dark:border-teal-800"   },
  { dot: "bg-orange-500", faint: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
];

function buildColorMap(workouts: DashboardWorkout[]): Record<string, number> {
  const ids = [...new Set(workouts.map(w => w.traineeId))].sort();
  return Object.fromEntries(ids.map((id, i) => [id, i % PALETTE.length]));
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Sunday first
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function statusOpacity(status: string) {
  if (status === "COMPLETED") return "opacity-100";
  if (status === "SKIPPED")   return "opacity-30";
  return "opacity-60"; // PENDING
}

function statusLabel(status: string) {
  if (status === "COMPLETED") return "Completed";
  if (status === "SKIPPED")   return "Skipped";
  return "Pending";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { workouts: DashboardWorkout[] }

export function DashboardCalendar({ workouts }: Props) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null); // "YYYY-MM-DD"

  const colorMap = buildColorMap(workouts);

  // date key helpers
  function toKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  const todayKey = toKey(today);

  // Build date → workouts map
  const workoutMap = new Map<string, DashboardWorkout[]>();
  for (const w of workouts) {
    const key = toKey(new Date(w.scheduledAt));
    if (!workoutMap.has(key)) workoutMap.set(key, []);
    workoutMap.get(key)!.push(w);
  }

  // Calendar grid — Sunday first
  const firstDay   = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=Sun already
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
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

  // Month summary
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthWorkouts = Array.from(workoutMap.entries())
    .filter(([k]) => k.startsWith(prefix))
    .flatMap(([, ws]) => ws);
  const completedCount = monthWorkouts.filter(w => w.status === "COMPLETED").length;
  const pendingCount   = monthWorkouts.filter(w => w.status === "PENDING").length;

  const selectedWorkouts = selected ? (workoutMap.get(selected) ?? []) : [];

  // Unique trainees this month for the legend
  const traineesThisMonth = [...new Map(
    monthWorkouts.map(w => [w.traineeId, w.traineeName])
  ).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">

      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Schedule</h2>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month summary pills */}
      <div className="flex gap-2 mb-4 flex-wrap text-xs">
        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          {monthWorkouts.length} scheduled
        </span>
        {completedCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            {completedCount} completed
          </span>
        )}
        {pendingCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Trainee legend */}
      {traineesThisMonth.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
          {traineesThisMonth.map(([id, name]) => {
            const c = PALETTE[colorMap[id] ?? 0]!;
            return (
              <span key={id} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", c.dot)} />
                {name}
              </span>
            );
          })}
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`e${i}`} className="bg-gray-50 dark:bg-gray-900/50 h-12 sm:h-14" />;
          }
          const key = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const dayWorkouts = workoutMap.get(key) ?? [];
          const isToday    = key === todayKey;
          const isSelected = key === selected;

          return (
            <div key={key} className="relative group">
              <button
                onClick={() => setSelected(isSelected ? null : key)}
                className={cn(
                  "w-full bg-white dark:bg-gray-900 h-12 sm:h-14 flex flex-col items-center justify-start pt-1.5 transition-colors",
                  "hover:bg-gray-50 dark:hover:bg-gray-800/60",
                  isSelected && "bg-emerald-50 dark:bg-emerald-950/20"
                )}
              >
                <span className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-emerald-500 text-white" : "text-gray-700 dark:text-gray-300"
                )}>
                  {day}
                </span>

                {dayWorkouts.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5 mt-0.5 px-0.5">
                    {dayWorkouts.slice(0, 5).map(w => {
                      const c = PALETTE[colorMap[w.traineeId] ?? 0]!;
                      return (
                        <span
                          key={w.id}
                          className={cn("w-1.5 h-1.5 rounded-full", c.dot, statusOpacity(w.status))}
                        />
                      );
                    })}
                    {dayWorkouts.length > 5 && (
                      <span className="text-[9px] leading-none text-gray-400">+{dayWorkouts.length - 5}</span>
                    )}
                  </div>
                )}
              </button>

              {/* Hover tooltip — shows per-trainee snip */}
              {dayWorkouts.length > 0 && (
                <div className={cn(
                  "absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50",
                  "invisible opacity-0 group-hover:visible group-hover:opacity-100",
                  "transition-opacity duration-150 pointer-events-none",
                  "bg-white dark:bg-gray-800 rounded-xl shadow-xl",
                  "border border-gray-200 dark:border-gray-700 p-2.5",
                  "min-w-[170px] max-w-[220px]"
                )}>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                    {new Date(key + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  {dayWorkouts.map(w => {
                    const c = PALETTE[colorMap[w.traineeId] ?? 0]!;
                    return (
                      <div key={w.id} className="flex items-start gap-1.5 py-0.5">
                        <span className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", c.dot)} />
                        <div className="min-w-0">
                          <p className={cn("text-[11px] font-semibold leading-tight truncate", c.text)}>
                            {w.traineeName}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight truncate">
                            {w.title}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day — workout cards */}
      {selected && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {new Date(selected + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
            </p>
            <button
              onClick={() => setSelected(null)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedWorkouts.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No workouts this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedWorkouts.map(w => {
                const c = PALETTE[colorMap[w.traineeId] ?? 0]!;
                return (
                  <Link
                    key={w.id}
                    href={`/trainer/workouts/${w.id}`}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all",
                      "hover:shadow-sm hover:scale-[1.01]",
                      c.faint, c.border
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", c.dot)} />
                      <div className="min-w-0">
                        <p className={cn("text-sm font-semibold truncate", c.text)}>{w.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{w.traineeName} · {statusLabel(w.status)}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

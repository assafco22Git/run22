"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkoutSummary {
  id: string;
  title: string;
  scheduledAt: string; // ISO string
  status: "PENDING" | "COMPLETED" | "SKIPPED";
}

interface WorkoutCalendarProps {
  workouts: WorkoutSummary[];
  currentMonth: string; // "2026-04"
}

const STATUS_DOT: Record<WorkoutSummary["status"], string> = {
  PENDING: "bg-yellow-400",
  COMPLETED: "bg-emerald-500",
  SKIPPED: "bg-gray-400",
};

const STATUS_LABEL: Record<WorkoutSummary["status"], string> = {
  PENDING: "Scheduled",
  COMPLETED: "Done",
  SKIPPED: "Skipped",
};

// Sunday first
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WorkoutCalendar({
  workouts,
  currentMonth,
}: WorkoutCalendarProps) {
  const router = useRouter();

  const [year, mon] = currentMonth.split("-").map(Number);
  const safeYear  = year ?? new Date().getFullYear();
  const safeMonth = (mon ?? new Date().getMonth() + 1) - 1; // 0-indexed

  const firstDayOfMonth = new Date(safeYear, safeMonth, 1);
  const daysInMonth     = new Date(safeYear, safeMonth + 1, 0).getDate();

  // Sunday = 0 already, so no offset needed
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun

  const monthName = firstDayOfMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Build a map: day number → workouts
  const workoutsByDay: Record<number, WorkoutSummary[]> = {};
  for (const w of workouts) {
    const date = new Date(w.scheduledAt);
    const day  = date.getDate();
    if (!workoutsByDay[day]) workoutsByDay[day] = [];
    workoutsByDay[day]!.push(w);
  }

  function navigateMonth(direction: "prev" | "next") {
    const d = new Date(safeYear, safeMonth + (direction === "next" ? 1 : -1), 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/calendar?month=${newMonth}`);
  }

  const today          = new Date();
  const isCurrentMonth = today.getFullYear() === safeYear && today.getMonth() === safeMonth;
  const todayDay       = isCurrentMonth ? today.getDate() : -1;

  const totalCells = startDayOfWeek + daysInMonth;
  const rows       = Math.ceil(totalCells / 7);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => navigateMonth("prev")}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {monthName}
        </h2>
        <button
          onClick={() => navigateMonth("next")}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers — Sunday first */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
        {DAY_HEADERS.map(d => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: rows * 7 }).map((_, idx) => {
          const dayNum    = idx - startDayOfWeek + 1;
          const isValidDay  = dayNum >= 1 && dayNum <= daysInMonth;
          const dayWorkouts = isValidDay ? (workoutsByDay[dayNum] ?? []) : [];
          const isToday     = dayNum === todayDay;

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[80px] p-2 border-b border-r border-gray-100 dark:border-gray-800/60",
                !isValidDay && "bg-gray-50/50 dark:bg-gray-900/50",
                isToday && "bg-emerald-50/40 dark:bg-emerald-950/20"
              )}
            >
              {isValidDay && (
                <>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1",
                      isToday
                        ? "bg-emerald-500 text-white"
                        : "text-gray-700 dark:text-gray-300"
                    )}
                  >
                    {dayNum}
                  </span>

                  <div className="space-y-1">
                    {dayWorkouts.map(w => (
                      <Link
                        key={w.id}
                        href={`/workouts/${w.id}`}
                        className="flex items-center gap-1.5 group"
                        title={`${w.title} — ${STATUS_LABEL[w.status]}`}
                      >
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125",
                            STATUS_DOT[w.status]
                          )}
                        />
                        <span className="text-[10px] leading-tight text-gray-700 dark:text-gray-300 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {w.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-3 border-t border-gray-200 dark:border-gray-800">
        {Object.entries(STATUS_DOT).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", cls)} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {STATUS_LABEL[status as WorkoutSummary["status"]]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

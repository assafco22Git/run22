"use client";

import { useState, useTransition } from "react";
import { savePreferences, type DayPref } from "@/app/actions/preferences";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL  = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TIME_OPTIONS: { value: DayPref["time"]; label: string; emoji: string }[] = [
  { value: "any",       label: "Any time",  emoji: "🕐" },
  { value: "morning",   label: "Morning",   emoji: "🌅" },
  { value: "afternoon", label: "Afternoon", emoji: "☀️" },
  { value: "evening",   label: "Evening",   emoji: "🌙" },
];

interface Props {
  initialDays: DayPref[];
  initialNotes: string;
}

export function PreferencesForm({ initialDays, initialNotes }: Props) {
  const [days, setDays] = useState<DayPref[]>(initialDays);
  const [notes, setNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();

  function toggleDay(idx: number) {
    setDays((prev) =>
      prev.map((d) => (d.day === idx ? { ...d, enabled: !d.enabled } : d))
    );
  }

  function setTime(idx: number, time: DayPref["time"]) {
    setDays((prev) =>
      prev.map((d) => (d.day === idx ? { ...d, time } : d))
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await savePreferences({ days, notes });
      if (result.success) {
        toast.success("Preferences saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  const enabledCount = days.filter((d) => d.enabled).length;

  return (
    <div className="space-y-4">
      {/* Day grid */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Available days
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {enabledCount} day{enabledCount !== 1 ? "s" : ""} selected
          </span>
        </div>

        <div className="space-y-2">
          {days.map((d) => (
            <div
              key={d.day}
              className={cn(
                "rounded-xl border transition-colors",
                d.enabled
                  ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40"
              )}
            >
              {/* Day toggle row */}
              <button
                type="button"
                onClick={() => toggleDay(d.day)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox visual */}
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                      d.enabled
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {d.enabled && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      d.enabled
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-gray-500 dark:text-gray-400"
                    )}>
                      {DAY_FULL[d.day]}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {DAY_NAMES[d.day]}
                </span>
              </button>

              {/* Time preference — only when enabled */}
              {d.enabled && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Preferred time
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TIME_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTime(d.day, opt.value)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                          d.time === opt.value
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700"
                        )}
                      >
                        <span>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Notes & constraints
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Anything your trainer should know — injuries, busy periods, preferences.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="e.g. Can't run early mornings on weekdays, knee injury — avoid hills…"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save preferences"}
      </button>
    </div>
  );
}

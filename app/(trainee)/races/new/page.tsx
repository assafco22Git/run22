"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRace } from "@/app/actions/races";
import { cn } from "@/lib/utils";

const PRESET_DISTANCES = [
  { label: "5K", km: 5 },
  { label: "10K", km: 10 },
  { label: "Half", km: 21.0975 },
  { label: "Marathon", km: 42.195 },
];

export default function NewRacePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [presetKm, setPresetKm] = useState<number | null>(null);
  const [customKm, setCustomKm] = useState("");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [secs, setSecs] = useState("0");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const effectiveKm = presetKm ?? (customKm ? parseFloat(customKm) : null);

  function handlePreset(km: number) {
    setPresetKm((prev) => (prev === km ? null : km));
    setCustomKm("");
  }

  function handleCustomKm(v: string) {
    setCustomKm(v);
    setPresetKm(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Race name is required");
      return;
    }
    if (!effectiveKm || effectiveKm <= 0) {
      setError("Please select or enter a distance");
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }

    const totalSeconds =
      (parseInt(hours) || 0) * 3600 +
      (parseInt(minutes) || 0) * 60 +
      (parseInt(secs) || 0);

    if (totalSeconds <= 0) {
      setError("Please enter your finish time");
      return;
    }

    startTransition(async () => {
      const result = await createRace({
        name: name.trim(),
        distance: effectiveKm! * 1000, // store in meters
        time: totalSeconds,
        date,
        notes: notes || undefined,
      });

      if (result.success) {
        window.location.href = "/races";
      } else {
        setError(result.error ?? "Failed to save race");
      }
    });
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <a
          href="/races"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-1 inline-block"
        >
          ← Back to races
        </a>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Log a Race
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Race Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tel Aviv Marathon"
              required
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Distance */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Distance
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {PRESET_DISTANCES.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p.km)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                    presetKm === p.km
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.001"
                min="0"
                value={customKm}
                onChange={(e) => handleCustomKm(e.target.value)}
                placeholder="Custom km"
                className="w-36 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">km</span>
            </div>
            {effectiveKm && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {effectiveKm.toFixed(3)} km selected
              </p>
            )}
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Finish Time
            </label>
            <div className="flex items-center gap-2">
              {[
                { label: "h", value: hours, setter: setHours, max: 23 },
                { label: "m", value: minutes, setter: setMinutes, max: 59 },
                { label: "s", value: secs, setter: setSecs, max: 59 },
              ].map(({ label, value, setter, max }) => (
                <div key={label} className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max={max}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Race Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="How was the race?"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {isPending ? "Saving…" : "Save Race"}
          </button>
          <a
            href="/races"
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

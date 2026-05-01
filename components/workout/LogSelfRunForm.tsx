"use client";

import { useState } from "react";
import { logSelfRun } from "@/app/actions/self-log";
import { pacePerKm, mmssToSeconds } from "@/lib/pace";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseDuration(raw: string): number | null {
  // Accept "mm:ss", "h:mm:ss", or plain seconds
  const parts = raw.trim().split(":");
  if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    if (isNaN(m!) || isNaN(s!)) return null;
    return m! * 60 + s!;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    if (isNaN(h!) || isNaN(m!) || isNaN(s!)) return null;
    return h! * 3600 + m! * 60 + s!;
  }
  return null;
}

function formatDurationDisplay(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

// ─── Effort selector ─────────────────────────────────────────────────────────

function EffortSelector({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const labels = ["", "Very Easy", "Easy", "Moderate", "Moderate", "Hard",
                  "Hard", "Very Hard", "Very Hard", "Max", "All-Out"];
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5,6,7,8,9,10].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          title={labels[n]}
          className={cn(
            "w-8 h-8 rounded-lg text-xs font-semibold transition-colors",
            value === n
              ? n <= 3 ? "bg-emerald-500 text-white"
                : n <= 6 ? "bg-yellow-500 text-white"
                : "bg-red-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "text-2xl transition-colors",
            (value ?? 0) >= n ? "text-yellow-400" : "text-gray-300 dark:text-gray-600 hover:text-yellow-300"
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function LogSelfRunForm() {
  const [title, setTitle]       = useState("Morning Run");
  const [runDate, setRunDate]   = useState(todayISO());
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");   // "mm:ss" or "h:mm:ss"
  const [effort, setEffort]     = useState<number | null>(null);
  const [rating, setRating]     = useState<number | null>(null);
  const [avgHr, setAvgHr]       = useState("");
  const [maxHr, setMaxHr]       = useState("");
  const [notes, setNotes]       = useState("");

  const [isPending, setIsPending] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [done, setDone]           = useState(false);

  // Live-calculated pace preview
  const distKm  = distance ? parseFloat(distance) : null;
  const durSecs = duration ? parseDuration(duration) : null;
  const livePace =
    distKm && durSecs && distKm > 0
      ? pacePerKm(distKm * 1000, durSecs)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!distKm && !durSecs) {
      setError("Enter at least a distance or duration.");
      return;
    }

    setIsPending(true);
    const result = await logSelfRun({
      title,
      runDate,
      distanceKm:      distKm     ?? undefined,
      durationSecs:    durSecs    ?? undefined,
      avgHeartRate:    avgHr      ? parseInt(avgHr)  : undefined,
      maxHeartRate:    maxHr      ? parseInt(maxHr)  : undefined,
      perceivedEffort: effort     ?? undefined,
      rating:          rating     ?? undefined,
      notes:           notes      || undefined,
    });

    if (result.success) {
      setDone(true);
    } else {
      setError(result.error ?? "Something went wrong");
      setIsPending(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 flex flex-col items-center gap-4 text-center">
        <CheckCircle2 className="w-14 h-14 text-emerald-500" />
        <div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Run logged!</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {distKm ? `${distKm.toFixed(2)} km` : ""}
            {distKm && durSecs ? " · " : ""}
            {durSecs ? formatDurationDisplay(durSecs) : ""}
            {livePace ? ` · ${livePace} /km` : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
          >
            Dashboard
          </a>
          <button
            onClick={() => {
              setDone(false); setTitle("Morning Run"); setRunDate(todayISO());
              setDistance(""); setDuration(""); setEffort(null); setRating(null);
              setAvgHr(""); setMaxHr(""); setNotes("");
            }}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Log another
          </button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Title + Date */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Run name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Morning Run"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Date
          </label>
          <input
            type="date"
            value={runDate}
            onChange={(e) => setRunDate(e.target.value)}
            max={todayISO()}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Distance + Duration */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Distance (km)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g. 5.00"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Duration <span className="text-gray-400 font-normal">(mm:ss or h:mm:ss)</span>
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 25:30"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Live pace */}
        {livePace && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-4 py-2.5">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Avg pace</span>
            <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono">{livePace} /km</span>
          </div>
        )}

        {/* Heart rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Avg heart rate (bpm)
            </label>
            <input
              type="number"
              min="30" max="250"
              value={avgHr}
              onChange={(e) => setAvgHr(e.target.value)}
              placeholder="—"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Max heart rate (bpm)
            </label>
            <input
              type="number"
              min="30" max="300"
              value={maxHr}
              onChange={(e) => setMaxHr(e.target.value)}
              placeholder="—"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Feel */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">How did it feel?</h2>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Perceived effort
          </label>
          <EffortSelector value={effort} onChange={setEffort} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Rating
          </label>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="How did it go? Any observations…"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
        ) : (
          "Save Run"
        )}
      </button>
    </form>
  );
}

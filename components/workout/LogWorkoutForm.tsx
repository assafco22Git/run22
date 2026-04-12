"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logWorkoutResult, updateWorkoutResult } from "@/app/actions/results";
import { mmssToSeconds, secondsToMMSS, pacePerKm } from "@/lib/pace";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Segment {
  id: string;
  order: number;
  distance: number; // km
  pace: string;
  remarks?: string | null;
}

interface SegmentResultState {
  segmentId: string;
  order: number;
  distanceKm: string;
  timeMMSS: string;
}

interface InitialResult {
  totalDistanceKm?: string;   // km as string
  totalMinutes?: string;
  totalSecs?: string;
  avgHr?: string;
  maxHr?: string;
  effort?: number | null;
  rating?: number | null;
  notes?: string;
  segmentResults?: { segmentId: string; distanceKm: string; timeMMSS: string }[];
}

interface LogWorkoutFormProps {
  workoutId: string;
  segments: Segment[];
  mode?: "create" | "edit";
  initial?: InitialResult;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LogWorkoutForm({
  workoutId,
  segments,
  mode = "create",
  initial,
}: LogWorkoutFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Overall stats — seed from initial values when editing
  const [distanceKm, setDistanceKm] = useState(initial?.totalDistanceKm ?? "");
  const [minutes, setMinutes] = useState(initial?.totalMinutes ?? "0");
  const [secs, setSecs] = useState(initial?.totalSecs ?? "0");
  const [avgHr, setAvgHr] = useState(initial?.avgHr ?? "");
  const [maxHr, setMaxHr] = useState(initial?.maxHr ?? "");
  const [effort, setEffort] = useState<number | null>(initial?.effort ?? null);
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Segment results
  const [segResults, setSegResults] = useState<SegmentResultState[]>(
    segments.map((s) => {
      const pre = initial?.segmentResults?.find((r) => r.segmentId === s.id);
      return {
        segmentId: s.id,
        order: s.order,
        distanceKm: pre?.distanceKm ?? "",
        timeMMSS: pre?.timeMMSS ?? "",
      };
    })
  );

  function updateSegResult(index: number, field: "distanceKm" | "timeMMSS", value: string) {
    setSegResults((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const totalDurationSecs =
      (parseInt(minutes) || 0) * 60 +
      (parseInt(secs) || 0);
    const distMeters = distanceKm ? parseFloat(distanceKm) * 1000 : undefined;

    const avgPace =
      distMeters && totalDurationSecs
        ? pacePerKm(distMeters, totalDurationSecs)
        : undefined;

    const segmentResultsData = segResults
      .filter((sr) => sr.distanceKm || sr.timeMMSS)
      .map((sr) => {
        const distM = sr.distanceKm ? parseFloat(sr.distanceKm) * 1000 : undefined;
        const durS = sr.timeMMSS ? mmssToSeconds(sr.timeMMSS) : undefined;
        const pace = distM && durS ? pacePerKm(distM, durS) : undefined;
        return { segmentId: sr.segmentId, order: sr.order, distance: distM, duration: durS, pace };
      });

    const payload = {
      totalDistance: distMeters,
      totalDuration: totalDurationSecs || undefined,
      avgPace,
      avgHeartRate: avgHr ? parseInt(avgHr) : undefined,
      maxHeartRate: maxHr ? parseInt(maxHr) : undefined,
      perceivedEffort: effort ?? undefined,
      rating: rating ?? undefined,
      notes: notes || undefined,
      segmentResults: segmentResultsData,
    };

    setIsPending(true);
    const action = mode === "edit" ? updateWorkoutResult : logWorkoutResult;
    const result = await action(workoutId, payload);

    if (result.success) {
      router.push(`/workouts/${workoutId}`);
    } else {
      setError(result.error ?? "Failed to save result");
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Overall stats */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Stats</h2>

        {/* Distance */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Total Distance (km)
          </label>
          <input
            type="number" step="0.01" min="0"
            value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)}
            placeholder="e.g. 10.5"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Total Duration</label>
          <div className="flex items-center gap-2">
            {[
              { label: "m", value: minutes, setter: setMinutes, max: 999 },
              { label: "s", value: secs, setter: setSecs, max: 59 },
            ].map(({ label, value, setter, max }) => (
              <div key={label} className="flex items-center gap-1">
                <input
                  type="number" min="0" max={max} value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Heart rate */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Heart Rate (bpm)</label>
            <input
              type="number" min="30" max="250" value={avgHr}
              onChange={(e) => setAvgHr(e.target.value)} placeholder="e.g. 155"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Max Heart Rate (bpm)</label>
            <input
              type="number" min="30" max="300" value={maxHr}
              onChange={(e) => setMaxHr(e.target.value)} placeholder="e.g. 175"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Perceived effort */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Perceived Effort (RPE 1–10)</label>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n} type="button" onClick={() => setEffort(effort === n ? null : n)}
                className={cn(
                  "w-8 h-8 rounded-lg text-sm font-medium border transition-colors",
                  effort === n
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Workout Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n} type="button" onClick={() => setRating(rating === n ? null : n)}
                className={cn(
                  "text-2xl transition-colors",
                  (rating ?? 0) >= n ? "text-yellow-400" : "text-gray-300 dark:text-gray-600 hover:text-yellow-300"
                )}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={3} placeholder="How did it go?"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>
      </div>

      {/* Segment results */}
      {segments.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Segment Results (optional)</h2>
          {segments.map((seg, idx) => {
            const sr = segResults[idx]!;
            const distM = sr.distanceKm ? parseFloat(sr.distanceKm) * 1000 : 0;
            const durS = sr.timeMMSS ? mmssToSeconds(sr.timeMMSS) : 0;
            const actualPace = distM && durS ? pacePerKm(distM, durS) : null;

            return (
              <div key={seg.id} className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Segment {idx + 1}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Target: {seg.distance.toFixed(2)} km @ {seg.pace} /km
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Actual Distance (km)</label>
                    <input
                      type="number" step="0.01" min="0" value={sr.distanceKm}
                      onChange={(e) => updateSegResult(idx, "distanceKm", e.target.value)}
                      placeholder={seg.distance.toFixed(2)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Actual Time (mm:ss)</label>
                    <input
                      type="text" value={sr.timeMMSS}
                      onChange={(e) => updateSegResult(idx, "timeMMSS", e.target.value)}
                      placeholder={seg.pace}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                {actualPace && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                    Calculated pace: {actualPace} /km
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit" disabled={isPending}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Save Result"}
        </button>
        <a
          href={`/workouts/${workoutId}`}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

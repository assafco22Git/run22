"use client";

import { useState } from "react";
import { predictRaceTime, RACE_DISTANCES } from "@/lib/predictor";
import { secondsToMMSS, formatDuration } from "@/lib/pace";

export interface WorkoutRef {
  id: string;
  label: string;     // e.g. "Easy run – 12 Apr"
  distanceM: number;
  durationS: number;
}

interface TrainingPredictorProps {
  workouts: WorkoutRef[];
}

export function TrainingPredictor({ workouts }: TrainingPredictorProps) {
  const [selectedId, setSelectedId] = useState(workouts[0]?.id ?? "");

  if (workouts.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Log at least one workout with distance and time to see predictions.
      </p>
    );
  }

  const ref = workouts.find((w) => w.id === selectedId) ?? workouts[0]!;
  const refPaceS = ref.durationS / (ref.distanceM / 1000);

  const predictions = RACE_DISTANCES.map((d) => {
    const predicted = predictRaceTime(ref.distanceM, ref.durationS, d.meters);
    const paceSeconds = predicted / (d.meters / 1000);
    return { name: d.name, meters: d.meters, predicted, paceSeconds };
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          Reference workout
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto"
        >
          {workouts.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      {/* Reference info */}
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
        <span>{(ref.distanceM / 1000).toFixed(1)} km</span>
        <span>{formatDuration(ref.durationS)}</span>
        <span>{secondsToMMSS(Math.round(refPaceS))} /km</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Distance
              </th>
              <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Predicted Time
              </th>
              <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Avg Pace
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {predictions.map((p) => (
              <tr key={p.name}>
                <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100">
                  {p.name}
                </td>
                <td className="py-2.5 text-right font-mono text-gray-900 dark:text-gray-100">
                  {formatDuration(Math.round(p.predicted))}
                </td>
                <td className="py-2.5 text-right font-mono text-gray-500 dark:text-gray-400">
                  {secondsToMMSS(Math.round(p.paceSeconds))} /km
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Predictions use the Riegel formula (T2 = T1 × (D2/D1)^1.06).
      </p>
    </div>
  );
}

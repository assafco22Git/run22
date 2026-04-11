"use client";

import { useState } from "react";
import { predictRaceTime, RACE_DISTANCES } from "@/lib/predictor";
import { secondsToMMSS, formatDuration } from "@/lib/pace";

interface Race {
  id: string;
  name: string;
  distance: number; // meters
  time: number; // seconds
  date: string; // ISO
}

interface RacePredictorProps {
  races: Race[];
}

export function RacePredictor({ races }: RacePredictorProps) {
  const [selectedRaceId, setSelectedRaceId] = useState<string>(
    races[0]?.id ?? ""
  );

  if (races.length === 0) {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500">
        Log at least one race to use the predictor.
      </div>
    );
  }

  const refRace = races.find((r) => r.id === selectedRaceId) ?? races[0]!;

  const predictions = RACE_DISTANCES.map((d) => {
    const predicted = predictRaceTime(refRace.distance, refRace.time, d.meters);
    const paceSeconds = predicted / (d.meters / 1000);
    return {
      name: d.name,
      meters: d.meters,
      predicted,
      paceSeconds,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          Reference Race
        </label>
        <select
          value={selectedRaceId}
          onChange={(e) => setSelectedRaceId(e.target.value)}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {races.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({(r.distance / 1000).toFixed(1)} km —{" "}
              {formatDuration(r.time)})
            </option>
          ))}
        </select>
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
            {predictions.map((p) => {
              const isSameDistance =
                Math.abs(p.meters - refRace.distance) < 100;
              return (
                <tr
                  key={p.name}
                  className={
                    isSameDistance
                      ? "bg-emerald-50 dark:bg-emerald-950/20"
                      : ""
                  }
                >
                  <td className="py-2.5 text-gray-900 dark:text-gray-100 font-medium">
                    {p.name}
                    {isSameDistance && (
                      <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                        (reference)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-gray-900 dark:text-gray-100 font-mono">
                    {formatDuration(Math.round(p.predicted))}
                  </td>
                  <td className="py-2.5 text-right text-gray-500 dark:text-gray-400 font-mono">
                    {secondsToMMSS(Math.round(p.paceSeconds))} /km
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Predictions use the Riegel formula (T2 = T1 × (D2/D1)^1.06).
      </p>
    </div>
  );
}

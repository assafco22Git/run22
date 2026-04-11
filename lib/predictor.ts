/**
 * Race time predictor using Riegel formula:
 * T2 = T1 × (D2 / D1) ^ 1.06
 */

/**
 * Predict race time for a target distance based on a known result.
 * @param knownDistanceM - distance in meters of the reference race
 * @param knownTimeSeconds - finish time in seconds of the reference race
 * @param targetDistanceM - distance in meters to predict
 * @returns predicted time in seconds
 */
export function predictRaceTime(
  knownDistanceM: number,
  knownTimeSeconds: number,
  targetDistanceM: number
): number {
  if (knownDistanceM <= 0 || knownTimeSeconds <= 0 || targetDistanceM <= 0) {
    return 0;
  }
  return knownTimeSeconds * Math.pow(targetDistanceM / knownDistanceM, 1.06);
}

/** Standard race distances in meters */
export const RACE_DISTANCES = [
  { name: "5K", meters: 5000 },
  { name: "10K", meters: 10000 },
  { name: "Half Marathon", meters: 21097 },
  { name: "Marathon", meters: 42195 },
] as const;

export type RaceDistance = (typeof RACE_DISTANCES)[number];

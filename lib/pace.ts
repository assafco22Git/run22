/**
 * Pace and duration utility functions
 */

/** Convert "5:30" → 330 seconds */
export function paceToSeconds(pace: string): number {
  const parts = pace.split(":").map(Number);
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return (minutes ?? 0) * 60 + (seconds ?? 0);
  }
  return 0;
}

/** Convert 330 → "5:30" */
export function secondsToPace(s: number): string {
  const minutes = Math.floor(s / 60);
  const seconds = Math.round(s % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Alias for secondsToPace — returns "5:30" format */
export function secondsToMMSS(seconds: number): string {
  return secondsToPace(seconds);
}

/** Parse "5:30" → 330 seconds */
export function mmssToSeconds(pace: string): number {
  return paceToSeconds(pace);
}

/** Convert h:m:s → total seconds */
export function durationToSeconds(h: number, m: number, s: number): number {
  return h * 3600 + m * 60 + s;
}

/** Convert 3661 → "1:01:01" */
export function secondsToDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Convert 3661 → "1h 01m 01s" */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  }
  if (m > 0) {
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  }
  return `${s}s`;
}

/** Convert meters to km string e.g. "10.5" */
export function metersToKm(meters: number): string {
  return (meters / 1000).toFixed(1);
}

/** Calculate pace per km from distance (meters) and duration (seconds), returns "5:30" */
export function pacePerKm(distanceMeters: number, durationSeconds: number): string {
  if (distanceMeters <= 0) return "—";
  const distanceKm = distanceMeters / 1000;
  const secondsPerKm = durationSeconds / distanceKm;
  return secondsToPace(secondsPerKm);
}

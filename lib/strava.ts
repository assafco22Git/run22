/**
 * Strava API helpers — token refresh + activity sync
 */

import { prisma } from "@/lib/prisma";
import { secondsToPace } from "@/lib/pace";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API = "https://www.strava.com/api/v3";

// ─── Token refresh ────────────────────────────────────────────────────────────

async function refreshToken(userId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();

  await prisma.user.update({
    where: { id: userId },
    data: {
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
      stravaTokenExpiry: new Date(data.expires_at * 1000),
    },
  });

  return data.access_token as string;
}

/** Get a valid access token for the user, refreshing if needed */
export async function getValidToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stravaAccessToken: true,
      stravaRefreshToken: true,
      stravaTokenExpiry: true,
    },
  });

  if (!user?.stravaAccessToken || !user.stravaRefreshToken) return null;

  // Refresh if expiring within 5 minutes
  const expiresAt = user.stravaTokenExpiry?.getTime() ?? 0;
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    return await refreshToken(userId, user.stravaRefreshToken);
  }

  return user.stravaAccessToken;
}

// ─── Strava activity type ─────────────────────────────────────────────────────

interface StravaActivity {
  id: number;
  name: string;
  type: string;       // "Run", "Walk", etc.
  distance: number;   // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  average_speed: number; // m/s
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  start_date: string; // ISO
  start_date_local: string;
  total_elevation_gain: number;
}

// ─── Match activity to a workout ──────────────────────────────────────────────

/**
 * Try to find a pending workout for this trainee that was scheduled
 * within ±1 day of the activity start time.
 */
async function findMatchingWorkout(
  traineeId: string,
  activityDate: Date
): Promise<string | null> {
  const windowStart = new Date(activityDate.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(activityDate.getTime() + 24 * 60 * 60 * 1000);

  const workout = await prisma.workout.findFirst({
    where: {
      traineeId,
      scheduledAt: { gte: windowStart, lte: windowEnd },
      // No result yet OR result has no stravaActivityId
      result: { is: null },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return workout?.id ?? null;
}

// ─── Sync activities ──────────────────────────────────────────────────────────

export interface SyncResult {
  synced: number;
  matched: number;
  errors: string[];
}

/**
 * Fetch recent Strava activities and upsert them as WorkoutResults
 * against matching scheduled workouts.
 */
export async function syncStravaActivities(
  userId: string,
  perPage = 30,
  afterEpoch?: number // only fetch activities after this unix timestamp
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, matched: 0, errors: [] };

  const token = await getValidToken(userId);
  if (!token) {
    result.errors.push("No valid Strava token");
    return result;
  }

  // Get trainee profile
  const traineeProfile = await prisma.traineeProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!traineeProfile) {
    result.errors.push("No trainee profile found");
    return result;
  }

  // Fetch activities from Strava (only runs)
  const params = new URLSearchParams({
    per_page: String(perPage),
    ...(afterEpoch ? { after: String(afterEpoch) } : {}),
  });

  const res = await fetch(`${STRAVA_API}/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    result.errors.push(`Strava API error: ${res.status}`);
    return result;
  }

  const activities: StravaActivity[] = await res.json();
  const runs = activities.filter((a) => a.type === "Run" && a.distance > 0);

  for (const act of runs) {
    try {
      const stravaActivityId = String(act.id);
      const activityDate = new Date(act.start_date);

      // Skip if already synced
      const existing = await prisma.workoutResult.findUnique({
        where: { stravaActivityId },
      });
      if (existing) continue;

      // Pace: moving_time / distance_km = seconds per km
      const paceSecPerKm = act.distance > 0
        ? act.moving_time / (act.distance / 1000)
        : 0;
      const avgPace = paceSecPerKm > 0 ? secondsToPace(paceSecPerKm) : null;

      // Try to match to a scheduled workout
      const workoutId = await findMatchingWorkout(traineeProfile.id, activityDate);

      if (workoutId) {
        // Create result linked to workout
        await prisma.workoutResult.create({
          data: {
            workoutId,
            traineeId: traineeProfile.id,
            loggedAt: activityDate,
            totalDistance: act.distance,
            totalDuration: act.moving_time,
            avgPace,
            avgHeartRate: act.average_heartrate ? Math.round(act.average_heartrate) : null,
            maxHeartRate: act.max_heartrate ? Math.round(act.max_heartrate) : null,
            notes: `Auto-synced from Strava: ${act.name}`,
            stravaActivityId,
            stravaData: JSON.stringify(act),
          },
        });

        // Mark the workout as completed
        await prisma.workout.update({
          where: { id: workoutId },
          data: { status: "COMPLETED" },
        });

        result.matched++;
      }

      result.synced++;
    } catch (e) {
      result.errors.push(`Activity ${act.id}: ${String(e)}`);
    }
  }

  return result;
}

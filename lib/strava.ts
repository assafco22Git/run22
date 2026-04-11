import { prisma } from "@/lib/prisma";

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;        // meters
  moving_time: number;     // seconds
  elapsed_time: number;    // seconds
  average_speed: number;   // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  start_date: string;      // ISO string
  type: string;
}

/** Build the Strava OAuth authorization URL */
export function getStravaAuthUrl(): string {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("Strava env vars not configured");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/** Exchange an authorization code for tokens */
export async function exchangeStravaCode(code: string): Promise<StravaTokens> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Strava env vars not configured");
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token exchange failed: ${text}`);
  }

  return res.json() as Promise<StravaTokens>;
}

/** Refresh an expired Strava access token and return a valid access token (or null on failure) */
export async function refreshStravaToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stravaAccessToken: true,
      stravaRefreshToken: true,
      stravaTokenExpiry: true,
    },
  });

  if (!user?.stravaRefreshToken || !user.stravaAccessToken) return null;

  const now = new Date();
  const expiry = user.stravaTokenExpiry;
  // Return existing token if still valid with 60s buffer
  if (expiry && expiry.getTime() - now.getTime() > 60_000) {
    return user.stravaAccessToken;
  }

  return _refreshStravaTokenInternal(userId, user.stravaRefreshToken);
}

/** Internal helper: actually calls Strava refresh endpoint */
async function _refreshStravaTokenInternal(
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Strava env vars not configured");
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("[strava] Token refresh failed:", res.status);
    return null;
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };

  // Persist updated tokens
  await prisma.user.update({
    where: { id: userId },
    data: {
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
      stravaTokenExpiry: new Date(data.expires_at * 1000),
    },
  });

  return data.access_token;
}

/** Get a valid (non-expired) Strava access token for a user. Returns null if not connected or refresh fails. */
export async function getValidStravaToken(userId: string): Promise<string | null> {
  return refreshStravaToken(userId);
}

/** Fetch Strava activities for a given time range (unix timestamps) */
export async function fetchStravaActivities(
  token: string,
  afterTimestamp: number,
  beforeTimestamp: number
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    after: String(afterTimestamp),
    before: String(beforeTimestamp),
    per_page: "100",
  });

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.error("[strava] fetchStravaActivities failed:", res.status);
    return [];
  }

  return res.json() as Promise<StravaActivity[]>;
}

/**
 * Convert a StravaActivity to WorkoutResult fields.
 * - distance: meters → km
 * - avgPace: m/s average_speed → "mm:ss" per km
 * - stravaData: full raw JSON stringified
 */
export function mapStravaActivityToResult(activity: StravaActivity): {
  totalDistance: number;
  totalDuration: number;
  avgPace: string;
  avgHeartRate?: number;
  maxHeartRate?: number;
  stravaActivityId: string;
  stravaData: string;
} {
  const distanceKm = activity.distance / 1000;

  let avgPace = "0:00";
  if (activity.average_speed > 0) {
    const secsPerKm = 1000 / activity.average_speed;
    const paceMin = Math.floor(secsPerKm / 60);
    const paceSec = Math.round(secsPerKm % 60);
    avgPace = `${paceMin}:${String(paceSec).padStart(2, "0")}`;
  }

  return {
    totalDistance: Math.round(distanceKm * 100) / 100,
    totalDuration: activity.moving_time,
    avgPace,
    avgHeartRate:
      activity.average_heartrate != null
        ? Math.round(activity.average_heartrate)
        : undefined,
    maxHeartRate:
      activity.max_heartrate != null
        ? Math.round(activity.max_heartrate)
        : undefined,
    stravaActivityId: String(activity.id),
    stravaData: JSON.stringify(activity),
  };
}

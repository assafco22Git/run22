import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  getValidStravaToken,
  fetchStravaActivities,
  type StravaActivity,
} from "@/lib/strava";
import type { Role } from "@/types";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user.role as Role) !== "TRAINEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { workoutId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { workoutId } = body;

  if (!workoutId) {
    return NextResponse.json({ error: "workoutId is required" }, { status: 400 });
  }

  // Verify the workout belongs to this trainee
  const traineeProfile = await prisma.traineeProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!traineeProfile) {
    return NextResponse.json({ error: "Trainee profile not found" }, { status: 404 });
  }

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { id: true, traineeId: true, scheduledAt: true },
  });

  if (!workout || workout.traineeId !== traineeProfile.id) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  // Get Strava token
  const token = await getValidStravaToken(session.user.id);

  if (!token) {
    return NextResponse.json(
      { error: "Strava is not connected or token is invalid" },
      { status: 400 }
    );
  }

  // Fetch activities ±12 hours around the workout's scheduled date
  const scheduledMs = new Date(workout.scheduledAt).getTime();
  const afterTimestamp = Math.floor((scheduledMs - TWELVE_HOURS_MS) / 1000);
  const beforeTimestamp = Math.floor((scheduledMs + TWELVE_HOURS_MS) / 1000);

  let activities: StravaActivity[] = [];
  try {
    activities = await fetchStravaActivities(token, afterTimestamp, beforeTimestamp);
  } catch (err) {
    console.error("[strava/sync] fetchStravaActivities error:", err);
    return NextResponse.json({ activity: null });
  }

  if (activities.length === 0) {
    return NextResponse.json({ activity: null });
  }

  // Find the activity closest to the scheduled time by start_date
  const scheduledDate = new Date(workout.scheduledAt);
  let bestMatch: StravaActivity | null = null;
  let bestDiff = Infinity;

  for (const a of activities) {
    const actDate = new Date(a.start_date);
    const diff = Math.abs(actDate.getTime() - scheduledDate.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestMatch = a;
    }
  }

  return NextResponse.json({ activity: bestMatch });
}

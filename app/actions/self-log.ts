"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { pacePerKm } from "@/lib/pace";
import type { Role } from "@/types";

const schema = z.object({
  title:          z.string().min(1, "Title is required").max(120),
  runDate:        z.string().min(1, "Date is required"),       // "YYYY-MM-DD"
  distanceKm:     z.number().positive("Distance must be positive").optional(),
  durationSecs:   z.number().int().positive("Duration must be positive").optional(),
  avgHeartRate:   z.number().int().min(30).max(250).optional(),
  maxHeartRate:   z.number().int().min(30).max(300).optional(),
  perceivedEffort:z.number().int().min(1).max(10).optional(),
  rating:         z.number().int().min(1).max(5).optional(),
  notes:          z.string().max(2000).optional(),
});

export type SelfLogInput = z.infer<typeof schema>;

export async function logSelfRun(
  data: SelfLogInput
): Promise<{ success: boolean; workoutId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user.role as Role) !== "TRAINEE")
    return { success: false, error: "Unauthorized" };

  const parsed = schema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { title, runDate, distanceKm, durationSecs, avgHeartRate, maxHeartRate,
          perceivedEffort, rating, notes } = parsed.data;

  const traineeProfile = await prisma.traineeProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!traineeProfile) return { success: false, error: "Trainee profile not found" };

  // Derive pace if both distance and duration are available
  const avgPace =
    distanceKm && durationSecs
      ? pacePerKm(distanceKm * 1000, durationSecs)
      : undefined;

  try {
    // Create a self-owned workout (no trainerId) already COMPLETED
    const workout = await prisma.workout.create({
      data: {
        title,
        scheduledAt: new Date(`${runDate}T12:00:00`),
        status: "COMPLETED",
        traineeId: traineeProfile.id,
        // trainerId intentionally omitted (nullable)
      },
    });

    // Log the result immediately
    await prisma.workoutResult.create({
      data: {
        workoutId: workout.id,
        traineeId: traineeProfile.id,
        totalDistance: distanceKm ?? null,
        totalDuration: durationSecs ?? null,
        avgPace:        avgPace ?? null,
        avgHeartRate:   avgHeartRate ?? null,
        maxHeartRate:   maxHeartRate ?? null,
        perceivedEffort:perceivedEffort ?? null,
        rating:         rating ?? null,
        notes:          notes ?? null,
      },
    });

    return { success: true, workoutId: workout.id };
  } catch (e) {
    console.error("logSelfRun error:", e);
    return { success: false, error: "Failed to save run. Please try again." };
  }
}

"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notifications";
import type { Role } from "@/types";

// ─── Schema ──────────────────────────────────────────────────────────────────

const segmentResultSchema = z.object({
  segmentId: z.string().min(1),
  order: z.number().int().min(0),
  distance: z.number().positive().optional(),
  duration: z.number().int().positive().optional(),
  pace: z.string().optional(),
});

const logWorkoutResultSchema = z.object({
  totalDistance: z.number().positive("Distance must be positive").optional(),
  totalDuration: z.number().int().positive("Duration must be positive").optional(),
  avgPace: z.string().optional(),
  avgHeartRate: z.number().int().min(30).max(250).optional(),
  maxHeartRate: z.number().int().min(30).max(300).optional(),
  notes: z.string().max(2000).optional(),
  perceivedEffort: z.number().int().min(1).max(10).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  segmentResults: z.array(segmentResultSchema).optional(),
});

export type LogWorkoutResultInput = z.infer<typeof logWorkoutResultSchema>;

// ─── Update result ────────────────────────────────────────────────────────────

export async function updateWorkoutResult(
  workoutId: string,
  data: LogWorkoutResultInput
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user.role as Role) !== "TRAINEE")
    return { success: false, error: "Unauthorized" };

  const parsed = logWorkoutResultSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };

  const {
    totalDistance, totalDuration, avgPace,
    avgHeartRate, maxHeartRate, notes,
    perceivedEffort, rating, segmentResults,
  } = parsed.data;

  try {
    const traineeProfile = await prisma.traineeProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!traineeProfile) return { success: false, error: "Trainee profile not found" };

    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: { id: true, traineeId: true },
    });
    if (!workout || workout.traineeId !== traineeProfile.id)
      return { success: false, error: "Workout not found" };

    const existing = await prisma.workoutResult.findUnique({ where: { workoutId } });
    if (!existing) return { success: false, error: "No logged result found to edit" };

    // Update result fields
    await prisma.workoutResult.update({
      where: { id: existing.id },
      data: {
        totalDistance: totalDistance ?? null,
        totalDuration: totalDuration ?? null,
        avgPace: avgPace ?? null,
        avgHeartRate: avgHeartRate ?? null,
        maxHeartRate: maxHeartRate ?? null,
        notes: notes ?? null,
        perceivedEffort: perceivedEffort ?? null,
        rating: rating ?? null,
      },
    });

    // Replace segment results: delete old ones, recreate one-by-one
    await prisma.workoutSegmentResult.deleteMany({ where: { resultId: existing.id } });
    if (segmentResults && segmentResults.length > 0) {
      for (const sr of segmentResults) {
        await prisma.workoutSegmentResult.create({
          data: {
            resultId: existing.id,
            segmentId: sr.segmentId,
            order: sr.order,
            distance: sr.distance ?? null,
            duration: sr.duration ?? null,
            pace: sr.pace ?? null,
          },
        });
      }
    }

    return { success: true };
  } catch (e) {
    console.error("updateWorkoutResult error:", e);
    return { success: false, error: "Failed to update result. Please try again." };
  }
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function logWorkoutResult(
  workoutId: string,
  data: LogWorkoutResultInput
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user.role as Role) !== "TRAINEE") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = logWorkoutResultSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Validation error";
    return { success: false, error: firstError };
  }

  const {
    totalDistance,
    totalDuration,
    avgPace,
    avgHeartRate,
    maxHeartRate,
    notes,
    perceivedEffort,
    rating,
    segmentResults,
  } = parsed.data;

  try {
    // Get trainee profile
    const traineeProfile = await prisma.traineeProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!traineeProfile) {
      return { success: false, error: "Trainee profile not found" };
    }

    // Verify the workout belongs to this trainee and is still PENDING
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: { id: true, traineeId: true, status: true },
    });

    if (!workout || workout.traineeId !== traineeProfile.id) {
      return { success: false, error: "Workout not found" };
    }

    if (workout.status !== "PENDING") {
      return { success: false, error: "Workout has already been logged" };
    }

    // Check if result already exists
    const existing = await prisma.workoutResult.findUnique({
      where: { workoutId },
    });
    if (existing) {
      return { success: false, error: "Result already logged for this workout" };
    }

    // Create result (no transactions — Neon HTTP doesn't support them)
    const result = await prisma.workoutResult.create({
      data: {
        workoutId,
        traineeId: traineeProfile.id,
        totalDistance: totalDistance ?? null,
        totalDuration: totalDuration ?? null,
        avgPace: avgPace ?? null,
        avgHeartRate: avgHeartRate ?? null,
        maxHeartRate: maxHeartRate ?? null,
        notes: notes ?? null,
        perceivedEffort: perceivedEffort ?? null,
        rating: rating ?? null,
      },
    });

    // Create segment results one by one
    if (segmentResults && segmentResults.length > 0) {
      for (const sr of segmentResults) {
        await prisma.workoutSegmentResult.create({
          data: {
            resultId: result.id,
            segmentId: sr.segmentId,
            order: sr.order,
            distance: sr.distance ?? null,
            duration: sr.duration ?? null,
            pace: sr.pace ?? null,
          },
        });
      }
    }

    // Mark workout as completed
    const completedWorkout = await prisma.workout.update({
      where: { id: workoutId },
      data: { status: "COMPLETED" },
      select: { title: true, trainerId: true },
    });

    // Notify the trainer
    const trainerUser = await prisma.trainerProfile.findUnique({
      where: { id: completedWorkout.trainerId },
      select: { userId: true },
    });
    if (trainerUser) {
      const traineeName = session.user.name ?? "Your trainee";
      await createNotification({
        userId: trainerUser.userId,
        title: "Workout result logged",
        body: `${traineeName} logged a result for "${completedWorkout.title}"`,
        href: `/trainer/workouts/${workoutId}`,
      });
    }

    return { success: true };
  } catch (e) {
    console.error("logWorkoutResult error:", e);
    return { success: false, error: "Failed to log workout result. Please try again." };
  }
}

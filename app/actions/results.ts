"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
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
    await prisma.workout.update({
      where: { id: workoutId },
      data: { status: "COMPLETED" },
    });

    return { success: true };
  } catch (e) {
    console.error("logWorkoutResult error:", e);
    return { success: false, error: "Failed to log workout result. Please try again." };
  }
}

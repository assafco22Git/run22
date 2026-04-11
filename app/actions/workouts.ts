"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Role } from "@/types";

// ─── Zod schemas ────────────────────────────────────────────────────────────

const segmentSchema = z.object({
  distance: z.number().positive("Distance must be positive"),
  pace: z
    .string()
    .regex(/^\d+:\d{2}$/, "Pace must be in mm:ss format (e.g. 5:30)"),
  remarks: z.string().optional(),
});

const createWorkoutSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().optional(),
  traineeId: z.string().min(1, "Please select a trainee"),
  scheduledAt: z.string().min(1, "Scheduled date is required"),
  segments: z
    .array(segmentSchema)
    .min(1, "At least one segment is required"),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

// ─── Action ─────────────────────────────────────────────────────────────────

export async function createWorkout(
  data: CreateWorkoutInput
): Promise<{ success: boolean; workoutId?: string; error?: string }> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user.role as Role) !== "TRAINER") {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const parsed = createWorkoutSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    const firstError = issues[0]?.message ?? "Validation error";
    return { success: false, error: firstError };
  }

  const { title, description, traineeId, scheduledAt, segments } = parsed.data;

  // Get trainer profile
  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!trainerProfile) {
    return { success: false, error: "Trainer profile not found" };
  }

  // Verify the trainee belongs to this trainer
  const link = await prisma.trainerTrainee.findFirst({
    where: { trainerId: trainerProfile.id, traineeId },
  });

  if (!link) {
    return { success: false, error: "Trainee not found or not linked to you" };
  }

  try {
    // Create workout first (no nested creates — Neon HTTP doesn't support transactions)
    const workout = await prisma.workout.create({
      data: {
        title,
        description: description ?? null,
        // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight; pin to noon local
        scheduledAt: new Date(scheduledAt.includes("T") ? scheduledAt : `${scheduledAt}T12:00:00`),
        status: "PENDING",
        trainerId: trainerProfile.id,
        traineeId,
      },
    });

    // Create segments one-by-one
    for (let idx = 0; idx < segments.length; idx++) {
      const seg = segments[idx]!;
      await prisma.workoutSegment.create({
        data: {
          workoutId: workout.id,
          order: idx,
          distance: seg.distance,
          pace: seg.pace,
          remarks: seg.remarks ?? null,
        },
      });
    }

    return { success: true, workoutId: workout.id };
  } catch (e) {
    console.error("createWorkout error:", e);
    return { success: false, error: "Failed to create workout" };
  }
}

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

// ─── Delete workout ──────────────────────────────────────────────────────────

export async function deleteWorkout(
  workoutId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;

  if (role === "TRAINER") {
    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!trainerProfile) return { success: false, error: "Trainer profile not found" };

    const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
    if (!workout) return { success: false, error: "Workout not found" };
    if (workout.trainerId !== trainerProfile.id)
      return { success: false, error: "Not authorised to delete this workout" };
  } else if (role === "TRAINEE") {
    const traineeProfile = await prisma.traineeProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!traineeProfile) return { success: false, error: "Trainee profile not found" };

    const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
    if (!workout) return { success: false, error: "Workout not found" };
    if (workout.traineeId !== traineeProfile.id)
      return { success: false, error: "Not authorised to delete this workout" };
  } else {
    return { success: false, error: "Unauthorized" };
  }

  await prisma.workout.delete({ where: { id: workoutId } });
  return { success: true };
}

// ─── Update workout ──────────────────────────────────────────────────────────

const updateWorkoutSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().optional(),
  scheduledAt: z.string().min(1, "Scheduled date is required"),
  segments: z.array(segmentSchema).min(1, "At least one segment is required"),
});

export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

export async function updateWorkout(
  workoutId: string,
  data: UpdateWorkoutInput
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user.role as Role) !== "TRAINER")
    return { success: false, error: "Unauthorized" };

  const parsed = updateWorkoutSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { title, description, scheduledAt, segments } = parsed.data;

  try {
    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!trainerProfile) return { success: false, error: "Trainer profile not found" };

    const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
    if (!workout) return { success: false, error: "Workout not found" };
    if (workout.trainerId !== trainerProfile.id)
      return { success: false, error: "Not authorised to edit this workout" };

    // Update workout header
    await prisma.workout.update({
      where: { id: workoutId },
      data: {
        title,
        description: description ?? null,
        scheduledAt: new Date(scheduledAt.includes("T") ? scheduledAt : `${scheduledAt}T12:00:00`),
      },
    });

    // Delete old segments, recreate — Neon HTTP: delete many then create one-by-one
    await prisma.workoutSegment.deleteMany({ where: { workoutId } });
    for (let idx = 0; idx < segments.length; idx++) {
      const seg = segments[idx]!;
      await prisma.workoutSegment.create({
        data: {
          workoutId,
          order: idx + 1,
          distance: seg.distance,
          pace: seg.pace,
          remarks: seg.remarks ?? null,
        },
      });
    }

    return { success: true };
  } catch (e) {
    console.error("updateWorkout error:", e);
    return { success: false, error: "Failed to update workout" };
  }
}

// ─── Create workout ──────────────────────────────────────────────────────────

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

    // Create segments one-by-one (1-based order)
    for (let idx = 0; idx < segments.length; idx++) {
      const seg = segments[idx]!;
      await prisma.workoutSegment.create({
        data: {
          workoutId: workout.id,
          order: idx + 1,
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

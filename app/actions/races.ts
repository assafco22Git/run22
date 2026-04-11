"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Role } from "@/types";

// ─── Schema ──────────────────────────────────────────────────────────────────

const createRaceSchema = z.object({
  name: z.string().min(1, "Race name is required").max(120),
  distance: z.number().positive("Distance must be positive"),
  // totalSeconds
  time: z.number().int().positive("Time must be positive"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().max(2000).optional(),
});

export type CreateRaceInput = z.infer<typeof createRaceSchema>;

// ─── Action ──────────────────────────────────────────────────────────────────

export async function createRace(
  data: CreateRaceInput
): Promise<{ success: boolean; raceId?: string; error?: string }> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user.role as Role) !== "TRAINEE") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = createRaceSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Validation error";
    return { success: false, error: firstError };
  }

  const { name, distance, time, date, notes } = parsed.data;

  // Get trainee profile
  const traineeProfile = await prisma.traineeProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!traineeProfile) {
    return { success: false, error: "Trainee profile not found" };
  }

  try {
    const race = await prisma.race.create({
      data: {
        traineeId: traineeProfile.id,
        name,
        distance,
        time,
        date: new Date(date),
        notes: notes ?? null,
      },
    });

    return { success: true, raceId: race.id };
  } catch {
    return { success: false, error: "Failed to create race" };
  }
}

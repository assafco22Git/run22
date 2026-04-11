"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Role } from "@/types";

export async function addTrainee(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user.role as Role) !== "TRAINER") {
    return { success: false, error: "Unauthorized" };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { success: false, error: "Please enter a valid email address" };
  }

  // Find user by email
  const targetUser = await prisma.user.findUnique({
    where: { email: trimmedEmail },
    include: { traineeProfile: true },
  });

  if (!targetUser) {
    return {
      success: false,
      error: "No account found with that email address",
    };
  }

  // Ensure the user has TRAINEE role
  if ((targetUser.role as Role) !== "TRAINEE") {
    return {
      success: false,
      error: "That account is not registered as a trainee",
    };
  }

  // Get or create the trainer profile
  let trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!trainerProfile) {
    trainerProfile = await prisma.trainerProfile.create({
      data: { userId: session.user.id },
    });
  }

  // Create trainee profile if missing
  let traineeProfile = targetUser.traineeProfile;
  if (!traineeProfile) {
    traineeProfile = await prisma.traineeProfile.create({
      data: { userId: targetUser.id },
    });
  }

  // Check if already linked
  const existingLink = await prisma.trainerTrainee.findFirst({
    where: {
      trainerId: trainerProfile.id,
      traineeId: traineeProfile.id,
    },
  });

  if (existingLink) {
    return { success: false, error: "This trainee is already linked to your account" };
  }

  // Create the TrainerTrainee link
  try {
    await prisma.trainerTrainee.create({
      data: {
        trainerId: trainerProfile.id,
        traineeId: traineeProfile.id,
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to add trainee. Please try again." };
  }
}

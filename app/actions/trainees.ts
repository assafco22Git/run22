"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

export async function removeTrainee(
  traineeId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user.role as Role) !== "TRAINER")
    return { success: false, error: "Unauthorized" };

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!trainerProfile) return { success: false, error: "Trainer profile not found" };

  const link = await prisma.trainerTrainee.findFirst({
    where: { trainerId: trainerProfile.id, traineeId },
  });
  if (!link) return { success: false, error: "Trainee not linked to your account" };

  await prisma.trainerTrainee.delete({ where: { id: link.id } });
  revalidatePath("/trainer/trainees");
  return { success: true };
}

export async function updateTraineeDetails(
  traineeId: string,
  data: { name: string; dob?: string; gender?: string }
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user.role as Role) !== "TRAINER")
    return { success: false, error: "Unauthorized" };

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!trainerProfile) return { success: false, error: "Trainer profile not found" };

  const link = await prisma.trainerTrainee.findFirst({
    where: { trainerId: trainerProfile.id, traineeId },
  });
  if (!link) return { success: false, error: "Trainee not linked to your account" };

  const traineeProfile = await prisma.traineeProfile.findUnique({
    where: { id: traineeId },
  });
  if (!traineeProfile) return { success: false, error: "Trainee profile not found" };

  const name = data.name.trim();
  if (!name) return { success: false, error: "Name is required" };

  await prisma.user.update({
    where: { id: traineeProfile.userId },
    data: { name },
  });

  await prisma.traineeProfile.update({
    where: { id: traineeId },
    data: {
      dob: data.dob ? new Date(data.dob) : null,
      gender: data.gender || null,
    },
  });

  revalidatePath(`/trainer/trainees/${traineeId}`);
  revalidatePath("/trainer/trainees");
  return { success: true };
}

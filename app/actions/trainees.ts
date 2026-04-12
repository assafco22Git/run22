"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { Role } from "@/types";

// ─── Helper: verify caller is a trainer and return their profile ─────────────

async function requireTrainerProfile() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user.role as Role) !== "TRAINER") return null;

  return prisma.trainerProfile.findUnique({ where: { userId: session.user.id } });
}

// ─── Link an existing trainee account ───────────────────────────────────────

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

// ─── Create a brand-new trainee account and link it ─────────────────────────

export async function createTrainee(data: {
  name: string;
  email: string;
  password: string;
  username: string;
}): Promise<{ success: boolean; error?: string }> {
  const trainerProfile = await requireTrainerProfile();
  if (!trainerProfile) return { success: false, error: "Unauthorized" };

  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  const password = data.password;
  const username = data.username.trim().toLowerCase();

  if (!name) return { success: false, error: "Name is required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { success: false, error: "Invalid email address" };
  if (password.length < 6)
    return { success: false, error: "Password must be at least 6 characters" };
  if (!/^[a-z0-9_.]{3,30}$/.test(username))
    return { success: false, error: "Username must be 3–30 chars: letters, numbers, _ and . only" };

  // Check email not already in use
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { success: false, error: "An account with that email already exists" };

  // Check username not already in use
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) return { success: false, error: "That username is already taken" };

  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "TRAINEE", username },
  });

  // Create trainee profile
  const traineeProfile = await prisma.traineeProfile.create({
    data: { userId: user.id },
  });

  // Link to trainer
  await prisma.trainerTrainee.create({
    data: { trainerId: trainerProfile.id, traineeId: traineeProfile.id },
  });

  revalidatePath("/trainer/trainees");
  return { success: true };
}

// ─── Remove trainee link ─────────────────────────────────────────────────────

export async function removeTrainee(
  traineeId: string
): Promise<{ success: boolean; error?: string }> {
  const trainerProfile = await requireTrainerProfile();
  if (!trainerProfile) return { success: false, error: "Unauthorized" };

  const link = await prisma.trainerTrainee.findFirst({
    where: { trainerId: trainerProfile.id, traineeId },
  });
  if (!link) return { success: false, error: "Trainee not linked to your account" };

  await prisma.trainerTrainee.delete({ where: { id: link.id } });
  revalidatePath("/trainer/trainees");
  return { success: true };
}

// ─── Update trainee profile details (name, dob, gender, email, password) ────

export async function updateTraineeDetails(
  traineeId: string,
  data: {
    name: string;
    dob?: string;
    gender?: string;
    username?: string;
    newPassword?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const trainerProfile = await requireTrainerProfile();
  if (!trainerProfile) return { success: false, error: "Unauthorized" };

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

  // Validate new username if provided
  if (data.username) {
    const newUsername = data.username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,30}$/.test(newUsername))
      return { success: false, error: "Username must be 3–30 chars: letters, numbers, _ and . only" };

    // Check not taken by another user
    const conflict = await prisma.user.findUnique({ where: { username: newUsername } });
    if (conflict && conflict.id !== traineeProfile.userId)
      return { success: false, error: "That username is already taken" };
  }

  // Validate new password if provided
  if (data.newPassword && data.newPassword.length < 6)
    return { success: false, error: "Password must be at least 6 characters" };

  // Build user update payload
  const userUpdate: { name: string; username?: string; passwordHash?: string } = { name };
  if (data.username) userUpdate.username = data.username.trim().toLowerCase();
  if (data.newPassword) userUpdate.passwordHash = await bcrypt.hash(data.newPassword, 12);

  await prisma.user.update({
    where: { id: traineeProfile.userId },
    data: userUpdate,
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

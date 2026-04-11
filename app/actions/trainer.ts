"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Role } from "@/types";

export async function updateTrainerBio(
  bio: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user.role as Role) !== "TRAINER") {
    return { success: false, error: "Unauthorized" };
  }

  const trimmedBio = bio.trim();

  if (trimmedBio.length > 1000) {
    return { success: false, error: "Bio must be 1000 characters or fewer" };
  }

  try {
    await prisma.trainerProfile.upsert({
      where: { userId: session.user.id },
      update: { bio: trimmedBio || null },
      create: { userId: session.user.id, bio: trimmedBio || null },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update bio. Please try again." };
  }
}

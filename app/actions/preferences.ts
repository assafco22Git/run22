"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export interface DayPref {
  day: number;      // 0=Sun … 6=Sat
  enabled: boolean;
  time: "any" | "morning" | "afternoon" | "evening";
}

export interface PreferencePayload {
  days: DayPref[];
  notes: string;
}

export async function savePreferences(
  payload: PreferencePayload
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const trainee = await prisma.traineeProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!trainee) return { success: false, error: "No trainee profile found" };

  await prisma.traineePreference.upsert({
    where: { traineeId: trainee.id },
    create: {
      traineeId: trainee.id,
      days: JSON.stringify(payload.days),
      notes: payload.notes || null,
    },
    update: {
      days: JSON.stringify(payload.days),
      notes: payload.notes || null,
    },
  });

  revalidatePath("/plan");
  return { success: true };
}

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

const nameSchema = z.string().min(1, "Name is required").max(80).trim();

export async function updateName(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const raw = formData.get("name");
  const parsed = nameSchema.safeParse(raw);
  if (!parsed.success) return; // silently ignore — client validates first

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data },
  });

  revalidatePath("/settings");
  revalidatePath("/trainer/settings");
}

export async function updateTrainerCredentials(data: {
  name: string;
  email?: string;
  username?: string;
  newPassword?: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const name = data.name.trim();
  if (!name) return { success: false, error: "Name is required" };

  if (data.email) {
    const email = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return { success: false, error: "Invalid email address" };
    const conflict = await prisma.user.findUnique({ where: { email } });
    if (conflict && conflict.id !== session.user.id)
      return { success: false, error: "That email address is already in use" };
  }

  if (data.username) {
    const username = data.username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,30}$/.test(username))
      return { success: false, error: "Username must be 3–30 chars: letters, numbers, _ and . only" };
    const conflict = await prisma.user.findUnique({ where: { username } });
    if (conflict && conflict.id !== session.user.id)
      return { success: false, error: "That username is already taken" };
  }

  if (data.newPassword && data.newPassword.length < 6)
    return { success: false, error: "Password must be at least 6 characters" };

  const update: Record<string, string> = { name };
  if (data.email) update.email = data.email.trim().toLowerCase();
  if (data.username) update.username = data.username.trim().toLowerCase();
  if (data.newPassword) update.passwordHash = await bcrypt.hash(data.newPassword, 12);

  await prisma.user.update({ where: { id: session.user.id }, data: update });

  revalidatePath("/trainer/settings");
  return { success: true };
}

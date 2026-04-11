"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

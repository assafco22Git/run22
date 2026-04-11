import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/types";

export async function requireTrainer() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user.role as Role) !== "TRAINER") {
    redirect("/403");
  }

  return session;
}

export async function requireTrainee() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user.role as Role) !== "TRAINEE") {
    redirect("/403");
  }

  return session;
}

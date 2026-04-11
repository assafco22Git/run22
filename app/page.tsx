import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/types";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role as Role;

  if (role === "TRAINER") {
    redirect("/trainer/dashboard");
  }

  redirect("/calendar");
}

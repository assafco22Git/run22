import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user.role as Role) !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      trainees: {
        include: {
          trainee: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!trainerProfile) {
    return NextResponse.json({ trainees: [] });
  }

  const trainees = trainerProfile.trainees.map(({ trainee }) => ({
    id: trainee.id,
    name: trainee.user.name,
  }));

  return NextResponse.json({ trainees });
}

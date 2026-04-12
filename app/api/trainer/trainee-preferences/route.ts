import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const traineeId = searchParams.get("traineeId");
  if (!traineeId) return NextResponse.json({ days: [], notes: null });

  // Verify this trainer owns the trainee
  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!trainerProfile) return NextResponse.json({ days: [], notes: null });

  const link = await prisma.trainerTrainee.findFirst({
    where: { trainerId: trainerProfile.id, traineeId },
  });
  if (!link) return NextResponse.json({ days: [], notes: null });

  const pref = await prisma.traineePreference.findUnique({
    where: { traineeId },
  });

  return NextResponse.json({
    days: pref ? JSON.parse(pref.days) : [],
    notes: pref?.notes ?? null,
  });
}

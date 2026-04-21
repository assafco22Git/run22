import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types";
import type { ParsedWorkout } from "@/app/api/trainer/parse-workouts/route";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user.role as Role) !== "TRAINER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { traineeId, workouts } = (await req.json()) as {
    traineeId: string;
    workouts: ParsedWorkout[];
  };

  if (!traineeId || !Array.isArray(workouts) || workouts.length === 0)
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  // Verify trainer owns this trainee
  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!trainerProfile) return NextResponse.json({ error: "Trainer profile not found" }, { status: 403 });

  const link = await prisma.trainerTrainee.findFirst({
    where: { trainerId: trainerProfile.id, traineeId },
  });
  if (!link) return NextResponse.json({ error: "Trainee not linked to your account" }, { status: 403 });

  // Get trainee user for notification
  const traineeProfile = await prisma.traineeProfile.findUnique({
    where: { id: traineeId },
    select: { userId: true },
  });

  let created = 0;
  for (const w of workouts) {
    if (!w.title || !w.scheduledAt) continue;

    const workout = await prisma.workout.create({
      data: {
        title: w.title,
        description: w.description ?? null,
        scheduledAt: new Date(w.scheduledAt + "T12:00:00Z"),
        status: "PENDING",
        trainerId: trainerProfile.id,
        traineeId,
      },
    });

    // Create segments
    if (w.segments && w.segments.length > 0) {
      for (const seg of w.segments) {
        await prisma.workoutSegment.create({
          data: {
            workoutId: workout.id,
            order: seg.order,
            distance: seg.distance ?? null,
            pace: seg.pace ?? null,
            remarks: seg.remarks ?? null,
          },
        });
      }
    }

    created++;
  }

  // Single notification for the batch
  if (traineeProfile && created > 0) {
    await createNotification({
      userId: traineeProfile.userId,
      title: `${created} new workout${created !== 1 ? "s" : ""} scheduled`,
      body: `Your trainer added ${created} workout${created !== 1 ? "s" : ""} to your plan.`,
      href: "/calendar",
    });
  }

  return NextResponse.json({ created });
}

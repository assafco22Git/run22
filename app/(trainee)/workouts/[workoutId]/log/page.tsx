import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { LogWorkoutForm } from "@/components/workout/LogWorkoutForm";

interface LogWorkoutPageProps {
  params: Promise<{ workoutId: string }>;
}

export default async function LogWorkoutPage({ params }: LogWorkoutPageProps) {
  const session = await requireTrainee();
  const { workoutId } = await params;

  const traineeProfile = await prisma.traineeProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!traineeProfile) notFound();

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      segments: { orderBy: { order: "asc" } },
    },
  });

  if (!workout || workout.traineeId !== traineeProfile.id) notFound();

  // If already completed, redirect back to detail
  if (workout.status !== "PENDING") {
    redirect(`/workouts/${workoutId}`);
  }

  const segments = workout.segments.map((s) => ({
    id: s.id,
    order: s.order,
    distance: s.distance,
    pace: s.pace,
    remarks: s.remarks,
  }));

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <a
          href={`/workouts/${workoutId}`}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-1 inline-block"
        >
          ← Back to workout
        </a>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Log Workout
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {workout.title} ·{" "}
          {workout.scheduledAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      <LogWorkoutForm workoutId={workoutId} segments={segments} />
    </div>
  );
}

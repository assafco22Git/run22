import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTrainer } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { EditWorkoutForm } from "@/components/trainer/EditWorkoutForm";

interface PageProps {
  params: Promise<{ workoutId: string }>;
}

export default async function EditWorkoutPage({ params }: PageProps) {
  const { workoutId } = await params;
  const session = await requireTrainer();

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!trainerProfile) notFound();

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { segments: { orderBy: { order: "asc" } }, trainee: { include: { user: true } } },
  });

  if (!workout || workout.trainerId !== trainerProfile.id) notFound();

  // Format date as YYYY-MM-DD for the date input
  const scheduledAt = workout.scheduledAt.toISOString().slice(0, 10);

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      <Link
        href={`/trainer/workouts/${workoutId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to workout
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Workout</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {workout.trainee.user.name}
        </p>
      </div>

      <EditWorkoutForm
        workoutId={workoutId}
        traineeId={workout.traineeId}
        initialTitle={workout.title}
        initialDescription={workout.description ?? ""}
        initialScheduledAt={scheduledAt}
        initialSegments={workout.segments.map(s => ({
          distance: s.distance,
          pace: s.pace,
          remarks: s.remarks,
        }))}
      />
    </div>
  );
}

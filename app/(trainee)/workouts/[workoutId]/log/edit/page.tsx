import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { LogWorkoutForm } from "@/components/workout/LogWorkoutForm";
import { secondsToMMSS } from "@/lib/pace";

interface EditLogPageProps {
  params: Promise<{ workoutId: string }>;
}

export default async function EditLogPage({ params }: EditLogPageProps) {
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
      result: { include: { segmentResults: { orderBy: { order: "asc" } } } },
    },
  });

  if (!workout || workout.traineeId !== traineeProfile.id) notFound();
  if (!workout.result) redirect(`/workouts/${workoutId}/log`);

  const result = workout.result;

  // Convert stored values back to form-friendly formats
  const totalDistanceKm = result.totalDistance
    ? (result.totalDistance / 1000).toFixed(2)
    : "";
  const totalMinutes = result.totalDuration
    ? String(Math.floor(result.totalDuration / 60))
    : "0";
  const totalSecs = result.totalDuration
    ? String(result.totalDuration % 60)
    : "0";

  const segmentResults = result.segmentResults.map((sr) => ({
    segmentId: sr.segmentId,
    distanceKm: sr.distance != null ? (sr.distance / 1000).toFixed(2) : "",
    timeMMSS: sr.duration != null ? secondsToMMSS(sr.duration) : "",
  }));

  const segments = workout.segments.map((s) => ({
    id: s.id,
    order: s.order,
    distance: s.distance,
    pace: s.pace,
    remarks: s.remarks,
  }));

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <a
          href={`/workouts/${workoutId}`}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-1 inline-block"
        >
          ← Back to workout
        </a>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Log</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {workout.title} ·{" "}
          {workout.scheduledAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      <LogWorkoutForm
        workoutId={workoutId}
        segments={segments}
        mode="edit"
        initial={{
          totalDistanceKm,
          totalMinutes,
          totalSecs,
          avgHr: result.avgHeartRate != null ? String(result.avgHeartRate) : "",
          maxHr: result.maxHeartRate != null ? String(result.maxHeartRate) : "",
          effort: result.perceivedEffort,
          rating: result.rating,
          notes: result.notes ?? "",
          segmentResults,
        }}
      />
    </div>
  );
}

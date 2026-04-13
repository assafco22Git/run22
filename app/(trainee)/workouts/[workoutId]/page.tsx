import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDuration, secondsToMMSS } from "@/lib/pace";
import type { WorkoutStatus } from "@/types";
import { DeleteWorkoutButton } from "@/components/DeleteWorkoutButton";
import { Pencil } from "lucide-react";

interface WorkoutDetailPageProps {
  params: Promise<{ workoutId: string }>;
}

function statusBadge(status: WorkoutStatus) {
  if (status === "COMPLETED")
    return <Badge variant="success">Completed</Badge>;
  if (status === "SKIPPED") return <Badge variant="default">Skipped</Badge>;
  return <Badge variant="warning">Pending</Badge>;
}

export default async function WorkoutDetailPage({
  params,
}: WorkoutDetailPageProps) {
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
      result: {
        include: { segmentResults: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!workout || workout.traineeId !== traineeProfile.id) notFound();

  const status = workout.status as WorkoutStatus;
  const result = workout.result;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/calendar"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-1 inline-block"
          >
            ← Back to calendar
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {workout.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {workout.scheduledAt.toLocaleDateString("en-GB", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="shrink-0 mt-1 flex items-center gap-2">
          {statusBadge(status)}
          <DeleteWorkoutButton workoutId={workoutId} redirectTo="/calendar" />
        </div>
      </div>

      {/* Description */}
      {workout.description && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {workout.description}
          </p>
        </div>
      )}

      {/* Segments */}
      {workout.segments.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Workout Segments
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    #
                  </th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Distance
                  </th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Target Pace
                  </th>
                  <th className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-gray-400 pl-4">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {workout.segments.map((seg, idx) => (
                  <tr key={seg.id}>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 text-right text-gray-900 dark:text-gray-100">
                      {seg.distance.toFixed(2)} km
                    </td>
                    <td className="py-2.5 text-right text-gray-900 dark:text-gray-100 font-mono">
                      {seg.pace} /km
                    </td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400 pl-4">
                      {seg.remarks ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result or Log CTA */}
      {status === "PENDING" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 mb-4 flex flex-col items-center gap-3 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Ready to log your workout?
          </p>
          <Link
            href={`/workouts/${workoutId}/log`}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            Log This Workout
          </Link>
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Logged Result
            </h2>
            <Link
              href={`/workouts/${workoutId}/log/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit result
            </Link>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              {
                label: "Distance",
                value: result.totalDistance
                  ? (result.totalDistance / 1000).toFixed(2) + " km"
                  : "—",
              },
              {
                label: "Duration",
                value: result.totalDuration
                  ? formatDuration(result.totalDuration)
                  : "—",
              },
              {
                label: "Avg Pace",
                value: result.avgPace ? result.avgPace + " /km" : "—",
              },
              {
                label: "Avg HR",
                value: result.avgHeartRate
                  ? result.avgHeartRate + " bpm"
                  : "—",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {s.label}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Max HR</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                {result.maxHeartRate ? result.maxHeartRate + " bpm" : "—"}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Perceived Effort
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                {result.perceivedEffort != null
                  ? `${result.perceivedEffort}/10`
                  : "—"}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Rating</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                {result.rating != null
                  ? "★".repeat(result.rating) + "☆".repeat(5 - result.rating)
                  : "—"}
              </p>
            </div>
          </div>

          {/* Notes */}
          {result.notes && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Notes
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {result.notes}
              </p>
            </div>
          )}

          {/* Segment results vs targets */}
          {result.segmentResults.length > 0 && workout.segments.length > 0 && (
            <>
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                Segment Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        #
                      </th>
                      <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Target dist
                      </th>
                      <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Actual dist
                      </th>
                      <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Target pace
                      </th>
                      <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Actual pace
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {result.segmentResults.map((sr, idx) => {
                      const targetSeg = workout.segments.find(
                        (s) => s.id === sr.segmentId
                      );
                      return (
                        <tr key={sr.id}>
                          <td className="py-2.5 text-gray-500 dark:text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 text-right text-gray-500 dark:text-gray-400">
                            {targetSeg
                              ? targetSeg.distance.toFixed(2) + " km"
                              : "—"}
                          </td>
                          <td className="py-2.5 text-right text-gray-900 dark:text-gray-100">
                            {sr.distance
                              ? (sr.distance / 1000).toFixed(2) + " km"
                              : "—"}
                          </td>
                          <td className="py-2.5 text-right text-gray-500 dark:text-gray-400 font-mono">
                            {targetSeg ? targetSeg.pace + " /km" : "—"}
                          </td>
                          <td className="py-2.5 text-right text-gray-900 dark:text-gray-100 font-mono">
                            {sr.pace
                              ? sr.pace + " /km"
                              : sr.duration && sr.distance
                              ? secondsToMMSS(sr.duration / sr.distance) +
                                " /km"
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

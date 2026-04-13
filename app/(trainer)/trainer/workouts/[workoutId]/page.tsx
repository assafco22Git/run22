import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Heart, Zap, FileText, Pencil } from "lucide-react";
import type { WorkoutStatus } from "@/types";
import { DeleteWorkoutButton } from "@/components/DeleteWorkoutButton";

function statusBadge(status: string) {
  const s = status as WorkoutStatus;
  if (s === "COMPLETED") return <Badge variant="success">Completed</Badge>;
  if (s === "SKIPPED") return <Badge variant="warning">Skipped</Badge>;
  return <Badge variant="default">Pending</Badge>;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface PageProps {
  params: Promise<{ workoutId: string }>;
}

export default async function WorkoutDetailPage({ params }: PageProps) {
  const { workoutId } = await params;
  const session = await requireTrainer();
  const trainerId = session.user.id;

  // Get trainer profile
  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: trainerId },
  });

  if (!trainerProfile) notFound();

  // Fetch workout with all relations
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      segments: { orderBy: { order: "asc" } },
      result: true,
      trainee: {
        include: { user: true },
      },
    },
  });

  if (!workout) notFound();

  // Security: verify this workout belongs to this trainer
  if (workout.trainerId !== trainerProfile.id) notFound();

  const traineeId = workout.traineeId;
  const { result } = workout;

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      {/* Back link */}
      <Link
        href={`/trainer/trainees/${traineeId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {workout.trainee.user.name}
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {workout.title}
              </h1>
              {statusBadge(workout.status)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Trainee:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {workout.trainee.user.name}
              </span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Scheduled:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {new Date(workout.scheduledAt).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/trainer/workouts/${workoutId}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
            <DeleteWorkoutButton
              workoutId={workoutId}
              redirectTo={`/trainer/trainees/${traineeId}`}
            />
          </div>
        </div>

        {workout.description && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Description
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {workout.description}
            </p>
          </div>
        )}
      </div>

      {/* Segments table */}
      {workout.segments.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm mb-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Segments
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide w-10">
                    #
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Distance
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Target Pace
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {workout.segments.map((seg, idx) => (
                  <tr key={seg.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3 text-gray-400 dark:text-gray-600 font-mono text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {seg.distance.toFixed(1)} km
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300 font-mono">
                      {seg.pace}/km
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {seg.remarks ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result section */}
      {result ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Trainee Result
            </h2>
            <Badge variant="success" className="text-xs">Logged</Badge>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-gray-100 dark:bg-gray-800">
            {result.totalDistance != null && (
              <div className="bg-white dark:bg-gray-900 px-5 py-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Distance</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {(result.totalDistance / 1000).toFixed(2)}{" "}
                  <span className="text-sm font-normal text-gray-500">km</span>
                </p>
              </div>
            )}

            {result.totalDuration != null && (
              <div className="bg-white dark:bg-gray-900 px-5 py-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Duration
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatDuration(result.totalDuration)}
                </p>
              </div>
            )}

            {result.avgPace && (
              <div className="bg-white dark:bg-gray-900 px-5 py-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Avg Pace</p>
                <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">
                  {result.avgPace}
                  <span className="text-sm font-normal text-gray-500 ml-1">/km</span>
                </p>
              </div>
            )}

            {result.avgHeartRate != null && (
              <div className="bg-white dark:bg-gray-900 px-5 py-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Avg HR
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {result.avgHeartRate}{" "}
                  <span className="text-sm font-normal text-gray-500">bpm</span>
                </p>
              </div>
            )}

            {result.maxHeartRate != null && (
              <div className="bg-white dark:bg-gray-900 px-5 py-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-400" /> Max HR
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {result.maxHeartRate}{" "}
                  <span className="text-sm font-normal text-gray-500">bpm</span>
                </p>
              </div>
            )}

            {result.perceivedEffort != null && (
              <div className="bg-white dark:bg-gray-900 px-5 py-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Effort
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {result.perceivedEffort}
                  <span className="text-sm font-normal text-gray-500">/10</span>
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {result.notes && (
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Trainee Notes
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {result.notes}
              </p>
            </div>
          )}

          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-400 dark:text-gray-600">
              Logged {new Date(result.loggedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm px-5 py-10 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-600">
            No result logged yet for this workout.
          </p>
        </div>
      )}
    </div>
  );
}

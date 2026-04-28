import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDuration } from "@/lib/pace";
import { RacePredictor } from "@/components/predictor/RacePredictor";
import { TrainingPredictor } from "@/components/predictor/TrainingPredictor";
import type { WorkoutRef } from "@/components/predictor/TrainingPredictor";

export default async function RacesPage() {
  const session = await requireTrainee();

  const traineeProfile = await prisma.traineeProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const races = traineeProfile
    ? await prisma.race.findMany({
        where: { traineeId: traineeProfile.id },
        orderBy: { date: "desc" },
      })
    : [];

  // Recent workout results with distance + duration (for training predictor)
  const workoutResults = traineeProfile
    ? await prisma.workoutResult.findMany({
        where: {
          traineeId: traineeProfile.id,
          totalDistance: { not: null },
          totalDuration: { not: null },
        },
        include: {
          workout: { select: { title: true, scheduledAt: true } },
        },
        orderBy: { loggedAt: "desc" },
        take: 20,
      })
    : [];

  // Build workout refs for the predictor (min 3 km to give meaningful predictions)
  const workoutRefs: WorkoutRef[] = workoutResults
    .filter((r) => (r.totalDistance ?? 0) >= 3 && (r.totalDuration ?? 0) > 0)
    .map((r) => ({
      id: r.id,
      label: `${r.workout.title} – ${r.workout.scheduledAt.toLocaleDateString(
        "en-GB",
        { day: "numeric", month: "short" }
      )} (${(r.totalDistance ?? 0).toFixed(1)} km)`,
      distanceM: (r.totalDistance ?? 0) * 1000, // predictor expects meters
      durationS: r.totalDuration!,
    }));

  // Serialise races for client components
  const racesForClient = races.map((r) => ({
    id: r.id,
    name: r.name,
    distance: r.distance,
    time: r.time,
    date: r.date.toISOString(),
  }));

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            My Races
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Race history and predictor
          </p>
        </div>
        <Link
          href="/races/new"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shrink-0"
        >
          + Log Race
        </Link>
      </div>

      {/* Race history */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Race History
        </h2>
        {races.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No races logged yet.{" "}
            <Link
              href="/races/new"
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Log your first race
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Race
                  </th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Distance
                  </th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Time
                  </th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Pace
                  </th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {races.map((race) => {
                  const distKm = race.distance / 1000;
                  const paceSecPerKm = race.time / distKm;
                  const paceMin = Math.floor(paceSecPerKm / 60);
                  const paceSec = Math.round(paceSecPerKm % 60);
                  const paceStr = `${paceMin}:${paceSec.toString().padStart(2, "0")}`;

                  return (
                    <tr key={race.id}>
                      <td className="py-2.5 text-gray-900 dark:text-gray-100 font-medium">
                        {race.name}
                      </td>
                      <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">
                        {distKm.toFixed(1)} km
                      </td>
                      <td className="py-2.5 text-right text-gray-900 dark:text-gray-100 font-mono">
                        {formatDuration(race.time)}
                      </td>
                      <td className="py-2.5 text-right text-gray-500 dark:text-gray-400 font-mono">
                        {paceStr} /km
                      </td>
                      <td className="py-2.5 text-right text-gray-500 dark:text-gray-400">
                        {race.date.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Training-based race predictor */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Race Predictor — From Training
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Based on your logged workout results
        </p>
        <TrainingPredictor workouts={workoutRefs} />
      </div>

      {/* Race-based predictor */}
      {racesForClient.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Race Predictor — From Races
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Based on your logged race times
          </p>
          <RacePredictor races={racesForClient} />
        </div>
      )}
    </div>
  );
}

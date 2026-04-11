import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDuration } from "@/lib/pace";
import { RacePredictor } from "@/components/predictor/RacePredictor";

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

  // Serialise for client components
  const racesForClient = races.map((r) => ({
    id: r.id,
    name: r.name,
    distance: r.distance, // stored in meters
    time: r.time, // stored in seconds
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

      {/* Race predictor */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Race Predictor
        </h2>
        <RacePredictor races={racesForClient} />
      </div>
    </div>
  );
}

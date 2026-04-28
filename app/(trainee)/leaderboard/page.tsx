import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export default async function LeaderboardPage() {
  await requireTrainee();

  // This week boundaries (Sunday = start, Sun–Sat)
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  // All trainees with their weekly results
  const trainees = await prisma.traineeProfile.findMany({
    include: {
      user: { select: { name: true } },
      results: {
        where: {
          workout: { scheduledAt: { gte: startOfWeek } },
        },
        select: { totalDistance: true, totalDuration: true },
      },
    },
  });

  type Row = {
    name: string;
    km: number;
    workouts: number;
    totalDurationS: number;
  };

  const rows: Row[] = trainees
    .map((t) => ({
      name: t.user.name,
      km:
        t.results.reduce((sum, r) => sum + (r.totalDistance ?? 0), 0),
      workouts: t.results.length,
      totalDurationS: t.results.reduce(
        (sum, r) => sum + (r.totalDuration ?? 0),
        0
      ),
    }))
    .filter((r) => r.workouts > 0)
    .sort((a, b) => b.km - a.km);

  const weekStart = startOfWeek.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const weekEnd = new Date(startOfWeek);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  function fmtDuration(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Leaderboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Weekly km — {weekStart} – {weekEndStr}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No workouts logged this week yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-10">
                    #
                  </th>
                  <th className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Athlete
                  </th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Distance
                  </th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Workouts
                  </th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.map((row, i) => (
                  <tr
                    key={row.name}
                    className={
                      i === 0
                        ? "bg-yellow-50/50 dark:bg-yellow-950/10"
                        : ""
                    }
                  >
                    <td className="py-3 text-lg">
                      {medals[i] ?? (
                        <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                          {i + 1}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-gray-900 dark:text-gray-100 font-medium">
                      {row.name}
                    </td>
                    <td className="py-3 text-right font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                      {row.km.toFixed(1)}{" "}
                      <span className="font-normal text-gray-400 dark:text-gray-500 text-xs">
                        km
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-300 tabular-nums">
                      {row.workouts}
                    </td>
                    <td className="py-3 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                      {row.totalDurationS > 0
                        ? fmtDuration(row.totalDurationS)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

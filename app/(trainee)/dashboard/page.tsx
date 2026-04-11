import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { secondsToMMSS, paceToSeconds } from "@/lib/pace";
import type { WeeklyVolumePoint } from "@/components/charts/WeeklyVolumeChart";
import type { PaceTrendPoint } from "@/components/charts/PaceTrendChart";
import { DashboardCharts } from "@/components/charts/DashboardCharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns ISO week number for a Date */
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Returns "YYYY-WNN" key */
function weekKey(date: Date): string {
  const year = date.getFullYear();
  const week = getISOWeek(date);
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await requireTrainee();

  const traineeProfile = await prisma.traineeProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!traineeProfile) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
        <p className="text-gray-500 dark:text-gray-400">
          No trainee profile found. Contact your trainer.
        </p>
      </div>
    );
  }

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  // All results for chart data (last 12 weeks)
  const recentResults = await prisma.workoutResult.findMany({
    where: {
      traineeId: traineeProfile.id,
      workout: { scheduledAt: { gte: twelveWeeksAgo } },
    },
    include: {
      workout: { select: { scheduledAt: true, title: true, id: true } },
    },
    orderBy: { loggedAt: "desc" },
  });

  // All-time total km
  const allResults = await prisma.workoutResult.findMany({
    where: { traineeId: traineeProfile.id },
    select: { totalDistance: true },
  });
  const totalKmAllTime = allResults.reduce(
    (sum, r) => sum + (r.totalDistance ?? 0),
    0
  );

  // Workouts this week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const workoutsThisWeek = await prisma.workout.count({
    where: {
      traineeId: traineeProfile.id,
      status: "COMPLETED",
      scheduledAt: { gte: startOfWeek },
    },
  });

  // Avg pace this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthResults = await prisma.workoutResult.findMany({
    where: {
      traineeId: traineeProfile.id,
      loggedAt: { gte: startOfMonth },
      avgPace: { not: null },
    },
    select: { avgPace: true },
  });
  const monthPaceSeconds =
    monthResults.length > 0
      ? monthResults.reduce((sum, r) => sum + paceToSeconds(r.avgPace ?? "0:00"), 0) /
        monthResults.length
      : null;

  // Total completed workouts
  const totalCompleted = await prisma.workout.count({
    where: { traineeId: traineeProfile.id, status: "COMPLETED" },
  });

  // ─── Build chart data (last 8 weeks) ───────────────────────────────────────

  // Group by week key
  const weekMap = new Map<
    string,
    { km: number; paceSum: number; paceCount: number }
  >();

  for (const r of recentResults) {
    const key = weekKey(r.workout.scheduledAt);
    const existing = weekMap.get(key) ?? { km: 0, paceSum: 0, paceCount: 0 };
    existing.km += (r.totalDistance ?? 0) / 1000;
    if (r.avgPace) {
      existing.paceSum += paceToSeconds(r.avgPace);
      existing.paceCount += 1;
    }
    weekMap.set(key, existing);
  }

  // Build last 8 week labels
  const weekLabels: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    weekLabels.push(weekKey(d));
  }

  const volumeData: WeeklyVolumePoint[] = weekLabels.map((key) => ({
    week: "W" + key.split("-W")[1],
    km: parseFloat((weekMap.get(key)?.km ?? 0).toFixed(1)),
  }));

  const paceData: PaceTrendPoint[] = weekLabels
    .map((key) => {
      const w = weekMap.get(key);
      return {
        week: "W" + key.split("-W")[1],
        paceSeconds:
          w && w.paceCount > 0
            ? Math.round(w.paceSum / w.paceCount)
            : 0,
      };
    })
    .filter((p) => p.paceSeconds > 0);

  // Recent 5 workouts
  const recentFive = recentResults.slice(0, 5);

  const stats = [
    {
      label: "Total km (all time)",
      value: (totalKmAllTime / 1000).toFixed(1) + " km",
    },
    {
      label: "Workouts this week",
      value: workoutsThisWeek.toString(),
    },
    {
      label: "Avg pace this month",
      value: monthPaceSeconds ? secondsToMMSS(monthPaceSeconds) + " /km" : "—",
    },
    {
      label: "Completed workouts",
      value: totalCompleted.toString(),
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          My Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your personal training analytics
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {stat.label}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts volumeData={volumeData} paceData={paceData} />

      {/* Recent workouts table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Recent Workouts
        </h2>
        {recentFive.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No completed workouts yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Workout
                  </th>
                  <th className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Distance
                  </th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Pace
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {recentFive.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 text-gray-900 dark:text-gray-100">
                      <Link
                        href={`/workouts/${r.workout.id}`}
                        className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        {r.workout.title}
                      </Link>
                    </td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">
                      {r.workout.scheduledAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">
                      {r.totalDistance
                        ? (r.totalDistance / 1000).toFixed(1) + " km"
                        : "—"}
                    </td>
                    <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">
                      {r.avgPace ? r.avgPace + " /km" : "—"}
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

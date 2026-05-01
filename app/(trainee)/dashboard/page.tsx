import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { secondsToMMSS, paceToSeconds } from "@/lib/pace";
import type { PaceTrendPoint } from "@/components/charts/PaceTrendChart";
import type { WeeklyNavPoint, DayPoint } from "@/components/charts/WeeklyVolumeNavigator";
import { DashboardCharts } from "@/components/charts/DashboardCharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a Sunday-anchored week key: "YYYY-MM-DD" of the Sunday that starts
 * the week containing `date` (Sun–Sat calendar).
 */
function weekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // rewind to Sunday
  return d.toISOString().slice(0, 10);
}

/** Label like "6 Apr – 12 Apr" for a Sunday-anchored week */
function weekRangeLabel(sundayKey: string): string {
  const sun = new Date(sundayKey + "T12:00:00Z");
  const sat = new Date(sun);
  sat.setDate(sat.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(sun)} – ${fmt(sat)}`;
}

/** Short label for the pace chart, e.g. "Apr 6" */
function weekShortLabel(sundayKey: string): string {
  const d = new Date(sundayKey + "T12:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

  // This week boundaries (Sunday = start, Sun–Sat)
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const workoutsThisWeek = await prisma.workout.count({
    where: {
      traineeId: traineeProfile.id,
      status: "COMPLETED",
      scheduledAt: { gte: startOfWeek },
    },
  });

  // km logged this week
  const thisWeekResults = await prisma.workoutResult.findMany({
    where: {
      traineeId: traineeProfile.id,
      workout: { scheduledAt: { gte: startOfWeek } },
    },
    select: { totalDistance: true },
  });
  const kmThisWeek =
    thisWeekResults.reduce((sum, r) => sum + (r.totalDistance ?? 0), 0);

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
      ? monthResults.reduce(
          (sum, r) => sum + paceToSeconds(r.avgPace ?? "0:00"),
          0
        ) / monthResults.length
      : null;

  // Total completed workouts
  const totalCompleted = await prisma.workout.count({
    where: { traineeId: traineeProfile.id, status: "COMPLETED" },
  });

  // ─── Build chart data (last 8 weeks) ───────────────────────────────────────

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

  // weekKey → dayOfWeek (0=Sun…6=Sat) → workouts that day
  type DayWorkouts = { title: string; km: number }[];
  const weekDayMap = new Map<string, DayWorkouts[]>();

  // weekKey → pace accumulator
  const weekPaceMap = new Map<string, { paceSum: number; paceCount: number }>();

  for (const r of recentResults) {
    const wKey = weekKey(r.workout.scheduledAt);
    const dow = r.workout.scheduledAt.getDay(); // 0=Sun … 6=Sat

    // Per-day accumulation
    if (!weekDayMap.has(wKey)) {
      weekDayMap.set(wKey, Array.from({ length: 7 }, () => []));
    }
    weekDayMap.get(wKey)![dow].push({
      title: r.workout.title,
      km: r.totalDistance ?? 0,
    });

    // Pace accumulation
    if (r.avgPace) {
      const p = weekPaceMap.get(wKey) ?? { paceSum: 0, paceCount: 0 };
      p.paceSum += paceToSeconds(r.avgPace);
      p.paceCount += 1;
      weekPaceMap.set(wKey, p);
    }
  }

  // Build last 8 Sunday-anchored week keys (oldest → newest)
  const weekKeys: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    weekKeys.push(weekKey(d));
  }

  const weeklyData: WeeklyNavPoint[] = weekKeys.map((wKey) => {
    const dayGroups = weekDayMap.get(wKey) ?? Array.from({ length: 7 }, () => []);
    // Sunday of this week at UTC noon for safe date arithmetic
    const sunDate = new Date(wKey + "T12:00:00Z");

    const days: DayPoint[] = DAY_NAMES.map((name, i) => {
      const d = new Date(sunDate.getTime() + i * 86_400_000);
      const date = d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      });
      const workouts = dayGroups[i] ?? [];
      return {
        day: name,
        date,
        km: parseFloat(workouts.reduce((s, w) => s + w.km, 0).toFixed(2)),
        workouts,
      };
    });

    return {
      label: weekRangeLabel(wKey),
      km: parseFloat(days.reduce((s, d) => s + d.km, 0).toFixed(1)),
      days,
    };
  });

  const paceData: PaceTrendPoint[] = weekKeys
    .map((key) => {
      const p = weekPaceMap.get(key);
      return {
        week: weekShortLabel(key),
        paceSeconds: p && p.paceCount > 0 ? Math.round(p.paceSum / p.paceCount) : 0,
      };
    })
    .filter((p) => p.paceSeconds > 0);

  // Recent 5 workouts
  const recentFive = recentResults.slice(0, 5);

  const stats = [
    {
      label: "km this week",
      value: kmThisWeek > 0 ? kmThisWeek.toFixed(1) + " km" : "—",
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
      label: "Total km (all time)",
      value: totalKmAllTime.toFixed(1) + " km",
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
      <DashboardCharts
        weeklyData={weeklyData}
        initialWeekIndex={weeklyData.length - 1}
        paceData={paceData}
      />

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
                        ? r.totalDistance.toFixed(1) + " km"
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

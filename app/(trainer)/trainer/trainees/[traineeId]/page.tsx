import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Calendar, Dumbbell } from "lucide-react";
import type { WorkoutStatus } from "@/types";
import { TraineeAnalyticsChart } from "@/components/charts/TraineeAnalyticsChart";
import { TraineeActions } from "@/components/trainer/TraineeActions";
import { WorkoutCalendar } from "@/components/trainer/WorkoutCalendar";

function statusBadge(status: string) {
  const s = status as WorkoutStatus;
  if (s === "COMPLETED")
    return <Badge variant="success">Completed</Badge>;
  if (s === "SKIPPED")
    return <Badge variant="warning">Skipped</Badge>;
  return <Badge variant="default">Pending</Badge>;
}

function buildChartData(
  workouts: { scheduledAt: Date; result: { totalDistance: number | null } | null }[],
  period: "weekly" | "monthly" | "yearly"
) {
  if (period === "weekly") {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const map = Object.fromEntries(days.map((d) => [d, 0]));
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    for (const w of workouts) {
      const d = new Date(w.scheduledAt);
      if (d >= monday) {
        const idx = (d.getDay() + 6) % 7;
        map[days[idx]] += w.result?.totalDistance ?? 0;
      }
    }
    return days.map((d) => ({ label: d, km: parseFloat((map[d] / 1000).toFixed(2)) }));
  }

  if (period === "monthly") {
    const weeks = ["Wk1", "Wk2", "Wk3", "Wk4"];
    const map = Object.fromEntries(weeks.map((w) => [w, 0]));
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const w of workouts) {
      const d = new Date(w.scheduledAt);
      if (d >= startOfMonth) {
        const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
        map[weeks[weekIdx]] += w.result?.totalDistance ?? 0;
      }
    }
    return weeks.map((w) => ({ label: w, km: parseFloat((map[w] / 1000).toFixed(2)) }));
  }

  // yearly
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const map = Object.fromEntries(months.map((m) => [m, 0]));
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  for (const w of workouts) {
    const d = new Date(w.scheduledAt);
    if (d >= startOfYear) {
      map[months[d.getMonth()]] += w.result?.totalDistance ?? 0;
    }
  }
  return months.map((m) => ({ label: m, km: parseFloat((map[m] / 1000).toFixed(2)) }));
}

interface PageProps {
  params: Promise<{ traineeId: string }>;
}

export default async function TraineeDetailPage({ params }: PageProps) {
  const { traineeId } = await params;
  const session = await requireTrainer();
  const trainerId = session.user.id;

  // Verify the trainer has access to this trainee
  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: trainerId },
  });

  if (!trainerProfile) notFound();

  const link = await prisma.trainerTrainee.findFirst({
    where: { trainerId: trainerProfile.id, traineeId },
  });

  if (!link) notFound();

  const traineeProfile = await prisma.traineeProfile.findUnique({
    where: { id: traineeId },
    include: {
      user: true,
      workouts: {
        include: {
          result: true,
          segments: { orderBy: { order: "asc" } },
        },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });

  if (!traineeProfile) notFound();

  const weeklyData = buildChartData(traineeProfile.workouts, "weekly");
  const monthlyData = buildChartData(traineeProfile.workouts, "monthly");
  const yearlyData = buildChartData(traineeProfile.workouts, "yearly");

  const totalDistance = traineeProfile.workouts
    .reduce((sum, w) => sum + (w.result?.totalDistance ?? 0), 0)
    .toFixed(1);
  const completedCount = traineeProfile.workouts.filter(
    (w) => w.status === "COMPLETED"
  ).length;

  // Serialise workouts for the calendar (no Date objects across server→client boundary)
  const calendarWorkouts = traineeProfile.workouts.map((w) => ({
    id: w.id,
    title: w.title,
    scheduledAt: w.scheduledAt.toISOString(),
    status: w.status,
  }));

  // Format dob for the edit form (YYYY-MM-DD)
  const dobFormatted = traineeProfile.dob
    ? traineeProfile.dob.toISOString().slice(0, 10)
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      {/* Back */}
      <Link
        href="/trainer/trainees"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All trainees
      </Link>

      {/* Trainee card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold text-xl shrink-0">
            {traineeProfile.user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {traineeProfile.user.name}
            </h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {traineeProfile.user.email}
              </span>
              <span className="flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5" />
                {traineeProfile.workouts.length} workouts total
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {completedCount} completed &middot; {totalDistance} km
              </span>
            </div>
          </div>
          <Link
            href={`/trainer/workouts/new?traineeId=${traineeProfile.id}`}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
          >
            + Workout
          </Link>
        </div>

        {/* Edit / Remove actions */}
        <div className="mt-4">
          <TraineeActions
            traineeId={traineeId}
            initialName={traineeProfile.user.name}
            initialDob={dobFormatted}
            initialGender={traineeProfile.gender}
          />
        </div>
      </div>

      {/* Workout Calendar */}
      <div className="mb-6">
        <WorkoutCalendar workouts={calendarWorkouts} />
      </div>

      {/* Tabs with chart */}
      <Tabs defaultValue="weekly">
        <TabsList className="mb-4">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 mb-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Distance (km)
          </p>
          <TabsContent value="weekly">
            <TraineeAnalyticsChart data={weeklyData} />
          </TabsContent>
          <TabsContent value="monthly">
            <TraineeAnalyticsChart data={monthlyData} />
          </TabsContent>
          <TabsContent value="yearly">
            <TraineeAnalyticsChart data={yearlyData} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Workouts list */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Workout History
          </h2>
        </div>
        {traineeProfile.workouts.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 dark:text-gray-600 text-sm">
            No workouts yet
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {traineeProfile.workouts.map((workout) => (
              <li key={workout.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                        {workout.title}
                      </p>
                      {statusBadge(workout.status)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(workout.scheduledAt).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {workout.segments.length > 0 &&
                        ` · ${workout.segments.length} segment${workout.segments.length !== 1 ? "s" : ""}`}
                    </p>
                    {workout.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">
                        {workout.description}
                      </p>
                    )}
                  </div>
                  {workout.result?.totalDistance != null && (
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {workout.result.totalDistance.toFixed(1)} km
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

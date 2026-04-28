import Link from "next/link";
import { requireTrainer } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Users, Dumbbell, CheckCircle, Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardCalendar } from "@/components/trainer/DashboardCalendar";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 flex items-center gap-4">
      <div
        className={cn(
          "flex items-center justify-center w-11 h-11 rounded-xl shrink-0",
          accent
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {value}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default async function TrainerDashboardPage() {
  const session = await requireTrainer();
  const trainerId = session.user.id;

  // Fetch trainer profile
  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: trainerId },
    include: {
      trainees: {
        include: {
          trainee: { include: { user: true } },
        },
      },
      workouts: {
        where: {
          scheduledAt: {
            gte: new Date(
              new Date().setDate(new Date().getDate() - new Date().getDay())
            ),
          },
        },
      },
    },
  });

  const traineeCount = trainerProfile?.trainees.length ?? 0;
  const workoutsThisWeek = trainerProfile?.workouts.length ?? 0;

  // Recent completions
  const recentCompletions = await prisma.workoutResult.findMany({
    where: {
      workout: { trainerId: trainerProfile?.id ?? "" },
    },
    include: {
      workout: true,
      trainee: { include: { user: true } },
    },
    orderBy: { loggedAt: "desc" },
    take: 5,
  });

  // All workouts for the calendar (no date filter — client navigates months)
  const allWorkouts = await prisma.workout.findMany({
    where: { trainerId: trainerProfile?.id ?? "" },
    include: { trainee: { include: { user: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  // Serialise for client component
  const calendarWorkouts = allWorkouts.map(w => ({
    id: w.id,
    title: w.title,
    scheduledAt: w.scheduledAt.toISOString(),
    status: w.status,
    traineeName: w.trainee.user.name,
    traineeId: w.traineeId,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Welcome back, {session.user.name}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Trainees"
          value={traineeCount}
          icon={Users}
          accent="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Workouts this week"
          value={workoutsThisWeek}
          icon={Dumbbell}
          accent="bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="Recent completions"
          value={recentCompletions.length}
          icon={CheckCircle}
          accent="bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* Calendar */}
      <div className="mb-8">
        <DashboardCalendar workouts={calendarWorkouts} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/trainer/trainees"
          className="group flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors shadow-sm"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/70 transition-colors">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              View Trainees
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage your {traineeCount} trainees
            </p>
          </div>
        </Link>

        <Link
          href="/trainer/workouts/new"
          className="group flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors shadow-sm"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/70 transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              New Workout
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Plan a session for a trainee
            </p>
          </div>
        </Link>
      </div>

      {/* Recent completions list */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Recent Completions
          </h2>
        </div>
        {recentCompletions.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 dark:text-gray-600 text-sm">
            No completions yet
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentCompletions.map((result) => (
              <li key={result.id} className="px-5 py-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {result.workout.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {result.trainee.user.name} &middot;{" "}
                    {new Date(result.loggedAt).toLocaleDateString()}
                  </p>
                </div>
                {result.totalDistance != null && (
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {result.totalDistance.toFixed(1)} km
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

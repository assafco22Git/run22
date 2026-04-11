import Link from "next/link";
import { requireTrainer } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ChevronRight, User } from "lucide-react";

export default async function TraineesPage() {
  const session = await requireTrainer();
  const trainerId = session.user.id;

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: trainerId },
    include: {
      trainees: {
        include: {
          trainee: {
            include: {
              user: true,
              workouts: {
                orderBy: { scheduledAt: "desc" },
                take: 1,
              },
              _count: { select: { workouts: true } },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  const trainees = trainerProfile?.trainees ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Trainees
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {trainees.length} trainee{trainees.length !== 1 ? "s" : ""} linked to
          your account
        </p>
      </div>

      {trainees.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm px-5 py-16 text-center">
          <User className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No trainees yet. Add your first trainee to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
          {trainees.map(({ trainee, assignedAt }) => {
            const lastWorkout = trainee.workouts[0];
            const workoutCount = trainee._count.workouts;

            return (
              <Link
                key={trainee.id}
                href={`/trainer/trainees/${trainee.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                {/* Avatar */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold text-sm shrink-0">
                  {trainee.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {trainee.user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {trainee.user.email}
                  </p>
                </div>

                {/* Meta */}
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {workoutCount} workout{workoutCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {lastWorkout
                      ? `Last: ${new Date(lastWorkout.scheduledAt).toLocaleDateString()}`
                      : `Joined ${new Date(assignedAt).toLocaleDateString()}`}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

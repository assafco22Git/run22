import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { WorkoutCalendar } from "@/components/calendar/WorkoutCalendar";

interface CalendarPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const session = await requireTrainee();
  const { month } = await searchParams;

  // Default to current month if not provided
  const monthStr = month ?? new Date().toISOString().slice(0, 7); // "2026-04"

  const [year, mon] = monthStr.split("-").map(Number);
  const safeYear = year ?? new Date().getFullYear();
  const safeMonth = mon ?? new Date().getMonth() + 1;

  const startOfMonth = new Date(safeYear, safeMonth - 1, 1);
  const endOfMonth = new Date(safeYear, safeMonth, 0, 23, 59, 59, 999);

  // Get trainee profile
  const traineeProfile = await prisma.traineeProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const workouts = traineeProfile
    ? await prisma.workout.findMany({
        where: {
          traineeId: traineeProfile.id,
          scheduledAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          status: true,
        },
        orderBy: { scheduledAt: "asc" },
      })
    : [];

  const workoutData = workouts.map((w) => ({
    id: w.id,
    title: w.title,
    scheduledAt: w.scheduledAt.toISOString(),
    status: w.status as "PENDING" | "COMPLETED" | "SKIPPED",
  }));

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Training Calendar
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View and manage your scheduled workouts
        </p>
      </div>

      <WorkoutCalendar workouts={workoutData} currentMonth={monthStr} />
    </div>
  );
}

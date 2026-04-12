import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PreferencesForm } from "@/components/plan/PreferencesForm";
import type { DayPref } from "@/app/actions/preferences";

const DEFAULT_DAYS: DayPref[] = [
  { day: 0, enabled: false, time: "any" }, // Sun
  { day: 1, enabled: true,  time: "any" }, // Mon
  { day: 2, enabled: false, time: "any" }, // Tue
  { day: 3, enabled: true,  time: "any" }, // Wed
  { day: 4, enabled: false, time: "any" }, // Thu
  { day: 5, enabled: true,  time: "any" }, // Fri
  { day: 6, enabled: false, time: "any" }, // Sat
];

export default async function PlanPage() {
  const session = await requireTrainee();

  const trainee = await prisma.traineeProfile.findUnique({
    where: { userId: session.user.id },
    include: { preferences: true },
  });

  const savedDays: DayPref[] = trainee?.preferences?.days
    ? JSON.parse(trainee.preferences.days)
    : DEFAULT_DAYS;

  // Ensure all 7 days present (merge with defaults in case schema changed)
  const mergedDays: DayPref[] = DEFAULT_DAYS.map((def) => {
    const saved = savedDays.find((d) => d.day === def.day);
    return saved ?? def;
  });

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          My Training Plan
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Set which days you&apos;re available to run. Your trainer will only schedule workouts on your available days.
        </p>
      </div>

      <PreferencesForm
        initialDays={mergedDays}
        initialNotes={trainee?.preferences?.notes ?? ""}
      />
    </div>
  );
}

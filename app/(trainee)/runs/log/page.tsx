import { requireTrainee } from "@/lib/auth-helpers";
import { LogSelfRunForm } from "@/components/workout/LogSelfRunForm";

export default async function LogRunPage() {
  await requireTrainee();
  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Log a Run</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Record a completed run outside your training plan.
        </p>
      </div>
      <LogSelfRunForm />
    </div>
  );
}

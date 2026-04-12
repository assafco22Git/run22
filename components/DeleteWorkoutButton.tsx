"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteWorkout } from "@/app/actions/workouts";
import { toast } from "sonner";

interface DeleteWorkoutButtonProps {
  workoutId: string;
  redirectTo: string;
}

export function DeleteWorkoutButton({ workoutId, redirectTo }: DeleteWorkoutButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      // Auto-cancel after 4 seconds
      setTimeout(() => setConfirming(false), 4000);
      return;
    }

    startTransition(async () => {
      const result = await deleteWorkout(workoutId);
      if (result.success) {
        toast.success("Workout deleted");
        window.location.href = redirectTo;
      } else {
        toast.error(result.error ?? "Failed to delete workout");
        setConfirming(false);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={
        confirming
          ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
          : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-60"
      }
    >
      <Trash2 className="w-3.5 h-3.5" />
      {isPending ? "Deleting…" : confirming ? "Confirm delete?" : "Delete"}
    </button>
  );
}

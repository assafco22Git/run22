"use client";

import { useState, useTransition } from "react";
import { updateTrainerBio } from "@/app/actions/trainer";
import { CheckCircle, AlertCircle, Loader2, Save } from "lucide-react";

interface BioFormProps {
  initialBio: string;
}

export function BioForm({ initialBio }: BioFormProps) {
  const [bio, setBio] = useState(initialBio);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const MAX = 1000;
  const remaining = MAX - bio.length;
  const isDirty = bio !== initialBio;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      const res = await updateTrainerBio(bio);
      setResult(res);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setResult(null);
          }}
          rows={5}
          maxLength={MAX}
          placeholder="Tell your trainees a bit about yourself — your coaching philosophy, specialties, certifications..."
          disabled={isPending}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
        />
        <p
          className={`text-xs mt-1 text-right ${
            remaining < 50
              ? "text-amber-500 dark:text-amber-400"
              : "text-gray-400 dark:text-gray-600"
          }`}
        >
          {remaining} characters remaining
        </p>
      </div>

      {result && (
        <div
          className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${
            result.success
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
          }`}
        >
          {result.success ? (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{result.success ? "Bio saved successfully!" : result.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !isDirty}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Bio
          </>
        )}
      </button>
    </form>
  );
}

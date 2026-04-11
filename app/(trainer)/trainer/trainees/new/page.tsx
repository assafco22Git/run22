"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addTrainee } from "@/app/actions/trainees";
import { ArrowLeft, UserPlus, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function AddTraineePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      const res = await addTrainee(email);
      setResult(res);

      if (res.success) {
        // Short pause then redirect to trainees list
        setTimeout(() => {
          router.push("/trainer/trainees");
          router.refresh();
        }, 1500);
      }
    });
  }

  return (
    <div className="p-6 max-w-lg mx-auto w-full">
      {/* Back */}
      <Link
        href="/trainer/trainees"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All trainees
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Add a Trainee
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter the trainee&apos;s email address to link them to your account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Trainee email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trainee@example.com"
              required
              disabled={isPending || result?.success === true}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
            />
          </div>

          {/* Status messages */}
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
              <span>
                {result.success
                  ? "Trainee added successfully! Redirecting..."
                  : result.error}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !email.trim() || result?.success === true}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding trainee...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Add Trainee
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-600 text-center">
          The trainee must already have a registered account with the TRAINEE role.
        </p>
      </div>
    </div>
  );
}

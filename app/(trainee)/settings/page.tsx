import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await requireTrainee();

  // Fetch full user record for Strava info
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      stravaId: true,
      stravaEnabled: true,
    },
  });

  const isStravaConnected = !!user?.stravaId;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your profile and integrations
        </p>
      </div>

      {/* Profile section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Profile
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Name
            </label>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
              {user?.name ?? session.user.name ?? "—"}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Email
            </label>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {user?.email ?? session.user.email ?? "—"}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Contact your trainer to update profile information.
            </p>
          </div>
        </div>
      </div>

      {/* Strava integration */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-3 mb-4">
          {/* Strava logo mark */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FC4C02]">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-white"
              fill="currentColor"
            >
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Strava Integration
          </h2>
        </div>

        {isStravaConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Connected
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                as Strava ID {user?.stravaId}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-sync workouts
              </span>
              <form
                action={async () => {
                  "use server";
                  const { prisma: db } = await import("@/lib/prisma");
                  await db.user.update({
                    where: { id: session.user.id },
                    data: { stravaEnabled: !user?.stravaEnabled },
                  });
                }}
              >
                <button
                  type="submit"
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    user?.stravaEnabled
                      ? "bg-emerald-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                  aria-label={
                    user?.stravaEnabled
                      ? "Disable Strava sync"
                      : "Enable Strava sync"
                  }
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      user?.stravaEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </form>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {user?.stravaEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div>
              <a
                href="/api/strava/disconnect"
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Disconnect Strava
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connect Strava to automatically sync your activities with your
              workouts.
            </p>
            <a
              href="/api/strava/connect"
              className="inline-flex items-center gap-2 bg-[#FC4C02] hover:bg-[#e04302] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              Connect with Strava
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { updateName } from "@/app/actions/profile";
import { StravaSyncButton } from "@/components/StravaSyncButton";
import { ProfilePicture } from "@/components/ProfilePicture";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireTrainee();
  const params = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, stravaId: true },
  });

  const isStravaConnected = !!user?.stravaId;

  const stravaNotice =
    params.success === "strava_connected"
      ? { type: "success", msg: "Strava connected successfully!" }
      : params.success === "strava_disconnected"
      ? { type: "success", msg: "Strava disconnected." }
      : params.error === "strava_denied"
      ? { type: "error", msg: "Strava authorisation was cancelled." }
      : params.error === "strava_not_configured"
      ? { type: "error", msg: "Strava is not configured on this server." }
      : params.error === "strava_token_failed"
      ? { type: "error", msg: "Could not get Strava token. Try again." }
      : null;

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your profile and integrations</p>
      </div>

      {/* Profile */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Profile</h2>

        {/* Avatar */}
        <div className="mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
          <ProfilePicture currentImage={user?.image} name={user?.name ?? "?"} />
        </div>

        <form action={updateName} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={user?.name ?? ""}
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
            <div className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
              {user?.email}
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
          >
            Save changes
          </button>
        </form>
      </div>

      {/* Strava */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FC4C02]">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Strava Integration</h2>
        </div>

        {stravaNotice && (
          <div className={`mb-3 px-3 py-2 rounded-xl text-sm ${
            stravaNotice.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
              : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
          }`}>
            {stravaNotice.msg}
          </div>
        )}

        {isStravaConnected ? (
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Connected · Strava ID {user?.stravaId}
            </span>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Your Strava account is linked. Run activities are matched to your scheduled workouts within ±1 day.
            </p>
            <StravaSyncButton />
            <a
              href="/api/strava/disconnect"
              className="block w-fit px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Disconnect Strava
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connect Strava to link your activities with your training workouts.
            </p>
            <a
              href="/api/strava/connect"
              className="inline-flex items-center gap-2 bg-[#FC4C02] hover:bg-[#e04302] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              Connect with Strava
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

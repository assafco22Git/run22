import { requireTrainer } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { BioForm } from "@/components/trainer/BioForm";
import { TrainerCredentialsForm } from "@/components/trainer/TrainerCredentialsForm";
import { ProfilePicture } from "@/components/ProfilePicture";

export default async function TrainerSettingsPage() {
  const session = await requireTrainer();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, username: true, image: true },
  });

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your trainer profile</p>
      </div>

      {/* Account & credentials */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Account</h2>

        {/* Avatar */}
        <div className="mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
          <ProfilePicture currentImage={user?.image} name={user?.name ?? "?"} />
        </div>

        <TrainerCredentialsForm
          initialName={user?.name ?? ""}
          initialEmail={user?.email ?? ""}
          initialUsername={user?.username}
        />
      </div>

      {/* Bio */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Bio</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Visible to your trainees.</p>
        <BioForm initialBio={trainerProfile?.bio ?? ""} />
      </div>
    </div>
  );
}

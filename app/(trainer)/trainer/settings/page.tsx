import { requireTrainer } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { BioForm } from "@/components/trainer/BioForm";
import { User, Mail, FileText } from "lucide-react";

export default async function TrainerSettingsPage() {
  const session = await requireTrainer();
  const userId = session.user.id;

  // Fetch trainer profile (bio)
  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId },
  });

  const bio = trainerProfile?.bio ?? "";
  const name = session.user.name ?? "Trainer";
  const email = session.user.email ?? "";

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your trainer profile
        </p>
      </div>

      {/* Profile card — read-only */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Account
        </h2>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              <User className="w-3.5 h-3.5" />
              Name
            </label>
            <div className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 select-all">
              {name}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email
            </label>
            <div className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 select-all">
              {email}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
              Name and email cannot be changed here.
            </p>
          </div>
        </div>
      </div>

      {/* Bio card — editable */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Bio
          </h2>
          <FileText className="w-4 h-4 text-gray-400 dark:text-gray-600" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Your bio is visible to your trainees.
        </p>

        <BioForm initialBio={bio} />
      </div>
    </div>
  );
}

import { requireTrainer } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { UploadWorkoutsClient } from "@/components/trainer/UploadWorkoutsClient";

export default async function UploadWorkoutsPage() {
  const session = await requireTrainer();

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      trainees: {
        include: { trainee: { include: { user: true } } },
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  const trainees = (trainerProfile?.trainees ?? []).map(({ trainee }) => ({
    id: trainee.id,
    name: trainee.user.name,
  }));

  return <UploadWorkoutsClient trainees={trainees} />;
}

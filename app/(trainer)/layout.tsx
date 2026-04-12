import { requireTrainer } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/auth";
import { TrainerSidebar } from "@/components/layout/TrainerSidebar";
import { TrainerMobileNav } from "@/components/layout/TrainerMobileNav";
import { MobileTopBar } from "@/components/layout/MobileTopBar";

async function logoutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireTrainer();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, image: true },
  });

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <TrainerSidebar
        userName={user?.name ?? "Trainer"}
        userImage={user?.image}
        logoutAction={logoutAction}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <MobileTopBar logoutAction={logoutAction} />
        {children}
      </main>

      <TrainerMobileNav />
    </div>
  );
}

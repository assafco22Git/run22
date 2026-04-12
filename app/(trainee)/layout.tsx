import { requireTrainee } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/auth";
import { TraineeSidebar } from "@/components/layout/TraineeSidebar";
import { TraineeMobileNav } from "@/components/layout/TraineeMobileNav";
import { MobileTopBar } from "@/components/layout/MobileTopBar";

async function logoutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function TraineeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireTrainee();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, image: true },
  });

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <TraineeSidebar
        userName={user?.name ?? "Trainee"}
        userImage={user?.image}
        logoutAction={logoutAction}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <MobileTopBar logoutAction={logoutAction} />
        {children}
      </main>

      <TraineeMobileNav />
    </div>
  );
}

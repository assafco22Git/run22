import { requireTrainee } from "@/lib/auth-helpers";
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
  const session   = await requireTrainee();
  const userName  = session.user.name ?? "Trainee";
  const userEmail = session.user.email;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <TraineeSidebar
        userName={userName}
        userEmail={userEmail}
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

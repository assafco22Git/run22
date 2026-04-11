import { requireTrainer } from "@/lib/auth-helpers";
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
  const userName  = session.user.name ?? "Trainer";
  const userEmail = session.user.email;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <TrainerSidebar
        userName={userName}
        userEmail={userEmail}
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

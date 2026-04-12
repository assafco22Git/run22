"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Plus,
  LogOut,
  Settings,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Run22Logo } from "@/components/Run22Logo";
import { NotificationBell } from "@/components/NotificationBell";

const navItems = [
  { label: "Dashboard",   href: "/trainer/dashboard",     icon: LayoutDashboard },
  { label: "Trainees",    href: "/trainer/trainees",      icon: Users           },
  { label: "New Workout", href: "/trainer/workouts/new",  icon: Plus            },
  { label: "Settings",    href: "/trainer/settings",      icon: Settings        },
];

interface TrainerSidebarProps {
  userName: string;
  userImage?: string | null;
  logoutAction: () => Promise<void>;
}

export function TrainerSidebar({ userName, userImage, logoutAction }: TrainerSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0">
      {/* Brand */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <Run22Logo size="lg" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-2">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/trainer/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 px-4 py-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          {/* Avatar + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            {userImage ? (
              <Image
                src={userImage}
                alt={userName}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gray-200 dark:ring-gray-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                {userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            )}
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {userName}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            <NotificationBell placement="up" />
            <ThemeToggle />
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

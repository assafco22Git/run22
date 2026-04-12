"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Trophy,
  Settings,
  LogOut,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Run22Logo } from "@/components/Run22Logo";
import { NotificationBell } from "@/components/NotificationBell";

const navItems = [
  {
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Races",
    href: "/races",
    icon: Trophy,
  },
  {
    label: "My Plan",
    href: "/plan",
    icon: ClipboardList,
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface TraineeSidebarProps {
  userName: string;
  userEmail?: string | null;
  userImage?: string | null;
  logoutAction: () => Promise<void>;
}

export function TraineeSidebar({
  userName,
  userEmail,
  userImage,
  logoutAction,
}: TraineeSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 overflow-hidden bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 px-4 py-6 shrink-0">
      {/* Brand */}
      <div className="flex items-center mb-8 px-2">
        <Run22Logo size="lg" />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === href
              : pathname.startsWith(href);
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
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex items-center justify-between px-2">
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
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {userName}
              </p>
              {userEmail && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userEmail}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
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

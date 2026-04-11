"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/trainer/dashboard", icon: LayoutDashboard },
  { label: "Trainees",  href: "/trainer/trainees",  icon: Users },
  { label: "New",       href: "/trainer/workouts/new", icon: Plus, fab: true },
  { label: "Settings",  href: "/trainer/settings",  icon: Settings },
];

export function TrainerMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-stretch safe-area-bottom">
      {navItems.map(({ label, href, icon: Icon, fab }) => {
        const active =
          href === "/trainer/dashboard"
            ? pathname === href
            : pathname.startsWith(href);

        if (fab) {
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
            >
              {/* Green floating action circle */}
              <div className={cn(
                "flex items-center justify-center w-11 h-11 -mt-4 rounded-full shadow-lg transition-transform active:scale-95",
                active
                  ? "bg-emerald-600 shadow-emerald-500/40"
                  : "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-600"
              )}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className={cn(
                "text-xs font-medium mt-0.5",
                active ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"
              )}>
                {label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
              active
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            <Icon className={cn("w-5 h-5", active && "stroke-2")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

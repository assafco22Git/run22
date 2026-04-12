"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Trophy, Settings, BarChart3, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

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
    label: "Plan",
    href: "/plan",
    icon: ClipboardList,
  },
  {
    label: "Races",
    href: "/races",
    icon: Trophy,
  },
  {
    label: "Leaders",
    href: "/leaderboard",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function TraineeMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-stretch safe-area-bottom">
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
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
              active
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            <Icon
              className={cn("w-5 h-5", active && "stroke-2")}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

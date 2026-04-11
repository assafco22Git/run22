"use client";

import { Activity, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MobileTopBarProps {
  logoutAction: () => Promise<void>;
}

export function MobileTopBar({ logoutAction }: MobileTopBarProps) {
  return (
    <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm text-gray-900 dark:text-gray-100">TrainTrack</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <form action={logoutAction}>
          <button
            type="submit"
            title="Sign out"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

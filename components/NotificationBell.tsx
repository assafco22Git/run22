"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface NotificationBellProps {
  /** "up" opens the panel above the button (use in sidebar footer); "down" opens below (default, use in top bar) */
  placement?: "up" | "down";
}

export function NotificationBell({ placement = "down" }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    const wasOpen = open;
    setOpen((v) => !v);

    if (!wasOpen && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      try {
        await fetch("/api/notifications", { method: "PATCH" });
      } catch {
        // silently ignore
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className={cn(
          "relative p-2 rounded-xl transition-colors",
          "text-gray-500 dark:text-gray-400",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          "hover:text-gray-900 dark:hover:text-gray-100",
          open && "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        )}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "absolute z-[100] w-80",
            "bg-white dark:bg-gray-900",
            "border border-gray-200 dark:border-gray-700",
            "rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40",
            "overflow-hidden",
            placement === "up"
              ? "bottom-full mb-2 left-0"   // sidebar: opens upward, extends rightward
              : "top-full mt-2 right-0"      // top-bar: opens downward, extends leftward
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400 dark:text-gray-500">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map((n) => {
                  const row = (
                    <div
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors",
                        "hover:bg-gray-50 dark:hover:bg-gray-800/60",
                        !n.read && "bg-emerald-50/50 dark:bg-emerald-950/20"
                      )}
                    >
                      {/* Unread dot — always takes space so text stays aligned */}
                      <span
                        className={cn(
                          "mt-1.5 w-2 h-2 rounded-full shrink-0 transition-opacity",
                          n.read ? "opacity-0" : "bg-emerald-500 opacity-100"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">
                          {n.body}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  );

                  return n.href ? (
                    <Link key={n.id} href={n.href} onClick={() => setOpen(false)}>
                      {row}
                    </Link>
                  ) : (
                    <div key={n.id}>{row}</div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

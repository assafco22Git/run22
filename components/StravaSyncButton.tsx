"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function StravaSyncButton() {
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [summary, setSummary] = useState("");

  async function handleSync() {
    setStatus("syncing");
    setSummary("");
    try {
      const res = await fetch("/api/strava/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatus("done");
        setSummary(
          `Synced ${data.synced} activit${data.synced === 1 ? "y" : "ies"}, matched ${data.matched} workout${data.matched === 1 ? "" : "s"}.`
        );
      } else {
        setStatus("error");
        setSummary(data.error ?? "Sync failed");
      }
    } catch {
      setStatus("error");
      setSummary("Network error");
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSync}
        disabled={status === "syncing"}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${status === "syncing" ? "animate-spin" : ""}`} />
        {status === "syncing" ? "Syncing…" : "Sync now"}
      </button>
      {summary && (
        <p className={`text-xs ${status === "error" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
          {summary}
        </p>
      )}
    </div>
  );
}

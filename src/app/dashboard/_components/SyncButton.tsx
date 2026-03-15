"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        console.error("Sync failed:", data);
        setSyncing(false);
        return;
      }
      router.refresh();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncing}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Syncing…" : "Sync now"}
    </button>
  );
}

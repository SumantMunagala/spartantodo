"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "spartantodo_lastSyncAt";
const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export function SyncOnVisit() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const last = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
    const lastTime = last ? parseInt(last, 10) : 0;
    if (Number.isNaN(lastTime) || Date.now() - lastTime < THROTTLE_MS) {
      return;
    }

    fetch("/api/sync", { method: "POST", credentials: "include" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok && typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
          router.refresh();
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}

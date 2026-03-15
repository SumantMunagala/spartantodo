"use client";

import { useCallback, useEffect, useState } from "react";

type IntegrationsState = {
  hasCanvas: boolean;
  hasGradescope: boolean;
} | null;

export default function SettingsPage() {
  const [state, setState] = useState<IntegrationsState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [canvasToken, setCanvasToken] = useState("");
  const [gradescopeIcsUrl, setGradescopeIcsUrl] = useState("");

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setState({ hasCanvas: data.hasCanvas, hasGradescope: data.hasGradescope });
    } catch {
      setState({ hasCanvas: false, hasGradescope: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasToken: canvasToken.trim() || undefined,
          gradescopeIcsUrl: gradescopeIcsUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Failed to save" });
        return;
      }
      setMessage({ type: "success", text: "Settings saved." });
      setCanvasToken("");
      setGradescopeIcsUrl("");
      await fetchIntegrations();
    } catch {
      setMessage({ type: "error", text: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Connect Canvas and Gradescope to sync your assignments.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {message && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-200"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
              }`}
              role="alert"
            >
              {message.text}
            </div>
          )}

          <div>
            <label
              htmlFor="canvas-token"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Canvas API token
            </label>
            {state?.hasCanvas && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Connected. Enter a new token to replace.
              </p>
            )}
            <input
              id="canvas-token"
              type="password"
              value={canvasToken}
              onChange={(e) => setCanvasToken(e.target.value)}
              placeholder={state?.hasCanvas ? "••••••••" : "Paste your Canvas API token"}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="gradescope-ics"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Gradescope calendar (ICS) URL
            </label>
            {state?.hasGradescope && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Connected. Enter a new URL to replace.
              </p>
            )}
            <input
              id="gradescope-ics"
              type="url"
              value={gradescopeIcsUrl}
              onChange={(e) => setGradescopeIcsUrl(e.target.value)}
              placeholder="https://…"
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}

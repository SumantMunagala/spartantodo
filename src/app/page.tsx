"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

const SJSU_EMAIL_DOMAIN = "@sjsu.edu";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LandingPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (signInError) {
        console.error(signInError);
        setIsLoading(false);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center px-4 py-24 text-center sm:py-32">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            Never miss a deadline again.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            Sync Canvas and Gradescope in one place. All your assignments for
            SJSU in a single dashboard.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            {error === "non_sjsu" && (
              <div
                className="w-full max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                role="alert"
              >
                Please use your SJSU Google account ({SJSU_EMAIL_DOMAIN}) to
                sign in.
              </div>
            )}
            {error === "auth_failed" && (
              <div
                className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
                role="alert"
              >
                Sign-in failed. Please try again.
              </div>
            )}
            <button
              type="button"
              onClick={handleSignInWithGoogle}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isLoading ? (
                "Redirecting…"
              ) : (
                <>
                  <GoogleIcon />
                  Sign in with Google
                </>
              )}
            </button>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              For SJSU students only • {SJSU_EMAIL_DOMAIN}
            </p>
          </div>
        </section>

        {/* How it works / Sync section */}
        <section className="border-t border-zinc-200 bg-white px-4 py-16 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Sync your classes
            </h2>
            <p className="mt-3 text-center text-zinc-600 dark:text-zinc-400">
              Connect Canvas and Gradescope. See every deadline on one calendar
              — no more switching between tabs.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">Canvas</span>
              <span className="font-medium">Gradescope</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 px-4 py-6 dark:border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            SpartanTodo
          </span>
          <span>·</span>
          <span>For SJSU students</span>
        </div>
      </footer>
    </div>
  );
}

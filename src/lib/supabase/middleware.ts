import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase env vars missing; auth middleware skipping.");
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    // Refresh session if expired; validates JWT
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isAuthCallback = pathname.startsWith("/api/auth/callback");
    const isLanding = pathname === "/";
    const isLoginPage = pathname === "/login";
    const isDashboard = pathname.startsWith("/dashboard");

    if (isAuthCallback) {
      return supabaseResponse;
    }

    // /login → redirect to landing
    if (isLoginPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Landing (/): if signed in, go to dashboard
    if (isLanding && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isLanding) {
      return supabaseResponse;
    }

    // Protected routes (/dashboard, etc.): require auth
    if (isDashboard && !user) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return supabaseResponse;
  } catch (err) {
    console.error("Auth middleware error:", err);
    return NextResponse.next({ request });
  }
}

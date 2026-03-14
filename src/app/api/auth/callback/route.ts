import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SJSU_EMAIL_DOMAIN = "@sjsu.edu";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", requestUrl.origin)
    );
  }

  const user = data?.user;
  const email = user?.email?.toLowerCase() ?? "";

  if (!email.endsWith(SJSU_EMAIL_DOMAIN)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=non_sjsu", requestUrl.origin)
    );
  }

  return NextResponse.redirect(requestUrl.origin);
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Google OAuth callback handler.
 *
 * Supabase uses PKCE flow: after the user authenticates with Google, Supabase
 * redirects here with a one-time `code` query parameter.  We exchange that
 * code for a session, then verify the user is on the whitelist before
 * forwarding them to their destination.
 *
 * Whitelist check:
 *   After the session is created, `auth.uid()` is set, so the RLS policy
 *   "users_select_self" allows us to query `public.users` with the anon key.
 *   If no matching row exists the user is not pre-approved — we sign them out
 *   and redirect to /login with an error flag.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` lets the login page encode where the user was trying to go.
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    // No code — something went wrong before we were called.
    const url = new URL("/login", origin);
    url.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();

  // Exchange the one-time code for a persistent session.
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(url);
  }

  // At this point auth.uid() is valid.  Check the whitelist.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(url);
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!appUser) {
    const userEmail = user.email?.trim().toLowerCase();

    if (!userEmail) {
      await supabase.auth.signOut();
      const url = new URL("/login", origin);
      url.searchParams.set("error", "not_invited");
      return NextResponse.redirect(url);
    }

    const { data: invite } = await supabase
      .from("student_invites")
      .select("email, name, group_id")
      .ilike("email", userEmail)
      .maybeSingle();

    if (!invite) {
      await supabase.auth.signOut();
      const url = new URL("/login", origin);
      url.searchParams.set("error", "not_invited");
      return NextResponse.redirect(url);
    }

    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      email: userEmail,
      name:
        (invite.name as string | null) ||
        (user.user_metadata?.full_name as string | undefined) ||
        "",
      role: "user",
      group_id: invite.group_id as string,
    });

    if (insertError) {
      await supabase.auth.signOut();
      const url = new URL("/login", origin);
      url.searchParams.set("error", "auth_failed");
      return NextResponse.redirect(url);
    }

    await supabase.from("student_invites").delete().ilike("email", userEmail);
  }

  // Whitelist confirmed.  Forward to intended destination.
  // Sanitise `next` to prevent open-redirect attacks — only allow relative paths.
  const safeNext = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(new URL(safeNext, origin));
}

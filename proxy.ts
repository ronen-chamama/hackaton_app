import { NextResponse, type NextRequest } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy";
import type { UserRole } from "@/lib/types";

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

/** Routes that never require authentication. */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/callback/"];

/** Path prefix for admin-only routes. */
const ADMIN_PATH_PREFIX = "/admin";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "?")
  );
}

function isAdminPath(pathname: string): boolean {
  return (
    pathname === ADMIN_PATH_PREFIX ||
    pathname.startsWith(ADMIN_PATH_PREFIX + "/")
  );
}

function canAccessAdmin(role: UserRole): boolean {
  return role === "admin" || role === "super-admin";
}

// ---------------------------------------------------------------------------
// Proxy (formerly middleware)
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Step 1: Create the proxy client.
  // Session cookies are refreshed as a side effect when Supabase rotates tokens.
  const { supabase, getResponse } = createProxyClient(request);

  // Step 2: Public routes — refresh cookies, allow through immediately.
  if (isPublicPath(pathname)) {
    // If the user is already authenticated, bounce them away from /login.
    if (pathname === "/login") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return getResponse();
  }

  // Step 3: Validate the session.
  // auth.getUser() performs server-side JWT validation (not a local cookie read).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No valid session — redirect to login, preserving the intended destination.
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Step 4: Whitelist check.
  // Query public.users to confirm this auth user is pre-approved.
  // The RLS policy "users_select_self" (auth.uid() = id) allows this query
  // with the anon key while the session is active.
  const { data: appUser, error: userError } = await supabase
    .from("users")
    .select("id, role, group_id")
    .eq("id", user.id)
    .single();

  if (userError || !appUser) {
    if (userError) {
      console.error("[AUTH GATE ERROR] users lookup failed in proxy", {
        userId: user.id,
        error: userError,
      });
    } else {
      console.error("[AUTH GATE ERROR] Authenticated user missing in users table", {
        userId: user.id,
      });
    }

    // Authenticated with Google but not in the whitelist.
    // Sign out so they are not stuck in a broken session loop.
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "unauthorized");
    if (userError?.message) {
      loginUrl.searchParams.set("error_description", userError.message);
    }
    return NextResponse.redirect(loginUrl);
  }

  const role = appUser.role as UserRole;

  // Step 5: Admin-route guard.
  if (isAdminPath(pathname) && !canAccessAdmin(role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Step 6: Stamp user identity onto request headers.
  // Server Component layouts read these via headers() instead of re-querying.
  const response = getResponse();
  response.headers.set("x-user-id", appUser.id as string);
  response.headers.set("x-user-role", role);
  response.headers.set("x-user-group", (appUser.group_id as string) ?? "");

  return response;
}

// ---------------------------------------------------------------------------
// Matcher — run on every route except static assets.
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

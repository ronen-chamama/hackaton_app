import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase server client suitable for use inside the Next.js proxy
 * (formerly "middleware").
 *
 * Returns:
 *   - `supabase`: the client (call auth.getUser() on it after this)
 *   - `getResponse`: call this AFTER any auth operations to get the response
 *     object with fully refreshed session cookies baked in.
 *
 * The response reference is mutated internally when Supabase needs to rotate
 * tokens, so always retrieve it via `getResponse()` rather than capturing the
 * initial value.
 */
export function createProxyClient(request: NextRequest): {
  supabase: SupabaseClient;
  getResponse: () => NextResponse;
} {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror cookies onto the request so downstream proxy code can read them.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Rebuild the response so the rotated session cookie reaches the browser.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, getResponse: () => response };
}

import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in browser (Client Components).
 * Call this once per component — it is safe to call on every render
 * because @supabase/ssr deduplicates the underlying GoTrue client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

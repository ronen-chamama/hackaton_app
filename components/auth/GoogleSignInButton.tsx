"use client";

import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

interface Props {
  /** Where to send the user after a successful login. */
  next?: string;
}

/**
 * Triggers the Google OAuth flow via Supabase.
 * Must be a Client Component because it needs the browser Supabase client
 * and `window.location.origin` to build the callback URL.
 */
export function GoogleSignInButton({ next = "/" }: Props) {
  async function handleSignIn() {
    const supabase = createClient();

    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (next && next !== "/") {
      redirectTo.searchParams.set("next", next);
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
      },
    });
  }

  return (
    <button
      onClick={handleSignIn}
      type="button"
      className="flex items-center justify-center gap-3 w-full rounded-lg border border-border bg-surface-raised px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      {/* Google "G" SVG logo — inline to avoid an external image dependency */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        aria-hidden="true"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
          fill="#34A853"
        />
        <path
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
          fill="#EA4335"
        />
      </svg>
      {t("loginWithGoogle")}
    </button>
  );
}

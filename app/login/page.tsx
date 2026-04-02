import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { t } from "@/lib/i18n";

/**
 * Login page.
 *
 * Public route — no auth required.
 * Middleware redirects already-authenticated users away from this page.
 *
 * Query params:
 *   ?error=unauthorized  → email not on the whitelist
 *   ?error=auth_failed   → OAuth exchange failed
 *   ?next=/some/path     → where to go after login
 */
interface SearchParams {
  error?: string;
  next?: string;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { error, next } = await searchParams;

  const errorMessage =
    error === "not_invited"
      ? t("notInvitedError")
      : error === "unauthorized"
      ? t("errorUnauthorizedEmail")
      : error === "auth_failed"
        ? t("errorAuthFailed")
        : null;

  return (
    <main className="flex min-h-full flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8">
        {/* App name */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t("appName")}
          </h1>
          <p className="text-sm text-foreground/60">{t("loginPageSubtitle")}</p>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {errorMessage}
          </div>
        )}

        {/* Sign-in card */}
        <div className="rounded-xl border border-border bg-surface-raised p-6 shadow-sm space-y-4">
          <p className="text-center text-sm font-medium text-foreground">
            {t("loginPageTitle")}
          </p>
          <GoogleSignInButton next={next} />
        </div>
      </div>
    </main>
  );
}

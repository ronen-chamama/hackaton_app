import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

interface SearchParams {
  error?: string;
  error_description?: string;
  next?: string;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { error, error_description, next } = await searchParams;
  const supabase = await createClient();

  const { data: loginSettings, error: loginSettingsError } = await supabase
    .from("login_settings")
    .select("message, image_url")
    .eq("id", 1)
    .maybeSingle();

  if (loginSettingsError) {
    console.error("Failed to fetch login settings:", loginSettingsError);
  }

  const customMessage =
    loginSettings && typeof loginSettings.message === "string"
      ? loginSettings.message.trim()
      : "";
  const customImageUrl =
    loginSettings && typeof loginSettings.image_url === "string"
      ? loginSettings.image_url
      : "";

  const knownErrorMessage =
    error === "not_invited"
      ? t("notInvitedError")
      : error === "unauthorized"
        ? t("errorUnauthorizedEmail")
        : error === "auth_failed"
          ? t("errorAuthFailed")
          : null;

  const developerError =
    typeof error_description === "string" ? error_description.trim() : "";

  const errorMessage =
    knownErrorMessage ??
    (typeof error === "string" && error.trim().length > 0 ? error : null) ??
    (developerError ? t("errorAuthFailed") : null);

  return (
    <main className="flex h-screen w-full flex-col md:flex-row">
      <section className="flex h-full w-full flex-col items-center justify-center bg-white p-8 md:w-1/2">
        <div className="w-full max-w-md text-center">
          <img
            src="/chamama_logo.webp"
            alt={t("appName")}
            className="mx-auto mb-6 w-48"
          />

          <p className="mb-6 text-base leading-relaxed text-foreground">
            {customMessage || t("loginPageSubtitle")}
          </p>

          {(errorMessage || developerError) && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {errorMessage ? <p>{errorMessage}</p> : null}
              {developerError ? (
                <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-danger/10 p-2 text-xs">
                  {developerError}
                </pre>
              ) : null}
            </div>
          )}

          <GoogleSignInButton next={next} />

          <p className="mt-8 text-sm text-gray-500">{t("loginHelpText")}</p>
        </div>
      </section>

      <section className="relative hidden h-screen w-1/2 overflow-hidden bg-black md:block">
        {customImageUrl ? (
          <img
            src={customImageUrl}
            alt={t("loginImageLabel")}
            className="absolute inset-0 m-auto h-full w-auto max-w-none object-contain"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-gray-800" />
        )}
      </section>
    </main>
  );
}

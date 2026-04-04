import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getErrorDescription(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const maybeError = error as Record<string, unknown>;
    const code = typeof maybeError.code === "string" ? maybeError.code : "";
    const message = typeof maybeError.message === "string" ? maybeError.message : "";
    const status =
      typeof maybeError.status === "number" || typeof maybeError.status === "string"
        ? String(maybeError.status)
        : "";

    const details = [code, message, status].filter(Boolean).join(" | ");
    if (details) {
      return details;
    }

    try {
      return JSON.stringify(maybeError);
    } catch {
      return fallback;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallback;
}

function redirectToLogin(
  origin: string,
  next: string,
  errorCode: string,
  errorDescription?: string
) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", errorCode);

  if (next.startsWith("/")) {
    url.searchParams.set("next", next);
  }

  const detail = errorDescription?.trim();
  if (detail) {
    url.searchParams.set("error_description", detail.slice(0, 1000));
  }

  return NextResponse.redirect(url);
}

function createServiceRoleClientOrNull() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSuperAdminEmailSet(): Set<string> {
  const rawValue = process.env.SUPER_ADMIN_EMAILS ?? "";
  return new Set(
    rawValue
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getPostLoginPath(role: string, next: string): string {
  if (role === "admin" || role === "super-admin") {
    return "/admin";
  }

  return next.startsWith("/") ? next : "/";
}

/**
 * Google OAuth callback handler.
 *
 * Supabase uses PKCE flow: after the user authenticates with Google, Supabase
 * redirects here with a one-time `code` query parameter. We exchange that
 * code for a session, then verify the user is approved before forwarding.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    console.error("[AUTH ERROR] Missing OAuth code in callback", { url: request.url });
    return redirectToLogin(origin, next, "auth_failed", "missing_oauth_code");
  }

  const supabase = await createClient();
  const serviceRoleClient = createServiceRoleClientOrNull();
  const dataClient = serviceRoleClient ?? supabase;

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("[AUTH ERROR] exchangeCodeForSession failed", exchangeError);
    return redirectToLogin(
      origin,
      next,
      "auth_failed",
      getErrorDescription(exchangeError, "oauth_exchange_failed")
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[AUTH ERROR] auth.getUser failed after exchange", {
      error: userError,
      hasUser: Boolean(user),
    });
    return redirectToLogin(
      origin,
      next,
      "auth_failed",
      getErrorDescription(userError, "missing_authenticated_user")
    );
  }

  const userEmail = user.email?.trim().toLowerCase();
  if (!userEmail) {
    console.error("[AUTH ERROR] Authenticated user has no email", { userId: user.id });
    await supabase.auth.signOut();
    return redirectToLogin(origin, next, "not_invited", "authenticated_user_missing_email");
  }

  const superAdminEmails = getSuperAdminEmailSet();
  const isSuperAdminBootstrap = superAdminEmails.has(userEmail);

  if (isSuperAdminBootstrap) {
    const { data: existingSuperAdminRow, error: existingSuperAdminRowError } = await dataClient
      .from("users")
      .select("id, name, group_id, home_group")
      .eq("email", userEmail)
      .limit(1)
      .maybeSingle();

    if (existingSuperAdminRowError) {
      console.error("[AUTH ERROR] super-admin bootstrap lookup failed", {
        email: userEmail,
        userId: user.id,
        error: existingSuperAdminRowError,
        usingServiceRole: Boolean(serviceRoleClient),
      });
      await supabase.auth.signOut();
      return redirectToLogin(
        origin,
        next,
        "auth_failed",
        getErrorDescription(existingSuperAdminRowError, "super_admin_lookup_failed")
      );
    }

    const existingRow = (existingSuperAdminRow ?? {}) as Record<string, unknown>;
    const targetRowId = typeof existingRow.id === "string" ? existingRow.id : null;
    const existingName = typeof existingRow.name === "string" ? existingRow.name : "";
    const existingGroupId =
      typeof existingRow.group_id === "string" && existingRow.group_id ? existingRow.group_id : null;
    const existingHomeGroup =
      typeof existingRow.home_group === "string" && existingRow.home_group ? existingRow.home_group : null;

    const superAdminPayload = {
      id: user.id,
      email: userEmail,
      name: existingName || (user.user_metadata?.full_name as string | undefined) || userEmail,
      role: "super-admin",
      group_id: existingGroupId,
      home_group: existingHomeGroup,
    };

    if (targetRowId && targetRowId !== user.id) {
      const { error: migrateIdError } = await dataClient
        .from("users")
        .update({ id: user.id })
        .eq("id", targetRowId);

      if (migrateIdError) {
        console.error("[AUTH ERROR] super-admin bootstrap ID migration failed", {
          email: userEmail,
          userId: user.id,
          targetRowId,
          error: migrateIdError,
          usingServiceRole: Boolean(serviceRoleClient),
        });
        await supabase.auth.signOut();
        return redirectToLogin(
          origin,
          next,
          "auth_failed",
          getErrorDescription(migrateIdError, "super_admin_id_migration_failed")
        );
      }
    }

    const { data: syncedSuperAdminRow, error: superAdminSyncError } = await dataClient
      .from("users")
      .upsert(superAdminPayload, { onConflict: "id" })
      .select("id")
      .maybeSingle();

    if (superAdminSyncError || !syncedSuperAdminRow) {
      console.error("[AUTH ERROR] super-admin bootstrap sync failed", {
        email: userEmail,
        userId: user.id,
        payload: superAdminPayload,
        targetRowId,
        error: superAdminSyncError,
        usingServiceRole: Boolean(serviceRoleClient),
      });
      await supabase.auth.signOut();
      return redirectToLogin(
        origin,
        next,
        "auth_failed",
        getErrorDescription(superAdminSyncError, "super_admin_sync_failed")
      );
    }

    const postLoginPath = getPostLoginPath("super-admin", next);
    return NextResponse.redirect(new URL(postLoginPath, origin));
  }

  const { data: preProvisionedUser, error: preProvisionedUserError } = await dataClient
    .from("users")
    .select("id, email, name, role, group_id, home_group")
    .eq("email", userEmail)
    .limit(1)
    .maybeSingle();

  if (preProvisionedUserError) {
    console.error("[AUTH ERROR] users email lookup failed during callback sync", {
      email: userEmail,
      userId: user.id,
      error: preProvisionedUserError,
      usingServiceRole: Boolean(serviceRoleClient),
    });
    await supabase.auth.signOut();
    return redirectToLogin(
      origin,
      next,
      "auth_failed",
      getErrorDescription(preProvisionedUserError, "users_lookup_failed")
    );
  }

  if (!preProvisionedUser) {
    console.error("[AUTH ERROR] Pre-provisioned user not found for authenticated email", {
      email: userEmail,
      userId: user.id,
    });
    await supabase.auth.signOut();
    return redirectToLogin(origin, next, "not_invited", `preprovisioned_user_not_found:${userEmail}`);
  }

  const usersRow = preProvisionedUser as Record<string, unknown>;
  const existingId = typeof usersRow.id === "string" ? usersRow.id : user.id;
  const existingRole = typeof usersRow.role === "string" ? usersRow.role : "user";
  const existingName = typeof usersRow.name === "string" ? usersRow.name : "";
  const existingGroupId =
    typeof usersRow.group_id === "string" && usersRow.group_id ? usersRow.group_id : null;
  const existingHomeGroup =
    typeof usersRow.home_group === "string" && usersRow.home_group ? usersRow.home_group : null;

  const resolvedRole =
    existingRole === "super-admin"
      ? "super-admin"
      : existingRole === "admin"
        ? "admin"
        : existingRole || "user";
  const resolvedName =
    existingName ||
    (user.user_metadata?.full_name as string | undefined) ||
    userEmail ||
    "";

  const resolvedGroupId = existingGroupId;
  const resolvedHomeGroup = existingHomeGroup;

  const userPayload = {
    id: user.id,
    email: userEmail,
    name: resolvedName,
    role: resolvedRole,
    group_id: resolvedGroupId,
    home_group: resolvedHomeGroup,
  };

  const { data: syncedRow, error: syncError } = await dataClient
    .from("users")
    .update(userPayload)
    .eq("id", existingId)
    .select("id")
    .maybeSingle();

  if (syncError || !syncedRow) {
    console.error("[AUTH ERROR] Failed syncing pre-provisioned users row during callback", {
      userId: user.id,
      email: userEmail,
      payload: userPayload,
      existingId,
      usingServiceRole: Boolean(serviceRoleClient),
      error: syncError,
      syncedRow,
    });
    await supabase.auth.signOut();
    return redirectToLogin(
      origin,
      next,
      "auth_failed",
      getErrorDescription(syncError, "preprovision_sync_failed")
    );
  }

  const postLoginPath = getPostLoginPath(resolvedRole, next);
  return NextResponse.redirect(new URL(postLoginPath, origin));
}

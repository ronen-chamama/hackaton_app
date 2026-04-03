"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RuntimeHeader } from "@/components/runtime/Header";
import { StageNav } from "@/components/runtime/StageNav";
import { StageRenderer } from "@/components/runtime/StageRenderer";
import { t } from "@/lib/i18n";
import { subscribeToGroupValues } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import type { GroupValue, GroupValueMap, Hackathon } from "@/lib/types";

function toGroupValueMap(rows: GroupValue[]): GroupValueMap {
  return rows.reduce<GroupValueMap>((acc, row) => {
    acc[row.element_id] = row;
    return acc;
  }, {});
}

export default function StudentRuntimePage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const previewHackathonId = (searchParams.get("preview") ?? "").trim();
  const inspectGroupId = (searchParams.get("group") ?? "").trim();
  const isPreviewMode = previewHackathonId.length > 0;

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeHackathon, setActiveHackathon] = useState<Hackathon | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [groupValues, setGroupValues] = useState<GroupValueMap>({});
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // ---------------------------------------------------------------------------
  // Group name save — called by RuntimeHeader after its 600 ms debounce.
  // Updates the groups table and syncs local state on success.
  // ---------------------------------------------------------------------------
  const handleGroupNameSave = useCallback(
    async (name: string) => {
      if (!groupId) {
        return;
      }
      const { error } = await supabase
        .from("groups")
        .update({ name })
        .eq("id", groupId);
      if (error) {
        console.error("Failed to save group name:", error);
        return;
      }
      // Sync page state so that a fresh re-mount or navigation shows the new name.
      setGroupName(name);
    },
    [groupId, supabase]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRuntime() {
      try {
        setIsLoading(true);
        setHasError(false);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw authError ?? new Error("No authenticated user");
        }
        setUserId(user.id);

        const { data: appUser, error: appUserError } = await supabase
          .from("users")
          .select("group_id, role")
          .eq("id", user.id)
          .single();

        if (appUserError) {
          throw appUserError;
        }

        const userGroupId = (appUser?.group_id as string | null) ?? null;
        const userRole = (appUser?.role as string | null) ?? "user";
        const effectiveGroupId =
          userRole === "admin" && inspectGroupId ? inspectGroupId : userGroupId;

        if (!effectiveGroupId && !previewHackathonId && userRole !== "admin") {
          throw new Error("Missing group_id");
        }

        let hackathonQuery = supabase
          .from("hackathons")
          .select("id, title, definition, is_active, theme")
          .limit(1);

        if (isPreviewMode) {
          hackathonQuery = hackathonQuery.eq("id", previewHackathonId);
        } else {
          hackathonQuery = hackathonQuery.eq("is_active", true).eq("is_published", true);
        }

        const { data: hackathon, error: hackathonError } = await hackathonQuery.maybeSingle();

        if (hackathonError) {
          throw hackathonError;
        }

        let nextGroupName = "";
        let nextGroupMembers: Array<{ id: string; name: string }> = [];

        if (effectiveGroupId) {
          const [{ data: groupRow }, { data: membersRows }] = await Promise.all([
            supabase.from("groups").select("name").eq("id", effectiveGroupId).maybeSingle(),
            supabase
              .from("users")
              .select("id, name")
              .eq("group_id", effectiveGroupId)
              .order("name"),
          ]);

          nextGroupName = (groupRow?.name as string | null) ?? "";
          nextGroupMembers = (membersRows as Array<{ id: string; name: string }> | null) ?? [];
        }

        if (cancelled) {
          return;
        }

        setGroupId(effectiveGroupId);
        setGroupName(nextGroupName);
        setGroupMembers(nextGroupMembers);

        if (!hackathon) {
          setActiveHackathon(null);
          setGroupValues({});
          setCurrentStageIndex(0);
          return;
        }

        const typedHackathon = hackathon as Hackathon;

        if (!effectiveGroupId) {
          setActiveHackathon(typedHackathon);
          setGroupValues({});
          setCurrentStageIndex(0);
          return;
        }

        const { data: valuesRows, error: valuesError } = await supabase
          .from("group_values")
          .select("id, hackathon_id, group_id, element_id, value, updated_at, updated_by")
          .eq("group_id", effectiveGroupId)
          .eq("hackathon_id", typedHackathon.id);

        if (valuesError) {
          throw valuesError;
        }

        if (cancelled) {
          return;
        }

        setActiveHackathon(typedHackathon);
        setGroupValues(toGroupValueMap((valuesRows as GroupValue[] | null) ?? []));
        setCurrentStageIndex(0);
      } catch (err) {
        console.error("Runtime load error:", err);
        if (!cancelled) {
          setHasError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRuntime();

    return () => {
      cancelled = true;
    };
  }, [inspectGroupId, isPreviewMode, previewHackathonId, supabase]);

  useEffect(() => {
    if (!groupId || !activeHackathon) {
      return;
    }

    const channel = subscribeToGroupValues({
      supabase,
      groupId,
      hackathonId: activeHackathon.id,
      onChange: (row, eventType) => {
        // Keep local state in sync immediately when realtime payloads arrive.
        setGroupValues((prev) => {
          if (eventType === "DELETE") {
            const next = { ...prev };
            delete next[row.element_id];
            return next;
          }
          return {
            ...prev,
            [row.element_id]: row,
          };
        });
      },
    });

    return () => {
      void channel.unsubscribe();
    };
  }, [activeHackathon, groupId, supabase]);

  const stages = activeHackathon?.definition?.stages ?? [];
  const stageCount = stages.length;
  const boundedStageIndex = Math.min(currentStageIndex, Math.max(stageCount - 1, 0));
  const currentStage = stages[boundedStageIndex] ?? null;

  if (isLoading) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center p-8">
        <p className="text-sm text-foreground/70">{t("loading")}</p>
      </main>
    );
  }

  if (hasError) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center p-8">
        <p className="text-sm text-danger">{t("errorGeneric")}</p>
      </main>
    );
  }

  if (!activeHackathon) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center p-8">
        <div className="max-w-xl rounded-xl border border-border bg-surface-raised p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-foreground">{t("noActiveHackathon")}</p>
        </div>
      </main>
    );
  }

  const themeName = (activeHackathon.definition.themeName ?? "simple") as string;

  return (
    <main data-theme={themeName} className="min-h-full flex-1">
      {/* Boxed inner wrapper — theme background fills full-bleed, content is centered */}
      <div className="mx-auto w-full max-w-5xl px-4 py-4 md:px-6 md:py-6 flex flex-col gap-4">
        <RuntimeHeader
          title={activeHackathon.definition.title || activeHackathon.title}
          slogan={activeHackathon.definition.slogan}
          description={activeHackathon.definition.description}
          groupName={groupName}
          groupMembers={groupMembers}
          onGroupNameSave={handleGroupNameSave}
        />

        <StageNav
          stages={stages}
          currentStageId={currentStage?.id ?? null}
          onSelect={(stageId) => {
            const targetIndex = stages.findIndex((stage) => stage.id === stageId);
            if (targetIndex >= 0) {
              setCurrentStageIndex(targetIndex);
            }
          }}
        />

        <StageRenderer
          stage={currentStage}
          groupValues={groupValues}
          hackathonId={activeHackathon.id}
          groupId={groupId}
          userId={userId}
          onValueSaved={(saved) => {
            setGroupValues((prev) => ({
              ...prev,
              [saved.element_id]: saved,
            }));
          }}
        />

        <footer className="mt-auto flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised p-3 shadow-sm">
          <button
            type="button"
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setCurrentStageIndex((prev) => Math.max(prev - 1, 0))}
            disabled={boundedStageIndex <= 0}
          >
            {t("prevStage")}
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setCurrentStageIndex((prev) => Math.min(prev + 1, stageCount - 1))}
            disabled={boundedStageIndex >= stageCount - 1}
          >
            {t("nextStage")}
          </button>
        </footer>
      </div>
    </main>
  );
}

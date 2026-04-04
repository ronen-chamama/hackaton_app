"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { RuntimeHeader } from "@/components/runtime/Header";
import { StageNav } from "@/components/runtime/StageNav";
import { StageRenderer } from "@/components/runtime/StageRenderer";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { resolveEnabledThemeName } from "@/lib/themes";
import type { GroupValue, GroupValueMap, Hackathon } from "@/lib/types";

function toGroupValueMap(rows: GroupValue[]): GroupValueMap {
  return rows.reduce<GroupValueMap>((acc, row) => {
    acc[row.element_id] = row;
    return acc;
  }, {});
}

function StudentRuntimeContent() {
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
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [groupValues, setGroupValues] = useState<GroupValueMap>({});
  const [lockedFields, setLockedFields] = useState<Record<string, string>>({});
  const [lockStateGroupId, setLockStateGroupId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [activeField, setActiveField] = useState<string | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isUnassignedToGroup, setIsUnassignedToGroup] = useState(false);
  const roomRef = useRef<RealtimeChannel | null>(null);

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
        setIsUnassignedToGroup(false);

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
          .select("group_id, role, name")
          .eq("id", user.id)
          .single();

        if (appUserError) {
          throw appUserError;
        }

        const userGroupId = (appUser?.group_id as string | null) ?? null;
        const userRole = (appUser?.role as string | null) ?? "user";
        const resolvedUserName =
          (appUser?.name as string | null)?.trim() ||
          user.user_metadata?.full_name ||
          user.email ||
          "";
        setCurrentUserName(resolvedUserName);
        const isPrivilegedUser = userRole === "admin" || userRole === "super-admin";
        const effectiveGroupId =
          isPrivilegedUser && inspectGroupId ? inspectGroupId : userGroupId;

        if (!effectiveGroupId && !previewHackathonId && !isPrivilegedUser) {
          if (cancelled) {
            return;
          }

          setGroupId(null);
          setGroupName("");
          setGroupMembers([]);
          setGroupValues({});
          setActiveHackathon(null);
          setCurrentStageIndex(0);
          setIsUnassignedToGroup(true);
          return;
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
        let nextGroupMembers: string[] = [];

        if (effectiveGroupId) {
          const [{ data: groupRow }, { data: usersRows }] = await Promise.all([
            supabase.from("groups").select("id, name").eq("id", effectiveGroupId).maybeSingle(),
            supabase
              .from("users")
              .select("name")
              .eq("group_id", effectiveGroupId)
              .order("name"),
          ]);

          const groupRecord = (groupRow as Record<string, unknown> | null) ?? null;
          const groupNameFromName =
            groupRecord && typeof groupRecord.name === "string" ? groupRecord.name.trim() : "";
          const groupNameFromId =
            groupRecord && typeof groupRecord.id === "string" ? groupRecord.id : "";
          nextGroupName = groupNameFromName || groupNameFromId || effectiveGroupId;

          const namesFromUsers = ((usersRows as Array<{ name: string | null }> | null) ?? [])
            .map((row) => (typeof row.name === "string" ? row.name.trim() : ""))
            .filter(Boolean);
          nextGroupMembers = Array.from(new Set(namesFromUsers));
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

        const { data: protocolRow, error: protocolLookupError } = await supabase
          .from("hackathon_protocols")
          .select("id")
          .eq("hackathon_id", typedHackathon.id)
          .eq("group_id", effectiveGroupId)
          .maybeSingle();

        if (protocolLookupError) {
          throw protocolLookupError;
        }

        if (!protocolRow) {
          const { error: protocolInsertError } = await supabase
            .from("hackathon_protocols")
            .insert({
              hackathon_id: typedHackathon.id,
              group_id: effectiveGroupId,
            });

          const duplicateKeyCode = "23505";
          if (
            protocolInsertError &&
            protocolInsertError.code !== duplicateKeyCode
          ) {
            throw protocolInsertError;
          }
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
      roomRef.current = null;
      return;
    }

    const room = supabase.channel(`group_room_${groupId}`, {
      config: {
        presence: {
          key: userId || `${groupId}-presence`,
        },
      },
    });
    roomRef.current = room;

    const applyGroupValueChange = (
      payload: RealtimePostgresChangesPayload<GroupValue>,
      eventType: "INSERT" | "UPDATE" | "DELETE"
    ) => {
      const row =
        eventType === "DELETE"
          ? (payload.old as GroupValue)
          : (payload.new as GroupValue);

      if (!row || row.hackathon_id !== activeHackathon.id) {
        return;
      }

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
    };

    room
      .on("presence", { event: "sync" }, () => {
        const presenceState = room.presenceState<{
          fieldName?: string;
          userName?: string;
        }>();

        const nextLockedFields: Record<string, string> = {};
        Object.values(presenceState).forEach((entries) => {
          const entry = entries[entries.length - 1];
          if (
            entry &&
            typeof entry.fieldName === "string" &&
            entry.fieldName &&
            typeof entry.userName === "string" &&
            entry.userName
          ) {
            nextLockedFields[entry.fieldName] = entry.userName;
          }
        });

        setLockedFields(nextLockedFields);
        setLockStateGroupId(groupId);
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "group_values",
          filter: `group_id=eq.${groupId}`,
        },
        (payload: RealtimePostgresChangesPayload<GroupValue>) => {
          applyGroupValueChange(payload, "UPDATE");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_values",
          filter: `group_id=eq.${groupId}`,
        },
        (payload: RealtimePostgresChangesPayload<GroupValue>) => {
          applyGroupValueChange(payload, "INSERT");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "group_values",
          filter: `group_id=eq.${groupId}`,
        },
        (payload: RealtimePostgresChangesPayload<GroupValue>) => {
          applyGroupValueChange(payload, "DELETE");
        }
      )
      .subscribe();

    return () => {
      roomRef.current = null;
      setActiveField(null);
      void supabase.removeChannel(room);
    };
  }, [activeHackathon, groupId, supabase, userId]);

  const handleFieldFocus = useCallback((fieldName: string) => {
    setActiveField(fieldName);
  }, []);

  const handleFieldBlur = useCallback(() => {
    setActiveField(null);
  }, []);

  useEffect(() => {
    const room = roomRef.current;
    const editorName = currentUserName || userId || "";
    if (!room || !editorName) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void room.track({
        fieldName: activeField,
        userName: editorName,
      });
    }, 150);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [activeField, currentUserName, userId, groupId, activeHackathon?.id]);

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

  if (isUnassignedToGroup) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center p-8">
        <div className="max-w-xl rounded-xl border border-border bg-surface-raised p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-foreground">{t("notAssignedToGroup")}</p>
        </div>
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

  const themeName = resolveEnabledThemeName(
    typeof activeHackathon.definition?.themeName === "string"
      ? activeHackathon.definition.themeName
      : undefined
  );

  return (
    <main data-theme={themeName} className="min-h-full flex-1">
      {/* Boxed inner wrapper — theme background fills full-bleed, content is centered */}
      <div className="mx-auto w-full max-w-5xl px-4 py-4 md:px-6 md:py-6 flex flex-col gap-4">
        <RuntimeHeader
          key={`${activeHackathon.id}:${groupId ?? "no-group"}`}
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
          lockedFields={lockStateGroupId === groupId ? lockedFields : {}}
          currentUserName={currentUserName}
          onFieldFocus={handleFieldFocus}
          onFieldBlur={handleFieldBlur}
          groupMembers={groupMembers}
          groupName={groupName}
          hackathonName={activeHackathon.definition.title || activeHackathon.title}
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

export default function StudentRuntimePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-full flex-1 items-center justify-center p-8">
          <p className="text-sm text-foreground/70">{t("loading")}</p>
        </main>
      }
    >
      <StudentRuntimeContent />
    </Suspense>
  );
}

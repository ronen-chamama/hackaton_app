"use client";

import { useEffect, useMemo, useState } from "react";
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

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeHackathon, setActiveHackathon] = useState<Hackathon | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupValues, setGroupValues] = useState<GroupValueMap>({});
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

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
          .select("group_id")
          .eq("id", user.id)
          .single();

        if (appUserError) {
          throw appUserError;
        }

        const userGroupId = (appUser?.group_id as string | null) ?? null;
        if (!userGroupId) {
          throw new Error("Missing group_id");
        }

        const { data: hackathon, error: hackathonError } = await supabase
          .from("hackathons")
          .select("id, title, definition, is_active, theme")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (hackathonError) {
          throw hackathonError;
        }

        const { data: groupRow } = await supabase
          .from("groups")
          .select("name")
          .eq("id", userGroupId)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        setGroupId(userGroupId);
        setGroupName((groupRow?.name as string | null) ?? "");

        if (!hackathon) {
          setActiveHackathon(null);
          setGroupValues({});
          setCurrentStageIndex(0);
          return;
        }

        const typedHackathon = hackathon as Hackathon;

        const { data: valuesRows, error: valuesError } = await supabase
          .from("group_values")
          .select(
            "id, hackathon_id, group_id, element_id, value, updated_at, updated_by"
          )
          .eq("group_id", userGroupId)
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
  }, [supabase]);

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
          <p className="text-lg font-semibold text-foreground">
            {t("noActiveHackathon")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-full flex-1 flex-col gap-4 p-4 md:p-6">
      <RuntimeHeader
        title={activeHackathon.definition.title || activeHackathon.title}
        slogan={activeHackathon.definition.slogan}
        description={activeHackathon.definition.description}
      />

      <section className="rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-sm">
        <p className="text-sm text-foreground/70">{t("groupName")}</p>
        <p className="mt-1 text-base font-medium text-foreground">{groupName}</p>
      </section>

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
          onClick={() =>
            setCurrentStageIndex((prev) => Math.min(prev + 1, stageCount - 1))
          }
          disabled={boundedStageIndex >= stageCount - 1}
        >
          {t("nextStage")}
        </button>
      </footer>
    </main>
  );
}

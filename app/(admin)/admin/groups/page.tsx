import { InstructionModal } from "@/components/admin/InstructionModal";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { RosterDashboard } from "@/components/roster/RosterDashboard";

export const dynamic = "force-dynamic";

interface GroupsPageProps {
  searchParams: Promise<{ imported?: string }>;
}

export default async function AdminGroupsPage({ searchParams }: GroupsPageProps) {
  await searchParams;
  const supabase = await createClient();

  const { data: activeHackathon } = await supabase
    .from("hackathons")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const [{ data: groups }, { data: users }] = await Promise.all([
    supabase.from("groups").select("*"),
    supabase
      .from("users")
      .select("id, email, name, role, group_id, home_group")
      .neq("role", "super-admin"),
  ]);

  const mappedGroups = (groups ?? []).map((group) => {
    const row = group as Record<string, unknown>;
    return {
      id: String(row.id),
      name: (typeof row.name === "string" && row.name) || t("groupName"),
    };
  });

  const studentsFromUsers = (users ?? []).map((user) => {
    const row = user as Record<string, unknown>;
    return {
      source: "user" as const,
      id: String(row.id),
      email: typeof row.email === "string" ? row.email : "",
      name: typeof row.name === "string" ? row.name : "",
      role: typeof row.role === "string" ? row.role : "user",
      group_id: typeof row.group_id === "string" ? row.group_id : null,
      home_group: typeof row.home_group === "string" ? row.home_group : null,
    };
  });

  return (
    <main className="space-y-4">
      <InstructionModal
        storageKey="hide_groups_intro"
        title={t("groupsIntroTitle")}
        content={t("groupsIntroText")}
      />

      <RosterDashboard
        initialGroups={mappedGroups}
        initialStudents={studentsFromUsers}
        activeHackathonId={(activeHackathon?.id as string | null) ?? null}
      />
    </main>
  );
}

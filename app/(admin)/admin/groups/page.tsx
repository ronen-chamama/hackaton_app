import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { importRosterCsv } from "@/lib/actions/roster";
import { RosterDashboard } from "@/components/roster/RosterDashboard";

export const dynamic = "force-dynamic";

interface GroupsPageProps {
  searchParams: Promise<{ imported?: string }>;
}

export default async function AdminGroupsPage({ searchParams }: GroupsPageProps) {
  const { imported } = await searchParams;
  const supabase = await createClient();

  const { data: activeHackathon } = await supabase
    .from("hackathons")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  let groupsQuery = supabase.from("groups").select("*");
  if (activeHackathon?.id) {
    groupsQuery = groupsQuery.eq("hackathon_id", activeHackathon.id);
  }

  const [{ data: groups }, { data: users }, { data: invites }] = await Promise.all([
    groupsQuery,
    supabase.from("users").select("*"),
    supabase.from("student_invites").select("*"),
  ]);

  const mappedGroups = (groups ?? []).map((group) => {
    const row = group as Record<string, unknown>;
    return {
      id: String(row.id),
      name:
        (typeof row.title === "string" && row.title) ||
        (typeof row.name === "string" && row.name) ||
        t("groupName"),
    };
  });

  const mappedUsers = (users ?? []).map((user) => {
    const row = user as Record<string, unknown>;
    return {
      id: String(row.id),
      email: typeof row.email === "string" ? row.email : "",
      name: typeof row.name === "string" ? row.name : "",
      role: typeof row.role === "string" ? row.role : "user",
      group_id: typeof row.group_id === "string" ? row.group_id : null,
      home_group: typeof row.home_group === "string" ? row.home_group : null,
    };
  });

  const mappedInvites = (invites ?? []).map((invite) => {
    const row = invite as Record<string, unknown>;
    return {
      email: typeof row.email === "string" ? row.email : "",
      name: typeof row.name === "string" ? row.name : "",
      role: typeof row.role === "string" ? row.role : "user",
      group_id: typeof row.group_id === "string" ? row.group_id : null,
      home_group: typeof row.home_group === "string" ? row.home_group : null,
    };
  });

  return (
    <main className="space-y-4">
      

      <RosterDashboard
        initialGroups={mappedGroups}
        initialUsers={mappedUsers}
        initialInvites={mappedInvites}
        activeHackathonId={(activeHackathon?.id as string | null) ?? null}
      />
    </main>
  );
}

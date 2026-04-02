import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface GroupsPageProps {
  searchParams: Promise<{ imported?: string }>;
}

type CsvInviteRow = {
  email: string;
  name: string;
  groupName: string;
};

function parseCsvRows(csvText: string): CsvInviteRow[] {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => line.split(",").map((cell) => cell.trim()))
    .map((cells) => ({
      email: (cells[0] ?? "").toLowerCase(),
      name: cells[1] ?? "",
      groupName: cells[2] ?? "",
    }))
    .filter((row) => row.email && row.groupName);
}

async function upsertGroupByTitle(
  actionClient: Awaited<ReturnType<typeof createClient>>,
  groupTitle: string
) {
  const { data: groupByTitle, error: titleError } = await actionClient
    .from("groups")
    .upsert(
      {
        title: groupTitle,
      },
      { onConflict: "title" }
    )
    .select("id")
    .single();

  if (!titleError && groupByTitle?.id) {
    return groupByTitle.id as string;
  }

  const { data: activeHackathon } = await actionClient
    .from("hackathons")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const fallbackPayload: Record<string, unknown> = {
    name: groupTitle,
  };

  if (activeHackathon?.id) {
    fallbackPayload.hackathon_id = activeHackathon.id;
  }

  const { data: groupByName, error: fallbackError } = await actionClient
    .from("groups")
    .upsert(fallbackPayload, { onConflict: "name" })
    .select("id")
    .single();

  if (fallbackError || !groupByName?.id) {
    throw fallbackError ?? new Error("Failed to upsert group");
  }

  return groupByName.id as string;
}

export default async function AdminGroupsPage({ searchParams }: GroupsPageProps) {
  const { imported } = await searchParams;
  const supabase = await createClient();

  async function importCsv(formData: FormData) {
    "use server";

    const actionClient = await createClient();

    const {
      data: { user },
    } = await actionClient.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: adminUser } = await actionClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (adminUser?.role !== "admin") {
      redirect("/");
    }

    const file = formData.get("csv");
    if (!(file instanceof File)) {
      return;
    }

    const csvText = await file.text();
    const rows = parseCsvRows(csvText);

    for (const row of rows) {
      const groupId = await upsertGroupByTitle(actionClient, row.groupName);

      await actionClient.from("student_invites").upsert(
        {
          email: row.email,
          name: row.name,
          group_id: groupId,
        },
        { onConflict: "email" }
      );
    }

    revalidatePath("/admin/groups");
    redirect("/admin/groups?imported=1");
  }

  const { data: groups } = await supabase.from("groups").select("*");

  return (
    <main className="space-y-4">
      <section className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{t("groups")}</h2>

        <form action={importCsv} className="mt-3 flex items-center gap-2">
          <input id="csv-file" name="csv" type="file" accept=".csv,text/csv" className="hidden" />
          <label
            htmlFor="csv-file"
            className="cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
          >
            {t("uploadCsv")}
          </label>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("save")}
          </button>
        </form>

        <p className="mt-2 text-xs text-foreground/70">email,name,group_name</p>

        {imported === "1" ? (
          <p className="mt-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            {t("importSuccess")}
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        {(groups ?? []).map((group) => {
          const row = group as Record<string, unknown>;
          const titleValue = typeof row.title === "string" ? row.title : "";
          const nameValue = typeof row.name === "string" ? row.name : "";
          const displayName = titleValue || nameValue || t("groupName");

          return (
            <article
              key={String(row.id)}
              className="rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-sm"
            >
              <p className="text-sm font-medium text-foreground">{displayName}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

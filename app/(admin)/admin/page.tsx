import Link from "next/link";
import { revalidatePath } from "next/cache";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HackathonRow = {
  id: string;
  title: string | null;
  is_active: boolean;
};

function buildDefaultDefinition(title: string) {
  return {
    id: "",
    title,
    slogan: "",
    description: "",
    theme: {
      fonts: {},
      colors: {},
      spacing: {},
      components: {},
    },
    is_active: false,
    stages: [],
  };
}

function buildDefaultTheme() {
  return {
    fonts: {},
    colors: {},
    spacing: {},
    components: {},
  };
}

export default async function AdminHackathonsPage() {
  const supabase = await createClient();

  async function createHackathon(formData: FormData) {
    "use server";

    const titleInput = String(formData.get("title") ?? "").trim();
    const title = titleInput || t("newHackathonDefaultTitle");

    const actionClient = await createClient();
    const { error } = await actionClient.from("hackathons").insert({
      title,
      is_active: false,
      definition: buildDefaultDefinition(title),
      theme: buildDefaultTheme(),
    });

    if (error) {
      console.error("Supabase Insert Error:", error);
    }

    revalidatePath("/admin", "layout");
  }

  async function deleteHackathon(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    if (!id) {
      return;
    }

    const actionClient = await createClient();
    await actionClient.from("hackathons").delete().eq("id", id);
    revalidatePath("/admin");
  }

  async function setActiveHackathon(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    if (!id) {
      return;
    }

    const actionClient = await createClient();
    // Step 1: clear all active flags so the partial unique index cannot conflict.
    await actionClient.from("hackathons").update({ is_active: false }).neq("id", "");
    // Step 2: set only the selected hackathon as active.
    await actionClient.from("hackathons").update({ is_active: true }).eq("id", id);

    revalidatePath("/admin");
  }

  async function updateMetadata(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    const title = String(formData.get("title") ?? "").trim();

    if (!id || !title) {
      return;
    }

    const actionClient = await createClient();
    await actionClient.from("hackathons").update({ title }).eq("id", id);
    revalidatePath("/admin");
  }

  const { data } = await supabase
    .from("hackathons")
    .select("id, title, is_active")
    .order("created_at", { ascending: false });

  const hackathons = (data ?? []) as HackathonRow[];

  return (
    <main className="space-y-4">
      <section className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{t("hackathons")}</h2>
        <form action={createHackathon} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            name="title"
            placeholder={t("hackathonTitle")}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("createHackathon")}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {hackathons.map((hackathon) => (
          <article
            key={hackathon.id}
            className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {hackathon.title || t("untitledHackathon")}
                </h3>
                <p className="mt-1 text-sm text-foreground/70">
                  {hackathon.is_active ? t("active") : t("inactive")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={setActiveHackathon}>
                  <input type="hidden" name="id" value={hackathon.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface"
                  >
                    {t("setActive")}
                  </button>
                </form>

                <Link
                  href={`/admin/builder/${hackathon.id}`}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface"
                >
                  {t("openBuilder")}
                </Link>

                <form action={deleteHackathon}>
                  <input type="hidden" name="id" value={hackathon.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10"
                  >
                    {t("delete")}
                  </button>
                </form>
              </div>
            </div>

            <form
              action={updateMetadata}
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <input type="hidden" name="id" value={hackathon.id} />
              <input
                type="text"
                name="title"
                defaultValue={hackathon.title ?? ""}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
              >
                {t("editMetadata")}
              </button>
            </form>
          </article>
        ))}
      </section>
    </main>
  );
}

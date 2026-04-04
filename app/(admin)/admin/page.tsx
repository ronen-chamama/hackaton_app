import Link from "next/link";
import Script from "next/script";
import { Copy, Edit3, Eye, Power, Trash2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import {
  createHackathon,
  deleteHackathon,
  duplicateHackathon,
  toggleActive,
  togglePublish,
} from "@/lib/actions/hackathon";

export const dynamic = "force-dynamic";

type HackathonRow = {
  id: string;
  title: string | null;
  is_active: boolean;
  is_published: boolean;
};

type TemplateRow = {
  id: string;
  title: string | null;
};

export default async function AdminHackathonsPage() {
  const supabase = await createClient();

  const [{ data: rows }, { data: templateRows }] = await Promise.all([
    supabase
      .from("hackathons")
      .select("id, title, is_active, is_published")
      .eq("is_template", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("hackathons")
      .select("id, title")
      .eq("is_template", true)
      .order("created_at", { ascending: false }),
  ]);

  const hackathons = (rows ?? []) as HackathonRow[];
  const templates = (templateRows ?? []) as TemplateRow[];

  return (
    <main className="space-y-6">
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{t("createHackathon")}</h2>

        <form action={createHackathon} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            type="text"
            name="title"
            placeholder={t("hackathonTitle")}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />

          <select
            name="templateId"
            defaultValue=""
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">{t("noTemplate")}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title || t("untitledHackathon")}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("createHackathon")}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{t("templates")}</h2>

        {templates.length === 0 ? (
          <p className="mt-4 text-sm text-foreground/70">{t("none")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {templates.map((template) => {
              const deleteTemplateAction = deleteHackathon.bind(null, template.id);

              return (
                <article
                  key={template.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {template.title || t("untitledHackathon")}
                    </p>
                  </div>

                  <form
                    action={deleteTemplateAction}
                    className="js-confirm-delete"
                    data-confirm-message={t("confirmDelete")}
                  >
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-lg border border-danger/40 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("delete")}
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {hackathons.length === 0 ? (
        <section className="rounded-xl border border-border bg-white p-6 text-sm text-foreground/70 shadow-sm">
          {t("none")}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {hackathons.map((hackathon) => {
            const deleteAction = deleteHackathon.bind(null, hackathon.id);
            const duplicateAction = duplicateHackathon.bind(null, hackathon.id);
            const publishAction = togglePublish.bind(null, hackathon.id);
            const activeAction = toggleActive.bind(null, hackathon.id);
            const editHref = `/admin/builder/${encodeURIComponent(hackathon.id)}`;

            return (
              <article
                key={hackathon.id}
                className="rounded-xl border border-border bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {hackathon.title || hackathon.id}
                </h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${
                      hackathon.is_active
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-border bg-background text-foreground/70"
                    }`}
                  >
                    {t("active")}: {hackathon.is_active ? t("confirm") : t("cancel")}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${
                      hackathon.is_published
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground/70"
                    }`}
                  >
                    {t("published")}: {hackathon.is_published ? t("confirm") : t("cancel")}
                  </span>
                </div>

                <div className="mt-5 border-t border-border pt-4">
                  <p className="mb-2 text-xs font-semibold text-foreground/70">{t("actions")}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={editHref}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-surface"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      {t("edit")}
                    </Link>

                    <Link
                      href={`/?preview=${hackathon.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-surface"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t("preview")}
                    </Link>

                    <form action={duplicateAction}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-surface"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {t("duplicate")}
                      </button>
                    </form>

                    <form action={publishAction}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-surface"
                      >
                        <Power className="h-3.5 w-3.5" />
                        {hackathon.is_published ? t("draft") : t("published")}
                      </button>
                    </form>

                    <form action={activeAction}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-surface"
                      >
                        <Power className="h-3.5 w-3.5" />
                        {t("setActive")}
                      </button>
                    </form>

                    <form
                      action={deleteAction}
                      className="js-confirm-delete"
                      data-confirm-message={t("confirmDelete")}
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-lg border border-danger/40 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("delete")}
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <Script id="admin-delete-confirm" strategy="afterInteractive">
        {`
          document.addEventListener("submit", function (event) {
            const form = event.target;
            if (!(form instanceof HTMLFormElement)) return;
            if (!form.classList.contains("js-confirm-delete")) return;
            const message = form.getAttribute("data-confirm-message") || "";
            if (!window.confirm(message)) {
              event.preventDefault();
            }
          });
        `}
      </Script>
    </main>
  );
}

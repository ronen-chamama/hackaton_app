"use server";

import { revalidatePath } from "next/cache";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

type JsonObject = Record<string, unknown>;

function cloneJsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return structuredClone(value as JsonObject);
}

function buildDefaultDefinition(title: string): JsonObject {
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

function buildDefaultTheme(): JsonObject {
  return {
    fonts: {},
    colors: {},
    spacing: {},
    components: {},
  };
}

function revalidateAdmin() {
  revalidatePath("/admin");
}

function revalidateBuilder(hackathonId: string) {
  revalidatePath(`/admin/builder/${hackathonId}`);
}

export async function createHackathon(formData: FormData) {
  const actionClient = await createClient();

  const titleInput = String(formData.get("title") ?? "").trim();
  const templateId = String(formData.get("templateId") ?? "").trim();

  let definition: JsonObject = buildDefaultDefinition(
    titleInput || t("newHackathonDefaultTitle")
  );
  let theme: JsonObject = buildDefaultTheme();

  if (templateId) {
    const { data: template } = await actionClient
      .from("hackathons")
      .select("title, definition, theme")
      .eq("id", templateId)
      .eq("is_template", true)
      .maybeSingle();

    if (template) {
      if (template.definition && typeof template.definition === "object") {
        definition = template.definition as JsonObject;
      }
      if (template.theme && typeof template.theme === "object") {
        theme = template.theme as JsonObject;
      }
      if (!titleInput && typeof template.title === "string" && template.title) {
        definition = {
          ...definition,
          title: template.title,
        };
      }
    }
  }

  const title =
    titleInput ||
    (typeof definition.title === "string" ? definition.title : "") ||
    t("newHackathonDefaultTitle");

  await actionClient.from("hackathons").insert({
    title,
    definition: {
      ...definition,
      title,
      is_active: false,
    },
    theme,
    is_template: false,
    is_active: false,
    is_published: false,
  });

  revalidateAdmin();
}

// Backward-compatible alias for existing forms/imports.
export async function createFromTemplate(formData: FormData) {
  await createHackathon(formData);
}

export async function duplicateHackathon(id: string) {
  if (!id) {
    return;
  }

  const actionClient = await createClient();
  const { data: source } = await actionClient
    .from("hackathons")
    .select("title, definition, theme")
    .eq("id", id)
    .eq("is_template", false)
    .maybeSingle();

  if (!source) {
    return;
  }

  const sourceTitle =
    typeof source.title === "string" && source.title ? source.title : t("untitledHackathon");

  await actionClient.from("hackathons").insert({
    title: `${sourceTitle}${t("copySuffix")}`,
    definition: source.definition,
    theme: source.theme,
    is_template: false,
    is_active: false,
    is_published: false,
  });

  revalidateAdmin();
}

export async function deleteHackathon(id: string) {
  if (!id) {
    return;
  }

  const actionClient = await createClient();
  await actionClient.from("hackathons").delete().eq("id", id);

  revalidateAdmin();
  revalidateBuilder(id);
  revalidatePath("/");
}

export async function toggleActive(id: string) {
  if (!id) {
    return;
  }

  const actionClient = await createClient();

  await actionClient.from("hackathons").update({ is_active: false }).eq("is_template", false);

  await actionClient
    .from("hackathons")
    .update({ is_active: true })
    .eq("id", id)
    .eq("is_template", false);

  revalidateAdmin();
}

export async function togglePublish(id: string) {
  if (!id) {
    return;
  }

  const actionClient = await createClient();
  const { data: row } = await actionClient
    .from("hackathons")
    .select("is_published")
    .eq("id", id)
    .eq("is_template", false)
    .maybeSingle();

  if (!row) {
    return;
  }

  const nextPublished = !Boolean(row.is_published);

  await actionClient
    .from("hackathons")
    .update({
      is_published: nextPublished,
      ...(nextPublished ? {} : { is_active: false }),
    })
    .eq("id", id)
    .eq("is_template", false);

  revalidateAdmin();
}

export async function updateMetadata(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!id || !title) {
    return;
  }

  const actionClient = await createClient();
  await actionClient.from("hackathons").update({ title }).eq("id", id).eq("is_template", false);

  revalidateAdmin();
}

export async function saveAsTemplate(
  id: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!id) {
    return { ok: false, error: t("errorGeneric") };
  }

  const actionClient = await createClient();
  const { data: source, error: sourceError } = await actionClient
    .from("hackathons")
    .select("title, description, definition, theme")
    .eq("id", id)
    .eq("is_template", false)
    .maybeSingle();

  if (sourceError || !source) {
    return { ok: false, error: t("errorGeneric") };
  }

  const baseTitle =
    typeof source.title === "string" && source.title.trim()
      ? source.title.trim()
      : t("untitledHackathon");
  const templateId = crypto.randomUUID();
  const templateTitle = `${baseTitle}${t("templateSuffix")}`;
  const definition = cloneJsonObject(source.definition);
  const theme = cloneJsonObject(source.theme);

  definition.id = templateId;
  definition.title = templateTitle;
  definition.description =
    typeof source.description === "string" ? source.description : "";
  definition.is_active = false;

  const { error: insertError } = await actionClient.from("hackathons").insert({
    id: templateId,
    title: templateTitle,
    description: typeof source.description === "string" ? source.description : "",
    definition,
    theme,
    is_template: true,
    is_active: false,
    is_published: false,
  });

  if (insertError) {
    return { ok: false, error: t("errorGeneric") };
  }

  revalidateAdmin();
  revalidateBuilder(templateId);
  return { ok: true, id: templateId };
}

export async function updateHackathonSettings(
  hackathonId: string,
  title: string,
  description: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = hackathonId.trim();
  const nextTitle = title.trim();
  const nextDescription = description.trim();

  if (!id || !nextTitle) {
    return { ok: false, error: t("errorGeneric") };
  }

  const actionClient = await createClient();
  const { error } = await actionClient
    .from("hackathons")
    .update({ title: nextTitle, description: nextDescription })
    .eq("id", id)
    .eq("is_template", false);

  if (error) {
    return { ok: false, error: t("errorGeneric") };
  }

  revalidateAdmin();
  revalidateBuilder(id);
  revalidatePath("/");
  return { ok: true };
}

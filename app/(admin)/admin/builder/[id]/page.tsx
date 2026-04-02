import { redirect } from "next/navigation";
import BuilderClient from "./BuilderClient";
import { createClient } from "@/lib/supabase/server";
import type { HackathonDefinition } from "@/lib/types";

interface BuilderPageProps {
  params: Promise<{ id: string }>;
}

function sanitizeDefinition(value: unknown): HackathonDefinition {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    id: typeof raw.id === "string" ? raw.id : "",
    title: typeof raw.title === "string" ? raw.title : "",
    slogan: typeof raw.slogan === "string" ? raw.slogan : "",
    description: typeof raw.description === "string" ? raw.description : "",
    theme:
      raw.theme && typeof raw.theme === "object" && !Array.isArray(raw.theme)
        ? (raw.theme as HackathonDefinition["theme"])
        : { fonts: {}, colors: {}, spacing: {}, components: {} },
    is_active: Boolean(raw.is_active),
    stages: Array.isArray(raw.stages)
      ? (raw.stages as HackathonDefinition["stages"])
      : [],
  };
}

export default async function BuilderPage({ params }: BuilderPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("id, title, definition")
    .eq("id", id)
    .maybeSingle();

  if (!hackathon) {
    redirect("/admin");
  }

  return (
    <BuilderClient
      hackathonId={hackathon.id as string}
      initialDefinition={sanitizeDefinition(hackathon.definition)}
      fallbackTitle={(hackathon.title as string | null) ?? ""}
    />
  );
}

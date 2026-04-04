import BuilderClient from "./BuilderClient";
import { createClient } from "@/lib/supabase/server";
import type {
  Column,
  Container,
  Element,
  ElementType,
  HackathonDefinition,
  Row,
} from "@/lib/types";

interface BuilderPageProps {
  params: Promise<{ id: string }>;
}

const isElementType = (value: unknown): value is ElementType =>
  typeof value === "string" &&
  [
    "heading",
    "text",
    "image",
    "video",
    "alert",
    "list",
    "info-card",
    "icon_card",
    "link_button",
    "short_text",
    "long_text",
    "repeater_list",
    "advanced_repeater",
    "card_builder",
    "research_block",
    "position_paper",
    "pitch",
  ].includes(value);

function sanitizeDefinition(value: unknown): HackathonDefinition {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const sanitizeElementConfig = (configRaw: unknown): Record<string, unknown> => {
    const config =
      configRaw && typeof configRaw === "object" && !Array.isArray(configRaw)
        ? ({ ...(configRaw as Record<string, unknown>) } as Record<string, unknown>)
        : {};

    delete config.beforeText;
    delete config.afterText;
    delete config.beforeTextAlign;
    delete config.afterTextAlign;

    if (Array.isArray(config.items) && !Array.isArray(config.listItems)) {
      config.listItems = config.items;
    }
    delete config.items;

    return config;
  };

  const sanitizeElements = (columnRaw: Record<string, unknown>): Element[] => {
    if (!Array.isArray(columnRaw.elements)) {
      return [];
    }

    return columnRaw.elements.flatMap((elementRaw) => {
      const nextElement =
        elementRaw && typeof elementRaw === "object" && !Array.isArray(elementRaw)
          ? ({ ...(elementRaw as Record<string, unknown>) } as Record<string, unknown>)
          : {};

      if (!isElementType(nextElement.type)) {
        return [];
      }

      return [{
        ...(nextElement as unknown as Element),
        id:
          typeof nextElement.id === "string" ? nextElement.id : `element-${crypto.randomUUID()}`,
        type: nextElement.type,
        config: sanitizeElementConfig(nextElement.config),
      }];
    });
  };

  const sanitizeColumns = (rowRaw: Record<string, unknown>): Column[] => {
    if (!Array.isArray(rowRaw.columns)) {
      return [];
    }

    return rowRaw.columns.map((columnRaw) => {
      const nextColumn =
        columnRaw && typeof columnRaw === "object" && !Array.isArray(columnRaw)
          ? ({ ...(columnRaw as Record<string, unknown>) } as Record<string, unknown>)
          : {};

      return {
        ...(nextColumn as unknown as Column),
        id:
          typeof nextColumn.id === "string" ? nextColumn.id : `column-${crypto.randomUUID()}`,
        elements: sanitizeElements(nextColumn),
      };
    });
  };

  const sanitizeRows = (containerRaw: Record<string, unknown>): Row[] => {
    if (Array.isArray(containerRaw.rows)) {
      return containerRaw.rows.map((rowRaw) => {
        const nextRow =
          rowRaw && typeof rowRaw === "object" && !Array.isArray(rowRaw)
            ? ({ ...(rowRaw as Record<string, unknown>) } as Record<string, unknown>)
            : {};

        return {
          ...(nextRow as unknown as Row),
          id: typeof nextRow.id === "string" ? nextRow.id : `row-${crypto.randomUUID()}`,
          columns: sanitizeColumns(nextRow),
        };
      });
    }

    if (Array.isArray(containerRaw.columns)) {
      return [
        {
          id: `row-migrated-${crypto.randomUUID()}`,
          columns: sanitizeColumns({ columns: containerRaw.columns }),
          settings: {},
        },
      ];
    }

    return [];
  };

  const sanitizeContainers = (stageRaw: Record<string, unknown>): Container[] => {
    if (!Array.isArray(stageRaw.containers)) {
      return [];
    }

    return stageRaw.containers.map((container) => {
      const containerRaw =
        container && typeof container === "object" && !Array.isArray(container)
          ? (container as Record<string, unknown>)
          : {};
      return {
        ...(containerRaw as unknown as Container),
        id: typeof containerRaw.id === "string" ? containerRaw.id : `container-${crypto.randomUUID()}`,
        rows: sanitizeRows(containerRaw),
      };
    });
  };

  const sanitizeStages = (): HackathonDefinition["stages"] => {
    if (!Array.isArray(raw.stages)) {
      return [];
    }

    return raw.stages.map((stage) => {
      const stageRaw =
        stage && typeof stage === "object" && !Array.isArray(stage)
          ? (stage as Record<string, unknown>)
          : {};
      return {
        ...(stageRaw as unknown as HackathonDefinition["stages"][number]),
        id: typeof stageRaw.id === "string" ? stageRaw.id : `stage-${crypto.randomUUID()}`,
        title: typeof stageRaw.title === "string" ? stageRaw.title : "",
        containers: sanitizeContainers(stageRaw),
      };
    });
  };

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
    stages: sanitizeStages(),
  };
}

export default async function BuilderPage({ params }: BuilderPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: hackathon, error } = await supabase
    .from("hackathons")
    .select("id, title, description, definition, is_template")
    .eq("id", id)
    .maybeSingle();

  if (error || !hackathon) {
    console.error("Builder fetch error for ID:", id, error);
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load Hackathon. Check server console for ID: {id}
      </div>
    );
  }

  return (
    <BuilderClient
      hackathonId={hackathon.id as string}
      initialDefinition={sanitizeDefinition(hackathon.definition)}
      initialTitle={(hackathon.title as string | null) ?? ""}
      initialDescription={(hackathon.description as string | null) ?? ""}
      initialIsTemplate={Boolean(hackathon.is_template)}
    />
  );
}

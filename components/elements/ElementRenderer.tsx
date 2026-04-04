"use client";

import { useMemo, type CSSProperties } from "react";
import { AlertElement } from "@/components/elements/display/AlertElement";
import { CardBuilderElement } from "@/components/elements/complex/CardBuilderElement";
import { InfoCardElement } from "@/components/elements/display/InfoCardElement";
import { PitchElement } from "@/components/elements/complex/PitchElement";
import { PositionPaperElement } from "@/components/elements/complex/PositionPaperElement";
import { ResearchBlockElement } from "@/components/elements/complex/ResearchBlockElement";
import { HeadingElement } from "@/components/elements/display/HeadingElement";
import { IconCardElement } from "@/components/elements/display/IconCardElement";
import { ImageElement } from "@/components/elements/display/ImageElement";
import { LinkButtonElement } from "@/components/elements/display/LinkButtonElement";
import { ListElement } from "@/components/elements/display/ListElement";
import { TextElement } from "@/components/elements/display/TextElement";
import { VideoElement } from "@/components/elements/display/VideoElement";
import { LongTextElement } from "@/components/elements/input/LongTextElement";
import { AdvancedRepeaterElement } from "@/components/elements/input/AdvancedRepeaterElement";
import { RepeaterListElement } from "@/components/elements/input/RepeaterListElement";
import { ShortTextElement } from "@/components/elements/input/ShortTextElement";
import type { FieldLockContext } from "@/components/elements/fieldLock";
import { createClient } from "@/lib/supabase/client";
import type { Element, GroupValue } from "@/lib/types";

interface ElementRendererProps {
  element: Element;
  groupValue?: GroupValue;
  hackathonId: string;
  groupId: string | null;
  userId: string | null;
  groupMembers?: string[];
  groupName?: string;
  hackathonName?: string;
  fieldLock?: FieldLockContext;
  wrapperVisual?: {
    textColor?: string;
    backgroundColor?: string;
    border?: string;
    shadow?: string;
    borderWidth?: number;
    borderColor?: string;
  };
  themeMeta?: {
    elementIndex?: number;
    containerIndex?: number;
    columnIndex?: number;
    socialTime?: string;
    printTag?: string;
  };
  onValueSaved: (value: GroupValue) => void;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object" && !Array.isArray(item)
        );
      }
      return [];
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Record<string, unknown> =>
      !!item && typeof item === "object" && !Array.isArray(item)
  );
}

function asTextAlign(value: unknown): "left" | "center" | "right" {
  if (value === "left" || value === "center" || value === "right") {
    return value;
  }
  return "right";
}

export function ElementRenderer({
  element,
  groupValue,
  hackathonId,
  groupId,
  userId,
  groupMembers = [],
  groupName = "",
  hackathonName = "",
  fieldLock,
  wrapperVisual,
  themeMeta,
  onValueSaved,
}: ElementRendererProps) {
  const supabase = useMemo(() => createClient(), []);

  const saveInputValue = async (nextValue: unknown) => {
    if (!groupId || !userId) {
      return;
    }

    const payload = {
      hackathon_id: hackathonId,
      group_id: groupId,
      element_id: element.id,
      value: nextValue,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    const { data, error } = await supabase
      .from("group_values")
      .upsert(payload, { onConflict: "hackathon_id,group_id,element_id" })
      .select(
        "id, hackathon_id, group_id, element_id, value, updated_at, updated_by"
      )
      .single();

    if (!error && data) {
      onValueSaved(data as GroupValue);
    }
  };

  const content = (() => {
    switch (element.type) {
    case "heading": {
      const text = asString(element.config.text);
      const level =
        element.config.level === "h1" ||
        element.config.level === "h2" ||
        element.config.level === "h3"
          ? element.config.level
          : "h2";
      const textAlign = asTextAlign(element.config.textAlign);
      const separatorStyle =
        element.config.separatorStyle === "dashed" ||
        element.config.separatorStyle === "dotted"
          ? element.config.separatorStyle
          : "solid";
      return (
        <HeadingElement
          text={text}
          level={level}
          textAlign={textAlign}
          subHeading={asString(element.config.subHeading)}
          showSeparator={Boolean(element.config.showSeparator)}
          separatorStyle={separatorStyle}
          separatorColor={asString(element.config.separatorColor)}
          subHeadingColor={asString(element.config.subHeadingColor)}
        />
      );
    }

    case "text": {
      const content = asString(element.config.content);
      const textAlign = asTextAlign(element.config.textAlign);
      return <TextElement content={content} textAlign={textAlign} />;
    }

    case "image": {
      const url = asString(element.config.url);
      const alt = asString(element.config.alt);
      return <ImageElement url={url} alt={alt} />;
    }

    case "video": {
      const youtubeId = asString(element.config.youtubeId);
      return <VideoElement youtubeId={youtubeId} />;
    }

    case "alert": {
      const type =
        element.config.type === "warning" || element.config.type === "success"
          ? element.config.type
          : "info";
      const text = asString(element.config.text);
      return <AlertElement type={type} text={text} />;
    }

    case "list": {
      const listItems = asStringArray(element.config.listItems ?? element.config.items);
      const style = element.config.style === "numbers" ? "numbers" : "bullets";
      return <ListElement listItems={listItems} style={style} />;
    }

    case "info-card": {
      return (
        <InfoCardElement
          cardTitle={asString(element.config.cardTitle)}
          cardText={asString(element.config.cardText)}
          titleBgColor={asString(element.config.titleBgColor)}
          titleTextColor={asString(element.config.titleTextColor)}
          cardBorderColor={asString(element.config.cardBorderColor)}
          cardShadowColor={asString(element.config.cardShadowColor)}
          titleAlignment={asTextAlign(element.config.titleAlignment)}
          emojiIcon={asString(element.config.emojiIcon)}
        />
      );
    }

    case "icon_card": {
      return (
        <IconCardElement
          iconName={asString(element.config.iconName, "Star")}
          title={asString(element.config.title)}
          text={asString(element.config.text)}
        />
      );
    }

    case "link_button": {
      return (
        <LinkButtonElement
          label={asString(element.config.label)}
          url={asString(element.config.url)}
        />
      );
    }

    case "short_text": {
      const placeholder = asString(element.config.placeholder);
      const value = asString(groupValue?.value);
      return (
        <ShortTextElement
          placeholder={placeholder}
          value={value}
          onSave={saveInputValue}
          fieldLock={fieldLock}
          lockFieldName={`${element.id}:value`}
        />
      );
    }

    case "long_text": {
      const placeholder = asString(element.config.placeholder);
      const value = asString(groupValue?.value);
      return (
        <LongTextElement
          placeholder={placeholder}
          value={value}
          onSave={saveInputValue}
          fieldLock={fieldLock}
          lockFieldName={`${element.id}:value`}
        />
      );
    }

    case "repeater_list": {
      const placeholder = asString(element.config.placeholder);
      const addButtonText = asString(element.config.addButtonText);
      const value = asStringArray(groupValue?.value);
      return (
        <RepeaterListElement
          placeholder={placeholder}
          addButtonText={addButtonText}
          value={value}
          onSave={saveInputValue}
          fieldLock={fieldLock}
          lockFieldPrefix={`${element.id}:items`}
        />
      );
    }

    case "advanced_repeater": {
      const fields = Array.isArray(element.config.fields)
        ? element.config.fields
            .filter(
              (item): item is Record<string, unknown> =>
                !!item && typeof item === "object" && !Array.isArray(item)
            )
            .map((item) => ({
              id: asString(item.id),
              placeholder: asString(item.placeholder),
            }))
            .filter((item) => item.id)
        : [];
      const addButtonText = asString(element.config.addButtonText);
      const value = asRecordArray(groupValue?.value).map((row) => {
        const nextRow: Record<string, string> = {};
        for (const field of fields) {
          nextRow[field.id] = asString(row[field.id]);
        }
        return nextRow;
      });
      return (
        <AdvancedRepeaterElement
          fields={fields}
          addButtonText={addButtonText}
          value={value}
          onSave={saveInputValue}
          fieldLock={fieldLock}
          lockFieldPrefix={`${element.id}:rows`}
        />
      );
    }

    case "research_block": {
      const value = asRecord(groupValue?.value);
      return (
        <ResearchBlockElement
          value={{
            title: asString(value.title),
            findings: asStringArray(value.findings),
            sources: asStringArray(value.sources),
            summary: asString(value.summary),
          }}
          printElementId={`print-view-${element.id}`}
          hackathonName={hackathonName}
          groupName={groupName}
          groupMembers={groupMembers}
          onSave={saveInputValue}
          fieldLock={fieldLock}
          lockFieldPrefix={`${element.id}:research`}
        />
      );
    }

    case "position_paper": {
      const value = asRecord(groupValue?.value);
      return (
        <PositionPaperElement
          value={{
            subject: asString(value.subject),
            recipient: asString(value.recipient),
            background: asString(value.background),
            problem: asString(value.problem),
            affected: asString(value.affected),
            solution: asString(value.solution),
            advantages: asString(value.advantages),
            objections: asString(value.objections),
            action_plan: asString(value.action_plan),
          }}
          groupMembers={groupMembers}
          printElementId={`print-view-${element.id}`}
          onSave={saveInputValue}
          fieldLock={fieldLock}
          lockFieldPrefix={`${element.id}:position`}
        />
      );
    }

    case "pitch": {
      const value = asRecord(groupValue?.value);
      return (
        <PitchElement
          value={{
            hook: asString(value.hook),
            story: asString(value.story),
            message: asString(value.message),
            ask: asString(value.ask),
            closing: asString(value.closing),
          }}
          printElementId={`print-view-${element.id}`}
          onSave={saveInputValue}
          fieldLock={fieldLock}
          lockFieldPrefix={`${element.id}:pitch`}
        />
      );
    }

    case "card_builder": {
      const value = asRecordArray(groupValue?.value).map((row) => ({
        title: asString(row.title),
        description: asString(row.description),
        input: asString(row.input),
      }));
      const layout =
        element.config.layout === "horizontal" ||
        element.config.layout === "grid" ||
        element.config.layout === "vertical"
          ? element.config.layout
          : "vertical";
      const gridColumns =
        typeof element.config.gridColumns === "number"
          ? element.config.gridColumns
          : Number(element.config.gridColumns ?? 2);
      return (
        <CardBuilderElement
          layout={layout}
          gridColumns={Number.isNaN(gridColumns) ? 2 : gridColumns}
          addButtonText={asString(element.config.addButtonText)}
          titlePlaceholder={asString(element.config.titlePlaceholder)}
          descPlaceholder={asString(element.config.descPlaceholder)}
          inputPlaceholder={asString(element.config.inputPlaceholder)}
          value={value}
          onSave={saveInputValue}
          fieldLock={fieldLock}
          lockFieldPrefix={`${element.id}:cards`}
        />
      );
    }

    default:
      return null;
    }
  })();

  if (!content) {
    return null;
  }

  const hasExplicitBorderWidth =
    typeof wrapperVisual?.borderWidth === "number" && wrapperVisual.borderWidth > 0;
  const hasExplicitBorderStyle =
    wrapperVisual?.border === "dashed" ||
    wrapperVisual?.border === "solid" ||
    wrapperVisual?.border === "none";

  const wrapperStyle: CSSProperties = {
    color: wrapperVisual?.textColor || undefined,
    backgroundColor: wrapperVisual?.backgroundColor || undefined,
    borderColor: wrapperVisual?.borderColor || undefined,
    borderStyle:
      wrapperVisual?.border === "dashed" || wrapperVisual?.border === "solid"
        ? wrapperVisual.border
        : wrapperVisual?.border === "none"
          ? "none"
          : hasExplicitBorderWidth
            ? "solid"
            : undefined,
    borderWidth:
      wrapperVisual?.border === "none"
        ? 0
        : hasExplicitBorderWidth
          ? `${wrapperVisual.borderWidth}px`
          : hasExplicitBorderStyle
            ? "1px"
            : undefined,
    boxShadow:
      wrapperVisual?.shadow === "sm"
        ? "0 1px 2px 0 rgb(0 0 0 / 0.05)"
        : wrapperVisual?.shadow === "md"
          ? "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
          : wrapperVisual?.shadow === "lg"
            ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
            : wrapperVisual?.shadow === "none"
              ? "none"
              : undefined,
  };

  return (
    <article
      data-theme-wrapper="element"
      data-element-index={themeMeta?.elementIndex}
      data-container-index={themeMeta?.containerIndex}
      data-column-index={themeMeta?.columnIndex}
      data-social-time={themeMeta?.socialTime}
      data-print-tag={themeMeta?.printTag}
      className="relative overflow-visible rounded p-4"
      style={wrapperStyle}
    >
      {content}
    </article>
  );
}

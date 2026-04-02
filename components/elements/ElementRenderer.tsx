"use client";

import { useMemo } from "react";
import { AlertElement } from "@/components/elements/display/AlertElement";
import { PitchElement } from "@/components/elements/complex/PitchElement";
import { PositionPaperElement } from "@/components/elements/complex/PositionPaperElement";
import { ResearchBlockElement } from "@/components/elements/complex/ResearchBlockElement";
import { HeadingElement } from "@/components/elements/display/HeadingElement";
import { HeroElement } from "@/components/elements/display/HeroElement";
import { ImageElement } from "@/components/elements/display/ImageElement";
import { ListElement } from "@/components/elements/display/ListElement";
import { TextElement } from "@/components/elements/display/TextElement";
import { VideoElement } from "@/components/elements/display/VideoElement";
import { LongTextElement } from "@/components/elements/input/LongTextElement";
import { RepeaterListElement } from "@/components/elements/input/RepeaterListElement";
import { ShortTextElement } from "@/components/elements/input/ShortTextElement";
import { createClient } from "@/lib/supabase/client";
import type { Element, GroupValue } from "@/lib/types";

interface ElementRendererProps {
  element: Element;
  groupValue?: GroupValue;
  hackathonId: string;
  groupId: string | null;
  userId: string | null;
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

export function ElementRenderer({
  element,
  groupValue,
  hackathonId,
  groupId,
  userId,
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

  switch (element.type) {
    case "heading": {
      const text = asString(element.config.text);
      const level =
        element.config.level === "h1" ||
        element.config.level === "h2" ||
        element.config.level === "h3"
          ? element.config.level
          : "h2";
      return <HeadingElement text={text} level={level} />;
    }

    case "text": {
      const content = asString(element.config.content);
      return <TextElement content={content} />;
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

    case "hero": {
      const title = asString(element.config.title);
      const subtitle = asString(element.config.subtitle);
      const align =
        element.config.align === "center" || element.config.align === "right"
          ? element.config.align
          : "right";
      return <HeroElement title={title} subtitle={subtitle} align={align} />;
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
      const items = asStringArray(element.config.items);
      const style = element.config.style === "numbers" ? "numbers" : "bullets";
      return <ListElement items={items} style={style} />;
    }

    case "short_text": {
      const placeholder = asString(element.config.placeholder);
      const value = asString(groupValue?.value);
      return (
        <ShortTextElement
          placeholder={placeholder}
          value={value}
          onSave={saveInputValue}
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
          onSave={saveInputValue}
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
          onSave={saveInputValue}
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
          onSave={saveInputValue}
        />
      );
    }

    default:
      return null;
  }
}

"use client";

import { createElement } from "react";
import * as icons from "lucide-react";
import { Star, type LucideIcon } from "lucide-react";

interface IconCardElementProps {
  iconName: string;
  title: string;
  text: string;
}

const iconLookup = icons as unknown as Record<string, LucideIcon>;

function resolveIcon(iconName: string): LucideIcon {
  return iconLookup[iconName] ?? Star;
}

export function IconCardElement({ iconName, title, text }: IconCardElementProps) {
  return (
    <article className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
      <div className="flex w-full items-center justify-center text-primary">
        {createElement(resolveIcon(iconName), { size: 96, className: "h-24 w-24" })}
      </div>

      <h2 className="mt-6 text-2xl font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-foreground/80">{text}</p>
    </article>
  );
}

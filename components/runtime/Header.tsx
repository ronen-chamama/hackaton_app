"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RuntimeHeaderProps {
  /** Hackathon title (definition.title with fallback to hackathon.title). */
  title: string;
  /** Short tagline shown below the title. */
  slogan: string;
  /** Longer body text shown below the slogan. */
  description: string;
  /** Current persisted name of this user's group. */
  groupName: string;
  /** All members of this user's group, sorted by name. */
  groupMembers: string[];
  /**
   * Called with the new value whenever the group-name input should be saved.
   * Receives the trimmed name after a 600 ms debounce or on blur.
   */
  onGroupNameSave: (name: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Debounce constant — matches ShortTextElement.tsx
// ---------------------------------------------------------------------------

const SAVE_DEBOUNCE_MS = 600;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full-width header for the student runtime.
 *
 * Visual layout (RTL — reading direction starts at the right):
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  [Logo]   Hackathon Title                                        │
 *   │           Slogan                                                 │
 *   │           Description                                            │
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │  [Group Name label + editable input]  │  [Members label + list]  │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * The group-info band uses CSS grid (2 equal columns) so neither side can
 * overflow into the other, which was the cause of the previous overlap bug.
 *
 * In RTL the grid flows right → left, so:
 *   grid child 1 (JSX-first) → RIGHT  = group name
 *   grid child 2 (JSX-second) → LEFT  = members
 */
export function RuntimeHeader({
  title,
  slogan,
  description,
  groupName,
  groupMembers,
  onGroupNameSave,
}: RuntimeHeaderProps) {
  // -------------------------------------------------------------------------
  // Local draft state — mirrors ShortTextElement pattern exactly.
  // `draft`        : what the input currently shows (may be unsaved)
  // `timerRef`     : holds the pending debounce timeout id
  // `lastSavedRef` : tracks the last value actually sent to the DB so we skip
  //                  redundant network calls when nothing changed
  // -------------------------------------------------------------------------
  const [draft, setDraft] = useState(groupName);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(groupName);

  // Cleanup: flush any pending timer on unmount so we never call a stale save.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Save helpers
  // -------------------------------------------------------------------------

  const saveNow = async (value: string) => {
    const trimmed = value.trim();
    if (trimmed === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = trimmed;
    await onGroupNameSave(trimmed);
  };

  const scheduleSave = (value: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void saveNow(value);
    }, SAVE_DEBOUNCE_MS);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <header className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm">

      {/* ------------------------------------------------------------------ */}
      {/* Top band: logo + hackathon metadata                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-4 p-4 sm:gap-5 sm:p-5">

        {/* Chamama logo — public/chamama_logo.webp */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/chamama_logo.webp"
          alt="Chamama"
          className="h-16 w-auto flex-shrink-0 object-contain"
        />

        {/* Hackathon metadata — min-w-0 prevents text from blowing out */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold leading-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {slogan ? (
            <p className="mt-1 truncate text-sm font-medium text-foreground/75 sm:text-base">
              {slogan}
            </p>
          ) : null}
          {description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground/60 sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Group info band                                                      */}
      {/* Two-column CSS grid: col-1 (right in RTL) = name, col-2 = members.  */}
      {/* Using grid instead of flex prevents either column from being squeezed*/}
      {/* into zero width and causing overlap.                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-t border-border px-4 py-3 sm:px-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">

          {/* Column 1 — RIGHT in RTL: editable group name */}
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/50">
              {t("groupName")}
            </p>
            <input
              type="text"
              value={draft}
              placeholder={t("groupName")}
              aria-label={t("groupName")}
              className={[
                "w-full rounded-md bg-transparent px-0 py-0.5",
                "text-sm font-semibold text-foreground",
                // Invisible border at rest — appears only on focus/hover so the
                // input does not look like a heavy form field inside the header.
                "border-b border-transparent",
                "outline-none transition-colors",
                "hover:border-border",
                "focus:border-primary",
                "placeholder:text-foreground/30",
              ].join(" ")}
              onChange={(e) => {
                const next = e.target.value;
                setDraft(next);
                scheduleSave(next);
              }}
              onBlur={() => {
                // Flush immediately when the field loses focus — same as
                // ShortTextElement to guarantee the value lands in the DB
                // even if the user closes the browser immediately after typing.
                if (timerRef.current) {
                  clearTimeout(timerRef.current);
                }
                void saveNow(draft);
              }}
            />
          </div>

          {/* Column 2 — LEFT in RTL: member name list */}
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/50">
              {t("groupMembers")}
            </p>
            {groupMembers.length > 0 ? (
              <p className="text-sm text-foreground">{groupMembers.join(", ")}</p>
            ) : (
              <span className="text-sm text-foreground/40">—</span>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

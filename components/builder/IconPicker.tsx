"use client";

import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as icons from "lucide-react";
import { Search, Star, type LucideIcon } from "lucide-react";
import { t } from "@/lib/i18n";

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

export const LUCIDE_ICON_NAMES = [
  "Shield",
  "Rocket",
  "Zap",
  "Flame",
  "Target",
  "Award",
  "Cpu",
  "Activity",
  "Anchor",
  "Aperture",
  "Archive",
  "ArrowRight",
  "AtSign",
  "BarChart",
  "Battery",
  "Beaker",
  "Bell",
  "Bluetooth",
  "Book",
  "Bookmark",
  "Box",
  "Briefcase",
  "Calendar",
  "Camera",
  "Cast",
  "Check",
  "ChevronRight",
  "Chrome",
  "Clipboard",
  "Clock",
  "Cloud",
  "Code",
  "Coffee",
  "Coins",
  "Compass",
  "Copy",
  "CreditCard",
  "Crop",
  "Crosshair",
  "Database",
  "Disc",
  "Download",
  "Droplet",
  "Edit",
  "ExternalLink",
  "Eye",
  "FastForward",
  "Feather",
  "File",
  "Film",
  "Filter",
  "Flag",
  "Folder",
  "Gift",
  "GitBranch",
  "Github",
  "Globe",
  "Grid3X3",
  "HardDrive",
  "Hash",
  "Headphones",
  "Heart",
  "HelpCircle",
  "Home",
  "Image",
  "Inbox",
  "Info",
  "Instagram",
  "Key",
  "Layers",
  "Layout",
  "LifeBuoy",
  "Link",
  "Linkedin",
  "List",
  "Loader",
  "Lock",
  "LogIn",
  "Mail",
  "Map",
  "Maximize",
  "Menu",
  "MessageCircle",
  "Mic",
  "Minimize",
  "Minus",
  "Monitor",
  "Moon",
  "MoreHorizontal",
  "MousePointer",
  "Music",
  "Navigation",
  "Octagon",
  "Package",
  "Paperclip",
  "Pause",
  "Percent",
  "Phone",
  "PieChart",
  "Play",
  "Plus",
  "Pocket",
  "Power",
  "Printer",
  "Radio",
  "RefreshCw",
  "Repeat",
  "Rewind",
  "RotateCcw",
  "Rss",
  "Save",
  "Scissors",
  "Search",
  "Send",
  "Server",
  "Settings",
  "Share",
  "ShoppingBag",
  "ShoppingCart",
  "Shuffle",
  "Sidebar",
  "SkipBack",
  "Slash",
  "Sliders",
  "Smartphone",
  "Speaker",
  "Square",
  "Star",
  "Sun",
  "Sunrise",
  "Sunset",
  "Tablet",
  "Tag",
  "Terminal",
  "Thermometer",
  "ThumbsDown",
  "ThumbsUp",
  "Ticket",
  "ToggleLeft",
  "ToggleRight",
  "Trash",
  "TrendingDown",
  "TrendingUp",
  "Triangle",
  "Truck",
  "Tv",
  "Twitch",
  "Twitter",
  "Type",
  "Umbrella",
  "Unlock",
  "Upload",
  "User",
  "Video",
  "Voicemail",
  "VolumeX",
  "Watch",
  "Wifi",
  "Wind",
  "X",
  "Youtube",
  "ZoomIn",
  "ZoomOut",
] as const;

const iconLookup = icons as unknown as Record<string, LucideIcon>;

function resolveIcon(iconName: string): LucideIcon {
  return iconLookup[iconName] ?? Star;
}

function renderIcon(iconName: string, props?: { className?: string; size?: number }) {
  return createElement(resolveIcon(iconName), props ?? {});
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const PANEL_WIDTH = 360;
  const PANEL_HEIGHT = 400;
  const COLLISION_PADDING = 20;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      const trigger = rootRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();

      // Open towards the center (like side="left" + align="end")
      let left = rect.right - PANEL_WIDTH;
      left = Math.max(
        COLLISION_PADDING,
        Math.min(left, window.innerWidth - PANEL_WIDTH - COLLISION_PADDING)
      );

      // collisionPadding equivalent + avoidCollisions behavior
      let top = rect.bottom + 8;
      if (top + PANEL_HEIGHT > window.innerHeight - COLLISION_PADDING) {
        top = Math.max(COLLISION_PADDING, rect.top - PANEL_HEIGHT - 8);
      }

      setPopoverStyle({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      const clickedTrigger = rootRef.current?.contains(target) ?? false;
      const clickedPanel = panelRef.current?.contains(target) ?? false;

      if (!clickedTrigger && !clickedPanel) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  const filteredNames = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return LUCIDE_ICON_NAMES;
    }
    return LUCIDE_ICON_NAMES.filter((name) => name.toLowerCase().includes(normalized));
  }, [query]);

  const activeName = LUCIDE_ICON_NAMES.find((name) => name === value) ?? "Star";

  return (
    <div ref={rootRef} className="inline-block">
      <button
        type="button"
        className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-background shadow-sm transition-colors hover:bg-surface"
        onClick={() => setIsOpen((prev) => !prev)}
        title={t("selectIcon")}
        aria-label={t("selectIcon")}
      >
        {renderIcon(activeName, { className: "h-5 w-5" })}
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[100] w-[360px] rounded-xl border border-border bg-surface shadow-xl"
              style={{ top: popoverStyle.top, left: popoverStyle.left }}
            >
              <div className="relative border-b border-border p-3">
                <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
                <input
                  type="text"
                  value={query}
                  placeholder={t("searchIcons")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 pe-8 text-sm"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

              <div className="h-[320px] overflow-y-auto scrollbar-hide">
                <div
                  className="grid grid-cols-8 gap-1 p-2 overflow-y-auto"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
                  }}
                >
                  {filteredNames.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      className={`aspect-square w-10 h-10 flex items-center justify-center rounded-md border border-transparent hover:border-primary/30 hover:bg-surface-raised transition-all cursor-pointer ${
                        value === iconName ? "bg-primary/10 border-primary" : ""
                      }`}
                      onClick={() => {
                        onChange(iconName);
                        setIsOpen(false);
                      }}
                      title={iconName}
                      aria-label={iconName}
                    >
                      {renderIcon(iconName, { size: 20, className: "text-foreground/80" })}
                    </button>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

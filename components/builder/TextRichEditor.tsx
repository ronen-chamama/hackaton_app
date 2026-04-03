"use client";

import { type ReactNode, useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Palette,
  Type,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { FontSize } from "@/lib/editor/fontSize";

type TextAlign = "left" | "center" | "right";

interface TextRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  textAlign?: TextAlign;
  onTextAlignChange?: (align: TextAlign) => void;
}

interface ToolbarState {
  textColor: string;
  highlightColor: string;
  fontSize: string;
}

const DEFAULT_TEXT_COLOR = "#111827";
const DEFAULT_HIGHLIGHT_COLOR = "#fef08a";
const FONT_SIZE_OPTIONS = ["", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

function normalizeColor(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value)) {
    return value;
  }
  return fallback;
}

function normalizeFontSize(value: unknown): string {
  if (typeof value === "string" && /^\d+px$/.test(value)) {
    return value;
  }
  return "";
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded border px-2 py-1 ${
        isActive ? "border-primary bg-primary/10" : "border-border bg-background"
      }`}
    >
      {children}
    </button>
  );
}

function readToolbarState(editor: ReturnType<typeof useEditor>): ToolbarState {
  if (!editor) {
    return {
      textColor: DEFAULT_TEXT_COLOR,
      highlightColor: DEFAULT_HIGHLIGHT_COLOR,
      fontSize: "",
    };
  }

  return {
    textColor: normalizeColor(editor.getAttributes("textStyle").color, DEFAULT_TEXT_COLOR),
    highlightColor: normalizeColor(
      editor.getAttributes("highlight").color,
      DEFAULT_HIGHLIGHT_COLOR
    ),
    fontSize: normalizeFontSize(editor.getAttributes("textStyle").fontSize),
  };
}

export function TextRichEditor({
  value,
  onChange,
  textAlign,
  onTextAlignChange,
}: TextRichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      FontSize,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "tiptap-content min-h-28 rounded-b border border-border border-t-0 bg-background px-3 py-2 text-sm outline-none prose prose-sm max-w-none",
        dir: "rtl",
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
    immediatelyRender: false,
  });

  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    textColor: DEFAULT_TEXT_COLOR,
    highlightColor: DEFAULT_HIGHLIGHT_COLOR,
    fontSize: "",
  });

  useEffect(() => {
    if (!editor) return;

    const syncToolbarState = () => {
      setToolbarState(readToolbarState(editor));
    };

    syncToolbarState();
    editor.on("selectionUpdate", syncToolbarState);
    editor.on("transaction", syncToolbarState);

    return () => {
      editor.off("selectionUpdate", syncToolbarState);
      editor.off("transaction", syncToolbarState);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== (value || "")) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-center gap-2 rounded-t border border-border bg-background px-2 py-1.5">
        <ToolbarButton
          title={t("bold")}
          isActive={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title={t("italic")}
          isActive={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title={t("bullets")}
          isActive={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title={t("numbers")}
          isActive={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        {onTextAlignChange ? (
          <>
            <ToolbarButton
              title={t("right")}
              isActive={textAlign === "right"}
              onClick={() => onTextAlignChange("right")}
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              title={t("center")}
              isActive={textAlign === "center"}
              onClick={() => onTextAlignChange("center")}
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              title={t("left")}
              isActive={textAlign === "left"}
              onClick={() => onTextAlignChange("left")}
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
          </>
        ) : null}

        <label className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs">
          <Palette className="h-4 w-4" />
          <span className="sr-only">{t("textColor")}</span>
          <input
            type="color"
            value={toolbarState.textColor}
            className="h-5 w-7 cursor-pointer border-0 bg-transparent p-0"
            aria-label={t("textColor")}
            onChange={(event) => {
              const nextValue = event.target.value;
              setToolbarState((previous) => ({ ...previous, textColor: nextValue }));
              editor.chain().focus().setColor(nextValue).run();
            }}
          />
        </label>

        <label className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs">
          <Highlighter className="h-4 w-4" />
          <span className="sr-only">{t("highlightColor")}</span>
          <input
            type="color"
            value={toolbarState.highlightColor}
            className="h-5 w-7 cursor-pointer border-0 bg-transparent p-0"
            aria-label={t("highlightColor")}
            onChange={(event) => {
              const nextValue = event.target.value;
              setToolbarState((previous) => ({ ...previous, highlightColor: nextValue }));
              editor.chain().focus().setHighlight({ color: nextValue }).run();
            }}
          />
        </label>

        <label className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs">
          <Type className="h-4 w-4" />
          <span className="sr-only">{t("fontSize")}</span>
          <select
            value={toolbarState.fontSize}
            className="bg-transparent text-xs outline-none"
            aria-label={t("fontSize")}
            onChange={(event) => {
              const nextValue = event.target.value;
              setToolbarState((previous) => ({ ...previous, fontSize: nextValue }));
              if (nextValue) {
                editor.chain().focus().setFontSize(nextValue).run();
              } else {
                editor.chain().focus().unsetFontSize().run();
              }
            }}
          >
            <option value="">{t("none")}</option>
            {FONT_SIZE_OPTIONS.filter(Boolean).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

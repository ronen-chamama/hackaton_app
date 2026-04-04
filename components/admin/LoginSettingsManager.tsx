"use client";

import { FormEvent, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

interface LoginSettingsManagerProps {
  initialMessage: string;
  initialImageUrl: string | null;
}

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1920;
const WEBP_QUALITY = 0.8;

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read image"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = dataUrl;
  });
}

async function compressImageToWebp(file: File): Promise<Blob> {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);

  const ratio = Math.min(
    MAX_IMAGE_WIDTH / image.naturalWidth,
    MAX_IMAGE_HEIGHT / image.naturalHeight,
    1
  );

  const targetWidth = Math.max(1, Math.round(image.naturalWidth * ratio));
  const targetHeight = Math.max(1, Math.round(image.naturalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to initialize canvas");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
  });

  if (blob) {
    return blob;
  }

  const fallbackDataUrl = canvas.toDataURL("image/webp", WEBP_QUALITY);
  const fallbackResponse = await fetch(fallbackDataUrl);
  return fallbackResponse.blob();
}

export function LoginSettingsManager({
  initialMessage,
  initialImageUrl,
}: LoginSettingsManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState(initialMessage);
  const [storedImageUrl, setStoredImageUrl] = useState(initialImageUrl ?? "");
  const [previewImageUrl, setPreviewImageUrl] = useState(initialImageUrl ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [isLoginSettingsOpen, setIsLoginSettingsOpen] = useState(false);

  const handleFileChange = async (file: File | null) => {
    setSelectedFile(file);
    setSaveStatus("idle");

    if (!file) {
      setPreviewImageUrl(storedImageUrl);
      return;
    }

    try {
      const previewDataUrl = await readFileAsDataUrl(file);
      setPreviewImageUrl(previewDataUrl);
    } catch (error) {
      console.error("Failed to read login image preview:", error);
      setPreviewImageUrl(storedImageUrl);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");

    try {
      let nextImageUrl = storedImageUrl || null;

      if (selectedFile) {
        const compressedBlob = await compressImageToWebp(selectedFile);
        const objectPath = `login/${Date.now()}-${crypto.randomUUID()}.webp`;

        const { error: uploadError } = await supabase.storage
          .from("assets")
          .upload(objectPath, compressedBlob, {
            contentType: "image/webp",
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("assets")
          .getPublicUrl(objectPath);

        nextImageUrl = publicUrlData.publicUrl;
      }

      const { error: upsertError } = await supabase.from("login_settings").upsert(
        {
          id: 1,
          message: message.trim(),
          image_url: nextImageUrl,
        },
        { onConflict: "id" }
      );

      if (upsertError) {
        throw upsertError;
      }

      setStoredImageUrl(nextImageUrl ?? "");
      setPreviewImageUrl(nextImageUrl ?? "");
      setSelectedFile(null);
      setSaveStatus("saved");
    } catch (error) {
      console.error("Failed to save login settings:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm">
      <button
        type="button"
        onClick={() => setIsLoginSettingsOpen((previous) => !previous)}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-4 text-lg font-semibold text-foreground hover:bg-background/60"
        aria-expanded={isLoginSettingsOpen}
      >
        <span>{t("loginPageManagement")}</span>
        {isLoginSettingsOpen ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>

      <div className={isLoginSettingsOpen ? "block border-t border-border p-4" : "hidden"}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">{t("loginMessageLabel")}</span>
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setSaveStatus("idle");
              }}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">{t("loginImageLabel")}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleFileChange(file);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          {previewImageUrl ? (
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <img
                src={previewImageUrl}
                alt={t("loginImageLabel")}
                className="h-48 w-full object-cover"
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? t("saving") : t("saveLoginSettings")}
            </button>

            {saveStatus === "saved" ? (
              <span className="text-sm text-success">{t("saved")}</span>
            ) : null}
            {saveStatus === "error" ? (
              <span className="text-sm text-danger">{t("errorGeneric")}</span>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}

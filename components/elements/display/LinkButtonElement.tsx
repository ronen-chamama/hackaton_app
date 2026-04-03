"use client";

interface LinkButtonElementProps {
  label: string;
  url: string;
}

export function LinkButtonElement({ label, url }: LinkButtonElementProps) {
  const href = url.trim();
  const isValid = href.length > 0;

  return (
    <a
      href={isValid ? href : "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      onClick={(event) => {
        if (!isValid) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </a>
  );
}

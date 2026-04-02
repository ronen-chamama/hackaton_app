interface ImageElementProps {
  url: string;
  alt: string;
}

export function ImageElement({ url, alt }: ImageElementProps) {
  if (!url) {
    return null;
  }

  return (
    <img
      src={url}
      alt={alt}
      className="h-auto w-full rounded-lg border border-border object-cover"
      loading="lazy"
    />
  );
}

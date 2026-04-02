interface VideoElementProps {
  youtubeId: string;
}

export function VideoElement({ youtubeId }: VideoElementProps) {
  if (!youtubeId) {
    return null;
  }

  const src = `https://www.youtube.com/embed/${youtubeId}`;

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-black">
      <div className="aspect-video">
        <iframe
          src={src}
          title={youtubeId}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}

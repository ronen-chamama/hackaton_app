interface InfoCardElementProps {
  cardTitle: string;
  cardText: string;
  titleBgColor: string;
  titleTextColor: string;
  cardBorderColor: string;
  cardShadowColor: string;
  titleAlignment?: "right" | "center" | "left";
  emojiIcon: string;
}

function getTitleJustifyClass(titleAlignment: "right" | "center" | "left"): string {
  if (titleAlignment === "center") return "justify-center";
  if (titleAlignment === "left") return "justify-end";
  return "justify-start";
}

export function InfoCardElement({
  cardTitle,
  cardText,
  titleBgColor,
  titleTextColor,
  cardBorderColor,
  cardShadowColor,
  titleAlignment = "right",
  emojiIcon,
}: InfoCardElementProps) {
  const titleBorderColor = cardBorderColor.trim();
  const titleBackground = titleBgColor.trim() || "#f4ede1";
  const titleColor = titleTextColor.trim() || "#111827";
  const shadowColor = cardShadowColor.trim();

  return (
    <article
      className="rounded-xl p-6"
      dir="rtl"
      style={{
        boxShadow: shadowColor ? `4px 4px 0px ${shadowColor}` : undefined,
      }}
    >
      <div className={`mb-6 flex ${getTitleJustifyClass(titleAlignment)}`}>
        <div
          className="inline-flex items-center gap-3 rounded-lg border px-4 py-3 text-right"
          style={{
            backgroundColor: titleBackground,
            color: titleColor,
            borderColor: titleBorderColor || undefined,
          }}
        >
          {emojiIcon ? <span className="text-3xl leading-none">{emojiIcon}</span> : null}
          <h3 className="text-lg font-bold">{cardTitle}</h3>
        </div>
      </div>

      <div
        className="tiptap-content px-2 text-right text-base leading-7 text-foreground"
        dangerouslySetInnerHTML={{ __html: cardText || "" }}
      />
    </article>
  );
}

interface HeadingElementProps {
  text: string;
  level: "h1" | "h2" | "h3";
  textAlign?: "left" | "center" | "right";
  subHeading?: string;
  showSeparator?: boolean;
  separatorStyle?: "solid" | "dashed" | "dotted";
  separatorColor?: string;
  subHeadingColor?: string;
}

function getAlignClass(textAlign?: "left" | "center" | "right"): string {
  if (textAlign === "left") return "text-left";
  if (textAlign === "center") return "text-center";
  return "text-right";
}

function getSeparatorClass(separatorStyle?: "solid" | "dashed" | "dotted"): string {
  if (separatorStyle === "dashed") return "border-dashed";
  if (separatorStyle === "dotted") return "border-dotted";
  return "border-solid";
}

export function HeadingElement({
  text,
  level,
  textAlign = "right",
  subHeading = "",
  showSeparator = false,
  separatorStyle = "solid",
  separatorColor = "",
  subHeadingColor = "",
}: HeadingElementProps) {
  const alignClass = getAlignClass(textAlign);
  const separatorClass = getSeparatorClass(separatorStyle);
  const trimmedSubHeading = subHeading.trim();

  let headingClass = `font-semibold text-foreground ${alignClass}`;
  if (level === "h1") {
    headingClass = `text-3xl ${headingClass}`;
  } else if (level === "h3") {
    headingClass = `text-xl ${headingClass}`;
  } else {
    headingClass = `text-2xl ${headingClass}`;
  }

  const headingNode =
    level === "h1" ? (
      <h1 className={headingClass}>{text}</h1>
    ) : level === "h3" ? (
      <h3 className={headingClass}>{text}</h3>
    ) : (
      <h2 className={headingClass}>{text}</h2>
    );

  return (
    <div className="flex flex-col gap-2">
      {headingNode}
      {showSeparator ? (
        <div
          className={`w-full border-t-2 ${separatorClass}`}
          style={{ borderColor: separatorColor || undefined }}
        />
      ) : null}
      {trimmedSubHeading ? (
        <p
          className={`text-base text-foreground/75 ${alignClass}`}
          style={{ color: subHeadingColor || undefined }}
        >
          {trimmedSubHeading}
        </p>
      ) : null}
    </div>
  );
}

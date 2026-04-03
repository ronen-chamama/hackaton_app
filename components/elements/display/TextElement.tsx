interface TextElementProps {
  content: string;
  textAlign?: "left" | "center" | "right";
}

function getAlignClass(textAlign?: "left" | "center" | "right"): string {
  if (textAlign === "left") return "text-left";
  if (textAlign === "center") return "text-center";
  return "text-right";
}

export function TextElement({ content, textAlign = "right" }: TextElementProps) {
  return (
    <div
      className={`text-base leading-7 ${getAlignClass(textAlign)}`}
      dir="rtl"
      dangerouslySetInnerHTML={{ __html: content || "" }}
    />
  );
}

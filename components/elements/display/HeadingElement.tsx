interface HeadingElementProps {
  text: string;
  level: "h1" | "h2" | "h3";
}

export function HeadingElement({ text, level }: HeadingElementProps) {
  if (level === "h1") {
    return <h1 className="text-3xl font-semibold text-foreground">{text}</h1>;
  }

  if (level === "h3") {
    return <h3 className="text-xl font-semibold text-foreground">{text}</h3>;
  }

  return <h2 className="text-2xl font-semibold text-foreground">{text}</h2>;
}

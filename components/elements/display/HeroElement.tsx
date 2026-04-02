interface HeroElementProps {
  title: string;
  subtitle?: string;
  align?: "center" | "right";
}

export function HeroElement({ title, subtitle, align = "right" }: HeroElementProps) {
  const alignmentClass = align === "center" ? "text-center" : "text-right";

  return (
    <section className="rounded-xl border border-primary/25 bg-primary/8 p-6 md:p-8">
      <div className={alignmentClass}>
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">{title}</h2>
        {subtitle ? (
          <p className="mt-3 text-base leading-7 text-foreground/80">{subtitle}</p>
        ) : null}
      </div>
    </section>
  );
}

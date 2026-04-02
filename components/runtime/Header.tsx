interface RuntimeHeaderProps {
  title: string;
  slogan: string;
  description: string;
}

export function RuntimeHeader({ title, slogan, description }: RuntimeHeaderProps) {
  return (
    <header className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {slogan ? <p className="mt-2 text-base text-foreground/80">{slogan}</p> : null}
      {description ? (
        <p className="mt-3 text-sm leading-6 text-foreground/70">{description}</p>
      ) : null}
    </header>
  );
}

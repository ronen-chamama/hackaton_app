interface AlertElementProps {
  type: "info" | "warning" | "success";
  text: string;
}

export function AlertElement({ type, text }: AlertElementProps) {
  const variantClass =
    type === "warning"
      ? "border-warning/40 bg-warning/10 text-warning"
      : type === "success"
        ? "border-success/40 bg-success/10 text-success"
        : "border-info/40 bg-info/10 text-info";

  return (
    <div className={`rounded-lg border px-4 py-3 ${variantClass}`}>
      <p className="text-sm leading-6">{text}</p>
    </div>
  );
}

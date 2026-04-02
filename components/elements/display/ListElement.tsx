interface ListElementProps {
  items: string[];
  style: "bullets" | "numbers";
}

export function ListElement({ items, style }: ListElementProps) {
  if (style === "numbers") {
    return (
      <ol className="list-decimal space-y-1 pr-6">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="text-base leading-7">
            {item}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="list-disc space-y-1 pr-6">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="text-base leading-7">
          {item}
        </li>
      ))}
    </ul>
  );
}

interface ListElementProps {
  listItems: string[];
  style: "bullets" | "numbers";
}

export function ListElement({ listItems, style }: ListElementProps) {
  if (style === "numbers") {
    return (
      <ol className="list-decimal list-inside space-y-1">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`} className="text-base leading-7">
            {item}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="list-disc list-inside space-y-1">
      {listItems.map((item, index) => (
        <li key={`${item}-${index}`} className="text-base leading-7">
          {item}
        </li>
      ))}
    </ul>
  );
}

interface TextElementProps {
  content: string;
}

export function TextElement({ content }: TextElementProps) {
  return <p className="text-base leading-7 whitespace-pre-wrap">{content}</p>;
}

import type { BotLine } from "@/lib/spotlight-sync/bot";

export function BotMessage({ line }: { line: BotLine }) {
  if (!line.emphasis) return line.text;

  const index = line.text.toLocaleLowerCase().indexOf(line.emphasis.toLocaleLowerCase());
  if (index < 0) return line.text;

  const end = index + line.emphasis.length;
  return (
    <>
      {line.text.slice(0, index)}
      <mark className="sl-bot-highlight">{line.text.slice(index, end)}</mark>
      {line.text.slice(end)}
    </>
  );
}

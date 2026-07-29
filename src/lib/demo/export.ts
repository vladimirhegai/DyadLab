import type { DemoEvent } from "./types";

export function eventsToCsv(events: DemoEvent[]): string {
  const header = ["timestamp", "participant", "event", "value"];
  const rows = events.map((e) => [e.timestamp, e.actor, e.type, e.value]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function eventsToJson(events: DemoEvent[]): string {
  return JSON.stringify(
    events.map((e) => ({
      timestamp: e.timestamp,
      participant: e.actor,
      event: e.type,
      value: e.value,
    })),
    null,
    2,
  );
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

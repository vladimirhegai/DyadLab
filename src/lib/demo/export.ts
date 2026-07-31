import type { DemoEvent } from "./types";

export const EVENT_EXPORT_HEADER = [
  "schema_version",
  "session_code",
  "event_id",
  "sequence",
  "elapsed_ms",
  "recorded_at_utc",
  "round",
  "participant",
  "event",
  "payload_json",
  "value",
] as const;

export function parseEventValue(value: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const part of value.replaceAll(",", ";").split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const raw = part.slice(separator + 1).trim();
    if (!key) continue;
    if (raw === "true" || raw === "false") {
      payload[key] = raw === "true";
    } else if (raw !== "" && Number.isFinite(Number(raw))) {
      payload[key] = Number(raw);
    } else {
      payload[key] = raw;
    }
  }
  if (Object.keys(payload).length === 0 && value) payload.rawValue = value;
  return payload;
}

function roundFrom(event: DemoEvent, payload: Record<string, unknown>) {
  if (event.round !== undefined && event.round !== null) return event.round;
  const candidate = payload.round;
  return typeof candidate === "number" ? candidate : "";
}

function eventToExportRow(event: DemoEvent, index: number) {
  const payload = event.payload ?? parseEventValue(event.value);
  return {
    schema_version: event.schemaVersion ?? 2,
    session_code: event.sessionCode ?? "DEMO",
    event_id: event.id,
    sequence: event.sequence ?? index + 1,
    elapsed_ms: event.elapsedMs,
    recorded_at_utc: event.recordedAt ?? "",
    round: roundFrom(event, payload),
    participant: event.actor,
    event: event.type,
    payload,
    payload_json: JSON.stringify(payload),
    value: event.value,
  };
}

export function eventsToCsv(events: DemoEvent[]): string {
  const rows = events.map((event, index) => {
    const row = eventToExportRow(event, index);
    return EVENT_EXPORT_HEADER.map((column) => row[column]);
  });
  return [EVENT_EXPORT_HEADER, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}

export function eventsToJson(events: DemoEvent[]): string {
  return JSON.stringify(
    events.map((event, index) => {
      const row = eventToExportRow(event, index);
      return Object.fromEntries(
        Object.entries(row).filter(([key]) => key !== "payload_json"),
      );
    }),
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

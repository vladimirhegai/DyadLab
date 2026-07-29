export interface SampleRow {
  timestamp: string;
  participant: string;
  event: string;
  value: string;
}

export const SAMPLE_ROWS: SampleRow[] = [
  { timestamp: "00:00:04", participant: "P01", event: "joined_session", value: "successful" },
  { timestamp: "00:00:08", participant: "P02", event: "joined_session", value: "successful" },
  { timestamp: "00:00:15", participant: "P01", event: "card_selected", value: "c1" },
  { timestamp: "00:00:19", participant: "P02", event: "card_selected", value: "c1" },
  { timestamp: "00:00:19", participant: "session", event: "agreement_reached", value: "c1" },
  { timestamp: "00:00:27", participant: "researcher", event: "video_condition", value: "blurred (P02)" },
  { timestamp: "00:01:03", participant: "P01", event: "card_selected", value: "c2" },
  { timestamp: "00:01:11", participant: "session", event: "agreement_reached", value: "c2" },
  { timestamp: "00:01:42", participant: "session", event: "task_completed", value: "correct (100%, 98s)" },
];

export function sampleRowsToCsv(rows: SampleRow[]): string {
  const header = ["timestamp", "participant", "event", "value"];
  const body = rows.map((r) => [r.timestamp, r.participant, r.event, r.value]);
  return [header, ...body]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function sampleRowsToJson(rows: SampleRow[]): string {
  return JSON.stringify(rows, null, 2);
}

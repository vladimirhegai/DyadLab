export interface SampleRow {
  timestamp: string;
  participant: string;
  event: string;
  value: string;
}

export const SAMPLE_ROWS: SampleRow[] = [
  { timestamp: "00:00:04", participant: "P01", event: "joined_session", value: "successful" },
  { timestamp: "00:00:08", participant: "P02", event: "joined_session", value: "successful" },
  { timestamp: "00:00:12", participant: "session", event: "round_started", value: "round=1" },
  { timestamp: "00:00:15", participant: "P01", event: "signal_selected", value: "round=1;signal=s01-magenta-circle;correct=true;rt_ms=3120" },
  { timestamp: "00:00:16", participant: "P02", event: "signal_selected", value: "round=1;signal=s01-magenta-circle;correct=true;rt_ms=3540" },
  { timestamp: "00:00:16", participant: "session", event: "joint_target_found", value: "round=1;sync_ms=420;rt_ms=3540" },
  { timestamp: "00:00:27", participant: "researcher", event: "video_condition", value: "blurred (P02)" },
  { timestamp: "00:00:28", participant: "researcher", event: "feedback_condition", value: "mode=neutral" },
  { timestamp: "00:00:43", participant: "session", event: "task_completed", value: "hits=4;misses=0;accuracy=100;mean_sync_ms=510" },
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

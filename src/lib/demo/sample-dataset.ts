import { EVENT_EXPORT_HEADER } from "./export";

export interface SampleRow {
  schema_version: number;
  session_code: string;
  event_id: string;
  sequence: number;
  elapsed_ms: number;
  recorded_at_utc: string;
  round: number | "";
  participant: string;
  event: string;
  payload: Record<string, unknown>;
  value: string;
}

export const SAMPLE_ROWS: SampleRow[] = [
  {
    schema_version: 2,
    session_code: "SAMPLE",
    event_id: "evt-1",
    sequence: 1,
    elapsed_ms: 4120,
    recorded_at_utc: "2026-07-31T14:00:04.120Z",
    round: "",
    participant: "P01",
    event: "joined_session",
    payload: { rawValue: "successful" },
    value: "successful",
  },
  {
    schema_version: 2,
    session_code: "SAMPLE",
    event_id: "evt-2",
    sequence: 2,
    elapsed_ms: 8010,
    recorded_at_utc: "2026-07-31T14:00:08.010Z",
    round: "",
    participant: "P02",
    event: "joined_session",
    payload: { rawValue: "successful" },
    value: "successful",
  },
  {
    schema_version: 2,
    session_code: "SAMPLE",
    event_id: "evt-3",
    sequence: 3,
    elapsed_ms: 12004,
    recorded_at_utc: "2026-07-31T14:00:12.004Z",
    round: 1,
    participant: "session",
    event: "spotlight_round_started",
    payload: { round: 1 },
    value: "round=1",
  },
  {
    schema_version: 2,
    session_code: "SAMPLE",
    event_id: "evt-4",
    sequence: 4,
    elapsed_ms: 15120,
    recorded_at_utc: "2026-07-31T14:00:15.120Z",
    round: 1,
    participant: "P01",
    event: "spotlight_position_sample",
    payload: { round: 1, x: 0.78, y: 0.73, sampleRateHz: 10 },
    value: "round=1;x=0.78;y=0.73",
  },
  {
    schema_version: 2,
    session_code: "SAMPLE",
    event_id: "evt-5",
    sequence: 5,
    elapsed_ms: 16322,
    recorded_at_utc: "2026-07-31T14:00:16.322Z",
    round: 1,
    participant: "session",
    event: "spotlight_joint_found",
    payload: {
      round: 1,
      convergenceMs: 2120,
      reactionTimeMs: 4318,
      falseLocks: 0,
      success: true,
      targetId: "mug",
    },
    value:
      "round=1;convergence_ms=2120;rt_ms=4318;false_locks=0",
  },
];

export function sampleRowsToCsv(rows: SampleRow[]): string {
  const body = rows.map((row) => {
    const exportRow = {
      ...row,
      payload_json: JSON.stringify(row.payload),
    };
    return EVENT_EXPORT_HEADER.map((column) => exportRow[column]);
  });
  return [EVENT_EXPORT_HEADER, ...body]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}

export function sampleRowsToJson(rows: SampleRow[]): string {
  return JSON.stringify(rows, null, 2);
}

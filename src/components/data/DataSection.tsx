"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { downloadFile } from "@/lib/demo/export";
import { SAMPLE_ROWS, sampleRowsToCsv, sampleRowsToJson } from "@/lib/demo/sample-dataset";

export function DataSection() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <div className="section-shell grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-start">
        <div>
          <SectionHeading
            eyebrow="What the platform records"
            title="Every condition change and task event, timestamped"
            description="Structured, consistent data is the point of the platform — not a byproduct. Each row below is a real event type the system emits: session joins, researcher-applied conditions, task selections, agreement detection, and completion."
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => downloadFile("dyadlab-sample-data.csv", sampleRowsToCsv(SAMPLE_ROWS), "text/csv")}
            >
              Download sample data (CSV)
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                downloadFile("dyadlab-sample-data.json", sampleRowsToJson(SAMPLE_ROWS), "application/json")
              }
            >
              Download sample data (JSON)
            </Button>
          </div>
        </div>

        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-black/[0.02] text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2.5 font-semibold">Timestamp</th>
                  <th className="px-3 py-2.5 font-semibold">Participant</th>
                  <th className="px-3 py-2.5 font-semibold">Event</th>
                  <th className="px-3 py-2.5 font-semibold">Value</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {SAMPLE_ROWS.map((row, i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-black/[0.015]" : ""}>
                    <td className="px-3 py-2 text-ink-muted">{row.timestamp}</td>
                    <td className="px-3 py-2 font-semibold text-accent-strong">{row.participant}</td>
                    <td className="px-3 py-2 text-ink">{row.event}</td>
                    <td className="px-3 py-2 text-ink-muted">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

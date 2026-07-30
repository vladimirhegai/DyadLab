"use client";

import { useEffect, useRef } from "react";
import type { DemoEvent } from "@/lib/demo/types";
import { downloadFile, eventsToCsv, eventsToJson } from "@/lib/demo/export";
import { Button } from "@/components/ui/Button";

const ACTOR_LABEL: Record<string, string> = {
  researcher: "researcher",
  session: "session",
  P01: "P01",
  P02: "P02",
};

export function EventTimeline({
  events,
  exportPrefix = "dyadlab-demo-events",
  emptyMessage = "Waiting for participants to join…",
  bodyClassName = "h-56",
  compact = false,
}: {
  events: DemoEvent[];
  exportPrefix?: string;
  emptyMessage?: string;
  /** Lets a caller trade the fixed height for a flexible one in a side rail. */
  bodyClassName?: string;
  /** Stacks the header for narrow side rails. */
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="card-surface flex min-w-0 flex-col overflow-hidden p-5">
      <div
        className={
          compact
            ? "mb-2 flex flex-col gap-1.5"
            : "mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        }
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Event timeline</p>
        <div className={compact ? "flex gap-1.5" : "flex gap-1.5 self-end sm:self-auto"}>
          <Button
            size="sm"
            variant="ghost"
            disabled={events.length === 0}
            onClick={() => downloadFile(`${exportPrefix}.csv`, eventsToCsv(events), "text/csv")}
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={events.length === 0}
            onClick={() => downloadFile(`${exportPrefix}.json`, eventsToJson(events), "application/json")}
          >
            Export JSON
          </Button>
        </div>
      </div>
      <div ref={scrollRef} className={`${bodyClassName} overflow-y-auto rounded-xl bg-bg-soft p-3 font-mono text-[12px] leading-relaxed`}>
        {events.length === 0 && <p className="text-ink-muted">{emptyMessage}</p>}
        {events.map((e) =>
          compact ? (
            // A side rail is too narrow for one line per event, and a clipped
            // log reads as broken rather than as data.
            <div key={e.id} className="mb-1.5 min-w-0 border-l-2 border-accent/15 pl-2">
              <div className="flex min-w-0 gap-1.5 text-[11px] text-ink-muted">
                <span className="shrink-0 text-ink-muted/70">{e.timestamp}</span>
                <span className="shrink-0 font-semibold text-accent-strong">
                  {ACTOR_LABEL[e.actor] ?? e.actor}
                </span>
              </div>
              <div className="min-w-0 break-all text-[11px] text-ink">{e.type}</div>
              {e.value && (
                <div className="min-w-0 break-all text-[10px] text-ink-muted">{e.value}</div>
              )}
            </div>
          ) : (
            <div key={e.id} className="flex min-w-0 gap-2 text-ink-muted">
              <span className="shrink-0 text-ink-muted/70">{e.timestamp}</span>
              <span className="shrink-0 font-semibold text-accent-strong">
                {ACTOR_LABEL[e.actor] ?? e.actor}
              </span>
              <span className="shrink-0">{e.type}</span>
              <span className="min-w-0 truncate text-ink">{e.value}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

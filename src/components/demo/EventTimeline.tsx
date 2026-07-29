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

export function EventTimeline({ events }: { events: DemoEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="card-surface flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Event timeline</p>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            disabled={events.length === 0}
            onClick={() => downloadFile("dyadlab-demo-events.csv", eventsToCsv(events), "text/csv")}
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={events.length === 0}
            onClick={() => downloadFile("dyadlab-demo-events.json", eventsToJson(events), "application/json")}
          >
            Export JSON
          </Button>
        </div>
      </div>
      <div ref={scrollRef} className="h-56 overflow-y-auto rounded-md bg-black/[0.02] p-3 font-mono text-[12px] leading-relaxed">
        {events.length === 0 && <p className="text-ink-muted">Waiting for participants to join…</p>}
        {events.map((e) => (
          <div key={e.id} className="flex gap-2 text-ink-muted">
            <span className="shrink-0 text-ink-muted/70">{e.timestamp}</span>
            <span className="shrink-0 font-semibold text-accent-strong">{ACTOR_LABEL[e.actor] ?? e.actor}</span>
            <span className="shrink-0">{e.type}</span>
            <span className="truncate text-ink">{e.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

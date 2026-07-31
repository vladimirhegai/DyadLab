"use client";

import { useRef, useState } from "react";
import { SPOTLIGHT_OBJECTS, SPOTLIGHT_OBJECT_BY_ID } from "@/lib/spotlight-sync/rounds";
import type {
  SpotlightRoundMeasures,
  SpotlightRoundTrace,
} from "@/lib/spotlight-sync/types";

/**
 * Search-trace replay.
 *
 * Both spotlight paths are sampled at 20 Hz during play and redrawn here over a
 * schematic of the room. This is the part of the artifact that shows what the
 * task is actually for: the recorded behaviour, not the animation.
 */

function toPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${(point.x * 1000).toFixed(1)} ${(point.y * 620).toFixed(1)}`)
    .join(" ");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">{label}</p>
      <p className="font-display mt-0.5 truncate text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

export function SpotlightTrace({
  traces,
  measures,
}: {
  traces: SpotlightRoundTrace[];
  measures: SpotlightRoundMeasures[];
}) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (!traces.length) {
    return (
      <div className="card-surface p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-magenta">
          Search trace
        </p>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
          Both spotlight paths are sampled while you play. Finish a round and the
          replay appears here — the same view a researcher would use to compare how
          a pair coordinated across a session.
        </p>
      </div>
    );
  }

  const index = Math.min(active, traces.length - 1);
  const trace = traces[index];
  const measure = measures[index];
  const target = SPOTLIGHT_OBJECT_BY_ID.get(trace.targetId);
  const selectTab = (nextIndex: number) => {
    const normalized = (nextIndex + traces.length) % traces.length;
    setActive(normalized);
    tabRefs.current[normalized]?.focus();
  };

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-magenta">
            Search trace replay
          </p>
          <h3 className="font-display mt-1 text-xl font-semibold text-ink">
            How the pair moved through the scene
          </h3>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Round">
          {traces.map((item, itemIndex) => (
            <button
              key={item.roundIndex}
              ref={(element) => {
                tabRefs.current[itemIndex] = element;
              }}
              type="button"
              role="tab"
              id={`spotlight-trace-tab-${itemIndex}`}
              aria-controls={`spotlight-trace-panel-${itemIndex}`}
              aria-selected={itemIndex === index}
              tabIndex={itemIndex === index ? 0 : -1}
              onClick={() => setActive(itemIndex)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  selectTab(itemIndex + 1);
                } else if (
                  event.key === "ArrowLeft" ||
                  event.key === "ArrowUp"
                ) {
                  event.preventDefault();
                  selectTab(itemIndex - 1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  selectTab(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  selectTab(traces.length - 1);
                }
              }}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                itemIndex === index
                  ? "bg-accent text-white"
                  : "bg-bg-soft text-ink-muted hover:text-accent-strong"
              }`}
            >
              R{item.roundIndex + 1}
            </button>
          ))}
        </div>
      </div>

      <div
        id={`spotlight-trace-panel-${index}`}
        role="tabpanel"
        aria-labelledby={`spotlight-trace-tab-${index}`}
        tabIndex={0}
        className="mt-4 grid gap-5 px-5 pb-5 lg:grid-cols-[1.35fr_1fr]"
      >
        <div className="sl-trace">
          <svg viewBox="0 0 1000 620" role="img" aria-label={`Spotlight paths for round ${index + 1}`}>
            <rect width="1000" height="620" rx="10" fill="#faf1f7" />
            {/* Surface bands, labelled the way the clues describe them. */}
            <g>
              <rect y="0" width="1000" height="260" fill="#7a0f8c" opacity="0.045" />
              <rect y="260" width="1000" height="187" fill="#7a0f8c" opacity="0.08" />
              <rect y="447" width="1000" height="173" fill="#7a0f8c" opacity="0.045" />
              <g stroke="#7a0f8c" strokeWidth="1.5" opacity="0.2" strokeDasharray="7 7">
                <path d="M0 260h1000M0 447h1000" />
              </g>
              <g fill="#7a0f8c" opacity="0.42" fontSize="17" fontWeight="700" letterSpacing="2">
                <text x="16" y="26">UPPER</text>
                <text x="16" y="286">MID</text>
                <text x="16" y="473">LOWER</text>
              </g>
            </g>

            {SPOTLIGHT_OBJECTS.map((object) => (
              <circle
                key={object.id}
                cx={object.x * 1000}
                cy={object.y * 620}
                r={object.id === trace.targetId ? 13 : 7}
                fill={object.id === trace.targetId ? "#d31c77" : "#3a0e52"}
                opacity={object.id === trace.targetId ? 0.95 : 0.22}
              />
            ))}

            <path d={toPath(trace.samples.map((s) => s.p1))} fill="none" stroke="#d31c77" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.82" />
            <path d={toPath(trace.samples.map((s) => s.p2))} fill="none" stroke="#1c8f86" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.82" />

            {trace.lockPoint && (
              <g>
                <circle cx={trace.lockPoint.x * 1000} cy={trace.lockPoint.y * 620} r="26" fill="none" stroke="#7a0f8c" strokeWidth="3" />
                <circle cx={trace.lockPoint.x * 1000} cy={trace.lockPoint.y * 620} r="38" fill="none" stroke="#7a0f8c" strokeWidth="1.5" opacity="0.45" />
              </g>
            )}
          </svg>
          <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-ink-muted">
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-4 rounded-full bg-magenta" /> P01 path</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-4 rounded-full bg-[#1c8f86]" /> P02 path</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-magenta" /> target</span>
          </div>
        </div>

        <div>
          <p className="text-sm leading-relaxed text-ink-muted">
            Round {index + 1} · target <strong className="text-ink">{target?.label}</strong> on the{" "}
            <strong className="text-ink">{target?.surface}</strong> surface.{" "}
            {trace.success ? "Found together." : "Not resolved."}
          </p>
          {measure && (
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
              <Stat label="Search time" value={`${(measure.searchMs / 1000).toFixed(1)}s`} />
              <Stat
                label="Time to overlap"
                value={measure.convergenceMs === null ? "—" : `${measure.convergenceMs} ms`}
              />
              <Stat label="Mean separation" value={measure.meanSeparation.toFixed(3)} />
              <Stat
                label="Dwell on target surface"
                value={`${Math.round(measure.relevantDwell * 100)}%`}
              />
              <Stat label="False locks" value={`${measure.falseLocks}`} />
              <Stat
                label="Distractor"
                value={
                  measure.distractorRelevance === null
                    ? "none"
                    : `${measure.distractorRelevance} · ${measure.distractorCaptured ? "captured" : "resisted"}`
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

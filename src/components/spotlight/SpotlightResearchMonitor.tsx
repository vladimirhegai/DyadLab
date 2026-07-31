"use client";

import { useEffect, useMemo, useRef } from "react";
import { getSpotlightObject } from "@/lib/spotlight-sync/rounds";
import {
  DEFAULT_SPOTLIGHT_POSITIONS,
  type SpotlightPositions,
  type SpotlightTaskState,
} from "@/lib/spotlight-sync/types";
import { SpotlightStage, type StageHandle } from "./SpotlightStage";

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">{detail}</p>
    </div>
  );
}

export function SpotlightResearchMonitor({
  task,
  positions,
}: {
  task: SpotlightTaskState;
  positions: SpotlightPositions;
}) {
  const stageRef = useRef<StageHandle>(null);
  const accuracy = task.history.length
    ? Math.round((task.stats.hits / task.history.length) * 100)
    : 0;
  const meanConvergence = task.stats.convergenceSamples
    ? Math.round(task.stats.convergenceTotalMs / task.stats.convergenceSamples)
    : 0;
  const clues = task.currentRound?.researcherClues;
  const target = task.currentRound?.targetId
    ? getSpotlightObject(task.currentRound.targetId)
    : undefined;
  const foundIds = useMemo(
    () => task.history.filter((outcome) => outcome.success).map((outcome) => outcome.targetId),
    [task.history],
  );

  useEffect(() => {
    stageRef.current?.apply({
      p1: positions.P01 ?? DEFAULT_SPOTLIGHT_POSITIONS.P01!,
      p2: positions.P02 ?? DEFAULT_SPOTLIGHT_POSITIONS.P02!,
      hoverId: null,
      lockId: null,
      lockProgress: 0,
      distractorId: null,
      dt: 16,
    });
  }, [positions]);

  useEffect(() => {
    if (task.phase === "feedback" && task.lastOutcome?.success) {
      const object = getSpotlightObject(task.lastOutcome.targetId);
      if (object) stageRef.current?.celebrate({ x: object.x, y: object.y });
    }
  }, [task.lastOutcome, task.phase]);

  return (
    <section className="card-surface overflow-hidden" aria-label="Spotlight Sync research monitor">
      <header className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 md:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-magenta">
            Live joint-attention view
          </p>
          <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-ink">
            Focus positions
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Both participant spotlights mapped onto the shared search scene.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-magenta-soft px-2.5 py-1 text-[11px] font-semibold text-magenta">
            <i className="h-2 w-2 rounded-full bg-magenta" />
            P01
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f4f1] px-2.5 py-1 text-[11px] font-semibold text-[#176f69]">
            <i className="h-2 w-2 rounded-full bg-[#1c8f86]" />
            P02
          </span>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-strong">
            {task.contextMode === "rich" ? "Rich scene" : "Reduced context"}
          </span>
        </div>
      </header>

      <div className="bg-[#13071d] p-3 md:p-4">
        <div className="researcher-focus-stage sl-stage-wrap">
          <SpotlightStage
            ref={stageRef}
            contextMode={task.contextMode}
            interactive={false}
            foundIds={foundIds}
            selfClue={null}
            ariaLabel="Researcher view of both participant focus positions in the shared search scene."
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-white/60">
          <span>
            {task.status === "active"
              ? `Round ${task.currentRoundIndex + 1} of ${task.roundCount}`
              : task.status === "completed"
                ? "Task complete"
                : "Waiting to begin"}
          </span>
          <span>
            {task.phase === "feedback" && task.lastOutcome
              ? `${task.lastOutcome.success ? "Shared target found" : "Focus mismatch"} · ${task.lastOutcome.convergenceMs}ms`
              : "Positions update continuously while participants search"}
          </span>
        </div>
      </div>

      <div className="grid border-b border-border lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <div className="border-b border-border p-5 md:p-6 lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Current trial
          </p>
          {task.status === "active" && clues ? (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-bg-soft p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-magenta">
                    P01 · {clues.P01.shortLabel}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-ink">{clues.P01.label}</p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {clues.P01.candidates?.length ?? "—"} candidates
                  </p>
                </div>
                <div className="rounded-xl bg-bg-soft p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#176f69]">
                    P02 · {clues.P02.shortLabel}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-ink">{clues.P02.label}</p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {clues.P02.candidates?.length ?? "—"} candidates
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                Target: <strong className="text-ink">{target?.label ?? "—"}</strong>
                {target && (
                  <>
                    {" "}· <strong className="text-ink">{target.surface}</strong> surface, {target.zone}
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              {task.status === "completed"
                ? "All trials completed. Review the outcomes and event log below."
                : "Start Spotlight Sync when both participants are ready."}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 p-5 md:p-6 lg:grid-cols-1">
          <Metric
            label="Accuracy"
            value={task.history.length ? `${accuracy}%` : "—"}
            detail={`${task.stats.hits} shared finds`}
          />
          <Metric
            label="Mean gap"
            value={meanConvergence ? `${meanConvergence}ms` : "—"}
            detail="Between choices"
          />
          <Metric
            label="Best streak"
            value={`${task.stats.bestStreak}`}
            detail={`${task.stats.misses} mismatches`}
          />
        </div>
      </div>

      {task.history.length > 0 && (
        <div className="px-5 py-4 md:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Resolved trials
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {task.history.map((outcome, index) => (
              <span
                key={outcome.roundId}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  outcome.success ? "bg-accent-soft text-accent-strong" : "bg-warn-soft text-warn"
                }`}
              >
                R{index + 1} · {outcome.success ? "hit" : "miss"} · {outcome.convergenceMs}ms
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

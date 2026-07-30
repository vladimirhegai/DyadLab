import { getSpotlightObject } from "@/lib/spotlight-sync/rounds";
import type {
  SpotlightPositions,
  SpotlightTaskState,
} from "@/lib/spotlight-sync/types";

function Value({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{detail}</p>
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

  return (
    <section className="card-surface overflow-hidden" aria-label="Spotlight Sync research monitor">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-magenta">
            Joint attention monitor
          </p>
          <h3 className="font-display mt-1 text-xl font-semibold text-ink">Spotlight Sync</h3>
        </div>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-strong">
          {task.contextMode === "rich" ? "Rich scene context" : "Reduced context"}
        </span>
      </div>

      <div className="mt-5 grid gap-5 border-y border-border px-5 py-5 sm:grid-cols-3">
        <Value label="Accuracy" value={task.history.length ? `${accuracy}%` : "—"} detail={`${task.stats.hits} shared finds`} />
        <Value label="Mean gap" value={meanConvergence ? `${meanConvergence}ms` : "—"} detail="Between focus choices" />
        <Value label="Best streak" value={`${task.stats.bestStreak}`} detail={`${task.stats.misses} mismatched rounds`} />
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[1fr_220px]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Current trial
          </p>
          {task.status === "active" && clues ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-bg-soft p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-magenta">
                  P01 · {clues.P01.shortLabel}
                </span>
                <p className="mt-1 text-sm font-semibold text-ink">{clues.P01.label}</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {clues.P01.candidates?.length ?? "—"} candidate objects
                </p>
              </div>
              <div className="rounded-xl bg-bg-soft p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                  P02 · {clues.P02.shortLabel}
                </span>
                <p className="mt-1 text-sm font-semibold text-ink">{clues.P02.label}</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {clues.P02.candidates?.length ?? "—"} candidate objects
                </p>
              </div>
              <p className="sm:col-span-2 text-xs text-ink-muted">
                Target: <strong className="text-ink">{target?.label ?? "—"}</strong>
                {target && (
                  <>
                    {" "}· <strong className="text-ink">{target.surface}</strong> surface,{" "}
                    {target.zone}
                  </>
                )}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              {task.status === "completed" ? "All trials completed." : "Start the task to inspect private clues."}
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Live focus positions
          </p>
          <div className="spotlight-mini-map mt-3" aria-label="Normalized participant focus positions">
            {(["P01", "P02"] as const).map((participant) => {
              const point = positions[participant];
              if (!point) return null;
              return (
                <span
                  key={participant}
                  className={participant.toLowerCase()}
                  style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
                  title={`${participant}: ${point.x.toFixed(2)}, ${point.y.toFixed(2)}`}
                >
                  {participant}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {task.history.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Resolved trials</p>
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

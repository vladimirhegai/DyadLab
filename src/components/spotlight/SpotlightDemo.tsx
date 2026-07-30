"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { EventTimeline } from "@/components/demo/EventTimeline";
import { Button } from "@/components/ui/Button";
import type { DemoEvent, EventType } from "@/lib/demo/types";
import {
  botSay,
  createBotState,
  resetBotForRound,
  stepBot,
  type BotLine,
  type BotState,
} from "@/lib/spotlight-sync/bot";
import {
  createEngineState,
  ENGINE,
  meanConvergence,
  objectUnder,
  startRound,
  stepEngine,
  type EngineEffect,
  type EngineState,
} from "@/lib/spotlight-sync/engine";
import {
  getSpotlightObject,
  SPOTLIGHT_ROUNDS,
} from "@/lib/spotlight-sync/rounds";
import {
  DEFAULT_SPOTLIGHT_POSITIONS,
  sceneDistance,
  type SpotlightContextMode,
  type SpotlightFeedbackMode,
  type SpotlightPoint,
  type SpotlightRoundMeasures,
  type SpotlightRoundTrace,
} from "@/lib/spotlight-sync/types";
import { CallStrip } from "./CallStrip";
import { BotMessage } from "./BotMessage";
import { SpotlightStage, type StageHandle } from "./SpotlightStage";
import { SpotlightTrace } from "./SpotlightTrace";

const MemoStage = memo(SpotlightStage);

const ROUND_COUNT = SPOTLIGHT_ROUNDS.length;
type DemoFeedbackMode = SpotlightFeedbackMode | "none";
type PartnerGuidanceMode = "hints" | "silent";

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `00:${minutes}:${seconds}`;
}

interface ViewState {
  phase: "idle" | "playing" | "feedback" | "completed";
  roundIndex: number;
  foundIds: string[];
  hits: number;
  misses: number;
  bestStreak: number;
  lastSuccess: boolean | null;
  lastLabel: string | null;
  measures: SpotlightRoundMeasures[];
  traces: SpotlightRoundTrace[];
}

const IDLE_VIEW: ViewState = {
  phase: "idle",
  roundIndex: 0,
  foundIds: [],
  hits: 0,
  misses: 0,
  bestStreak: 0,
  lastSuccess: null,
  lastLabel: null,
  measures: [],
  traces: [],
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-display text-lg font-semibold tracking-tight text-white">{value}</p>
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.11em] text-white/50">
        {label}
      </p>
    </div>
  );
}

export function SpotlightDemo() {
  const [view, setView] = useState<ViewState>(IDLE_VIEW);
  const [hud, setHud] = useState({ elapsedMs: 0, separation: 1 });
  const [botLine, setBotLine] = useState<(BotLine & { seq: number }) | null>(null);
  const [botSpeaking, setBotSpeaking] = useState(false);
  const [notice, setNotice] = useState<{ text: string; seq: number } | null>(null);
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [contextMode, setContextMode] = useState<SpotlightContextMode>("rich");
  const [feedbackMode, setFeedbackMode] = useState<DemoFeedbackMode>("warm");
  const [partnerGuidance, setPartnerGuidance] = useState<PartnerGuidanceMode>("hints");
  const [running, setRunning] = useState(false);

  const stageRef = useRef<StageHandle>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EngineState | null>(null);
  const botRef = useRef<BotState | null>(null);
  const pointerRef = useRef<SpotlightPoint>({ ...DEFAULT_SPOTLIGHT_POSITIONS.P01! });
  const eventSeq = useRef(0);
  const botSeqRef = useRef(-1);
  const botLineRef = useRef(false);
  const hudAtRef = useRef(0);
  const noticeSeq = useRef(0);
  const noticeTimer = useRef<number | null>(null);
  const dwellRef = useRef({ id: null as string | null, ms: 0, warned: new Set<string>() });

  const round = SPOTLIGHT_ROUNDS[Math.min(view.roundIndex, ROUND_COUNT - 1)];
  const ownClue = round.clues.P01;
  const partnerClue = round.clues.P02;

  const pushEvents = useCallback(
    (entries: { actor: DemoEvent["actor"]; type: EventType; value: string; at: number }[]) => {
      if (!entries.length) return;
      setEvents((current) => [
        ...current,
        ...entries.map((entry) => {
          eventSeq.current += 1;
          return {
            id: `spotlight-demo-${eventSeq.current}`,
            elapsedMs: Math.round(entry.at),
            timestamp: formatClock(entry.at),
            actor: entry.actor,
            type: entry.type,
            value: entry.value,
          } satisfies DemoEvent;
        }),
      ]);
    },
    [],
  );

  const showNotice = useCallback((text: string) => {
    noticeSeq.current += 1;
    setNotice({ text, seq: noticeSeq.current });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2600);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  const start = useCallback(() => {
    const partnerStart = { ...DEFAULT_SPOTLIGHT_POSITIONS.P02! };
    const engine = createEngineState(pointerRef.current, partnerStart);
    const bot = createBotState(partnerStart);
    const effects: EngineEffect[] = [];
    startRound(engine, 0, effects);
    resetBotForRound(bot, 0, 0);
    engineRef.current = engine;
    botRef.current = bot;
    botSeqRef.current = -1;
    eventSeq.current = 0;
    stageRef.current?.reset();
    dwellRef.current = { id: null, ms: 0, warned: new Set() };
    setEvents([]);
    setNotice(null);
    setView({ ...IDLE_VIEW, phase: "playing" });
    setHud({ elapsedMs: 0, separation: 1 });
    setRunning(true);
    pushEvents([
      {
        actor: "researcher",
        type: "spotlight_task_started",
        value: `task=spotlight_sync;rounds=${ROUND_COUNT};context=${contextMode};feedback=${feedbackMode};partner_guidance=${partnerGuidance}`,
        at: 0,
      },
      {
        actor: "session",
        type: "spotlight_round_started",
        value: `round=1;p01_clue=${SPOTLIGHT_ROUNDS[0].clues.P01.shortLabel};p02_clue=${SPOTLIGHT_ROUNDS[0].clues.P02.shortLabel}`,
        at: 0,
      },
    ]);
  }, [contextMode, feedbackMode, partnerGuidance, pushEvents]);

  const drainEffects = useCallback(
    (engine: EngineState, bot: BotState, effects: EngineEffect[]) => {
      const entries: { actor: DemoEvent["actor"]; type: EventType; value: string; at: number }[] = [];
      const nextView: Partial<ViewState> = {};

      for (const effect of effects) {
        switch (effect.type) {
          case "round-started": {
            resetBotForRound(bot, effect.roundIndex, engine.clockMs);
            dwellRef.current = { id: null, ms: 0, warned: new Set() };
            const definition = SPOTLIGHT_ROUNDS[effect.roundIndex];
            entries.push({
              actor: "session",
              type: "spotlight_round_started",
              value: `round=${effect.roundIndex + 1};p01_clue=${definition.clues.P01.shortLabel};p02_clue=${definition.clues.P02.shortLabel}`,
              at: engine.clockMs,
            });
            Object.assign(nextView, {
              phase: "playing",
              roundIndex: effect.roundIndex,
              lastSuccess: null,
              lastLabel: null,
            });
            break;
          }
          case "converged":
            entries.push({
              actor: "session",
              type: "spotlight_converged",
              value: `round=${effect.roundIndex + 1};convergence_ms=${effect.convergenceMs}`,
              at: engine.clockMs,
            });
            break;
          case "distractor-onset":
            entries.push({
              actor: "session",
              type: "spotlight_distractor_onset",
              value: `round=${effect.roundIndex + 1};object=${effect.objectId};region_relevance=${effect.relevance}`,
              at: engine.clockMs,
            });
            break;
          case "distractor-captured":
            entries.push({
              actor: "P01",
              type: "spotlight_distractor_captured",
              value: `round=${effect.roundIndex + 1};object=${effect.objectId};region_relevance=${effect.relevance};latency_ms=${effect.latencyMs}`,
              at: engine.clockMs,
            });
            break;
          case "false-lock": {
            const object = getSpotlightObject(effect.objectId);
            const definition = SPOTLIGHT_ROUNDS[effect.roundIndex];
            stageRef.current?.reject(effect.objectId);
            // Naming which clue it failed is the lesson of the round, and it
            // gives nothing away: both clues stay true of several objects.
            const matchesOwnClue = definition.clues.P01.candidates.includes(effect.objectId);
            const name = object?.label.toLowerCase() ?? "that";
            showNotice(
              matchesOwnClue
                ? `Not the ${name}. It fits your clue, but not your partner's.`
                : `Not the ${name}. It does not fit your own clue.`,
            );
            botSay(
              bot,
              matchesOwnClue ? "Mine isn't over there." : "That's not the one.",
              engine.clockMs,
              2200,
            );
            entries.push({
              actor: "session",
              type: "spotlight_false_lock",
              value: `round=${effect.roundIndex + 1};object=${effect.objectId};t_ms=${effect.atMs}`,
              at: engine.clockMs,
            });
            break;
          }
          case "round-resolved": {
            const measures = effect.measures;
            const object = effect.objectId ? getSpotlightObject(effect.objectId) : null;
            if (effect.success && effect.point) stageRef.current?.celebrate(effect.point);
            if (effect.objectId) {
              for (const actor of ["P01", "P02"] as const) {
                entries.push({
                  actor,
                  type: "spotlight_focus",
                  value: `round=${effect.roundIndex + 1};object=${effect.objectId};correct=${effect.success};rt_ms=${measures.searchMs};x=${object?.x ?? 0};y=${object?.y ?? 0}`,
                  at: engine.clockMs,
                });
              }
            }
            entries.push({
              actor: "session",
              type: effect.success ? "spotlight_joint_found" : "spotlight_joint_missed",
              value: `round=${effect.roundIndex + 1};convergence_ms=${measures.convergenceMs ?? "na"};rt_ms=${measures.searchMs};false_locks=${measures.falseLocks};relevant_dwell=${measures.relevantDwell.toFixed(2)}`,
              at: engine.clockMs,
            });
            Object.assign(nextView, {
              phase: "feedback",
              lastSuccess: effect.success,
              lastLabel: object?.label ?? null,
              foundIds: [...engine.foundIds],
              hits: engine.hits,
              misses: engine.misses,
              bestStreak: engine.bestStreak,
              measures: [...engine.measures],
              traces: [...engine.traces],
            });
            break;
          }
          case "task-completed":
            entries.push({
              actor: "session",
              type: "spotlight_task_completed",
              value: `rounds=${ROUND_COUNT};hits=${effect.hits};mean_convergence_ms=${meanConvergence(engine.measures)}`,
              at: engine.clockMs,
            });
            nextView.phase = "completed";
            break;
        }
      }

      if (entries.length) pushEvents(entries);
      if (Object.keys(nextView).length) {
        setView((current) => ({ ...current, ...nextView }));
      }
    },
    [pushEvents, showNotice],
  );

  // --- the single animation loop ------------------------------------------
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const engine = engineRef.current;
      const bot = botRef.current;
      if (!engine || !bot) return;

      engine.self = pointerRef.current;
      if (engine.phase === "playing") {
        stepBot(bot, dt, engine.clockMs, engine.roundIndex, engine.self, engine.round.cooldowns);
      }
      engine.partner = bot.pos;

      const effects: EngineEffect[] = [];
      stepEngine(engine, dt, effects);

      const activeRound = SPOTLIGHT_ROUNDS[engine.roundIndex];
      const hovered = engine.phase === "playing" ? objectUnder(engine.self) : null;

      const dwell = dwellRef.current;
      if (hovered?.id !== dwell.id) {
        dwell.id = hovered?.id ?? null;
        dwell.ms = 0;
      } else if (hovered) {
        dwell.ms += dt;
        const fitsOwnClue = activeRound.clues.P01.candidates.includes(hovered.id);
        const fitsPartnerClue = activeRound.clues.P02.candidates.includes(hovered.id);
        if (!dwell.warned.has(hovered.id)) {
          if (dwell.ms > 850 && !fitsOwnClue) {
            dwell.warned.add(hovered.id);
            showNotice(
              `The ${hovered.label.toLowerCase()} does not match your clue: ${activeRound.clues.P01.label.toLowerCase()}.`,
            );
          } else if (dwell.ms > 1700 && fitsOwnClue && !fitsPartnerClue) {
            dwell.warned.add(hovered.id);
            showNotice(
              `Your partner will not follow you to the ${hovered.label.toLowerCase()}. It is not in their part of the room.`,
            );
          }
        }
      }

      stageRef.current?.apply({
        p1: engine.self,
        p2: engine.partner,
        hoverId: hovered?.id ?? null,
        lockId: engine.round.holdId,
        lockProgress: engine.round.holdProgress,
        distractorId: engine.round.distractorActive
          ? activeRound.distractor?.objectId ?? null
          : null,
        dt,
      });

      // The bubble is a sibling of the stage, so it needs its own copy of the
      // partner light position to anchor against.
      const wrap = stageWrapRef.current;
      if (wrap) {
        wrap.style.setProperty("--sl-p2x", `${engine.partner.x * 100}%`);
        wrap.style.setProperty("--sl-p2y", `${engine.partner.y * 100}%`);
      }

      if (bot.lineSeq !== botSeqRef.current) {
        botSeqRef.current = bot.lineSeq;
        setBotLine(bot.line ? { ...bot.line, seq: bot.lineSeq } : null);
        setBotSpeaking(Boolean(bot.line));
      } else if (!bot.line && botLineRef.current) {
        setBotLine(null);
        setBotSpeaking(false);
      }
      botLineRef.current = Boolean(bot.line);

      if (now - hudAtRef.current > 200) {
        hudAtRef.current = now;
        setHud({
          elapsedMs: engine.round.elapsedMs,
          separation: sceneDistance(engine.self, engine.partner),
        });
      }

      if (effects.length) drainEffects(engine, bot, effects);

      if (engine.phase !== "completed") {
        frame = requestAnimationFrame(tick);
      } else {
        setRunning(false);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, drainEffects, showNotice]);

  const handleMove = useCallback((point: SpotlightPoint) => {
    pointerRef.current = point;
  }, []);

  const handleSnap = useCallback((_objectId: string, point: SpotlightPoint) => {
    pointerRef.current = point;
  }, []);

  const updateContext = (mode: SpotlightContextMode) => {
    setContextMode(mode);
    pushEvents([
      {
        actor: "researcher",
        type: "spotlight_context_condition",
        value: `mode=${mode}`,
        at: engineRef.current?.clockMs ?? 0,
      },
    ]);
  };

  const updateFeedback = (mode: DemoFeedbackMode) => {
    setFeedbackMode(mode);
    pushEvents([
      {
        actor: "researcher",
        type: "spotlight_feedback_condition",
        value: `mode=${mode}`,
        at: engineRef.current?.clockMs ?? 0,
      },
    ]);
  };

  const updatePartnerGuidance = (mode: PartnerGuidanceMode) => {
    setPartnerGuidance(mode);
    pushEvents([
      {
        actor: "researcher",
        type: "spotlight_communication_condition",
        value: `mode=${mode}`,
        at: engineRef.current?.clockMs ?? 0,
      },
    ]);
  };

  const playing = view.phase === "playing";
  const active = view.phase !== "idle";
  const convergence = meanConvergence(view.measures);
  const closeness = Math.max(0, Math.min(1, 1 - hud.separation / 0.55));
  const overlapping = hud.separation <= ENGINE.overlapRadius;

  return (
    <div className="grid gap-5">
      <div className="sl-workspace">
        <aside className="sl-rail">
          <div className="sl-rail-card">
            <p className="sl-rail-title">Researcher conditions</p>
            <fieldset className="mt-3">
              <legend className="sl-rail-legend">Scene context</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(["rich", "reduced"] as SpotlightContextMode[]).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    active={contextMode === mode}
                    aria-pressed={contextMode === mode}
                    onClick={() => updateContext(mode)}
                  >
                    {mode === "rich" ? "Rich scene" : "Reduced"}
                  </Button>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-3">
              <legend className="sl-rail-legend">Partner guidance</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(["hints", "silent"] as PartnerGuidanceMode[]).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    active={partnerGuidance === mode}
                    aria-pressed={partnerGuidance === mode}
                    onClick={() => updatePartnerGuidance(mode)}
                  >
                    {mode === "hints" ? "Text hints" : "Silent"}
                  </Button>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-3">
              <legend className="sl-rail-legend">Outcome feedback</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(["warm", "neutral", "none"] as DemoFeedbackMode[]).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    active={feedbackMode === mode}
                    aria-pressed={feedbackMode === mode}
                    onClick={() => updateFeedback(mode)}
                  >
                    {mode === "warm" ? "Warm" : mode === "neutral" ? "Neutral" : "No text"}
                  </Button>
                ))}
              </div>
            </fieldset>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
              Flip a condition mid-game. Every change is timestamped into the same stream
              as the behaviour.
            </p>
          </div>

          <EventTimeline
            events={events}
            exportPrefix="spotlight-sync-demo-events"
            emptyMessage="Start the game to collect focus events."
            bodyClassName="sl-rail-log"
            compact
          />
        </aside>

        <section className="sl-shell" aria-label="Spotlight Sync">
          <div className="sl-cluebar">
            <div className="sl-clue is-you">
              <span>
                <b>{ownClue.shortLabel}</b> you know
              </span>
              <strong>{ownClue.label}</strong>
            </div>
            <div className="sl-clue-join">
              <span aria-hidden="true">need both</span>
              <ol className="sl-pips" aria-label={`${view.hits} of ${ROUND_COUNT} targets found`}>
                {SPOTLIGHT_ROUNDS.map((definition, index) => (
                  <li
                    key={definition.id}
                    className={
                      view.foundIds.length > index
                        ? "is-found"
                        : index === view.roundIndex && active
                          ? "is-current"
                          : ""
                    }
                  />
                ))}
              </ol>
            </div>
            <div className="sl-clue is-partner">
              <span>
                <b>{partnerClue.shortLabel}</b> your partner knows
              </span>
              <strong>{active ? partnerClue.label : "They will tell you"}</strong>
            </div>
          </div>

          <div className="sl-stage-wrap" ref={stageWrapRef}>
            <MemoStage
              ref={stageRef}
              contextMode={contextMode}
              interactive={playing}
              foundIds={view.foundIds}
              revealed={view.phase === "completed"}
              onMove={handleMove}
              onSnap={handleSnap}
              ariaLabel="Search scene. Move your spotlight with the pointer, or tab through the objects."
            />

            {partnerGuidance === "hints" &&
              botLine &&
              (view.phase === "playing" || view.phase === "feedback") && (
              <p className="sl-bubble" key={botLine.seq} aria-hidden="true">
                <BotMessage line={botLine} />
              </p>
            )}

            {active && (
              <div className="sl-readout" aria-hidden="true">
                <div className={`sl-meter ${overlapping ? "is-overlapping" : ""}`}>
                  <i style={{ transform: `scaleX(${closeness.toFixed(3)})` }} />
                </div>
                <span>{overlapping ? "Lights overlapping" : "Bring your lights together"}</span>
              </div>
            )}

            {notice && (
              <p className="sl-notice" key={notice.seq} role="status">
                {notice.text}
              </p>
            )}

            {view.phase === "idle" && (
              <div className="sl-overlay">
                <span className="sl-dyad-mark" aria-hidden="true"><i /><i /></span>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Two clues. One object.
                </h3>
                <ol className="sl-howto">
                  <li>
                    <b className="is-you" />
                    <span>
                      The <strong>pink light</strong> is yours. Your private clue can describe
                      what the target is or where it belongs.
                    </span>
                  </li>
                  <li>
                    <b className="is-partner" />
                    <span>
                      The <strong>teal light</strong> is your partner. Their clue supplies the
                      other half, and the roles can swap next round.
                    </span>
                  </li>
                  <li>
                    <b className="is-joint" />
                    <span>
                      Park both lights on the object that fits <strong>both</strong> clues and hold
                      still for half a second.
                    </span>
                  </li>
                </ol>
                <Button className="mt-5" variant="primary" onClick={start} data-testid="start-spotlight-demo">
                  Start · {ROUND_COUNT} targets
                </Button>
              </div>
            )}

            {view.phase === "feedback" && feedbackMode !== "none" && (
              <div className={`sl-toast ${view.lastSuccess ? "is-success" : "is-miss"}`} role="status">
                <strong>
                  {view.lastSuccess
                    ? feedbackMode === "warm"
                      ? "Found it together"
                      : "Target acquired"
                    : "Round expired"}
                </strong>
                <small>
                  {view.lastSuccess
                    ? `${view.lastLabel} · ${view.foundIds.length} of ${ROUND_COUNT}`
                    : "You never locked this one together."}
                </small>
              </div>
            )}

            {view.phase === "completed" && (
              <div className="sl-finish">
                <div>
                  <p className="sl-kicker">Session complete</p>
                  <h3 className="font-display text-xl font-semibold tracking-tight text-white">
                    The room is lit
                  </h3>
                  <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-white/70">
                    {view.hits} of {ROUND_COUNT} found together
                    {convergence ? ` · ${convergence} ms mean time to overlap` : ""}.
                  </p>
                </div>
                <Button variant="primary" onClick={start}>
                  Play again
                </Button>
              </div>
            )}
          </div>

          <footer className="sl-footer">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <Metric label="Found" value={`${view.hits}/${ROUND_COUNT}`} />
              <Metric label="Mean overlap" value={convergence ? `${convergence}ms` : "—"} />
              <Metric label="Best streak" value={`${view.bestStreak}`} />
              <Metric
                label="This round"
                value={active ? `${(hud.elapsedMs / 1000).toFixed(1)}s` : "—"}
              />
            </div>
            {active && (
              <Button
                size="sm"
                variant="ghost"
                onClick={start}
                className="border border-white/20 text-white hover:bg-white/10"
              >
                Restart
              </Button>
            )}
          </footer>
        </section>

        <CallStrip
          botLine={partnerGuidance === "hints" ? botLine : null}
          botSpeaking={partnerGuidance === "hints" && botSpeaking}
          botMuted={partnerGuidance === "silent"}
          connected={active}
        />
      </div>

      <SpotlightTrace traces={view.traces} measures={view.measures} />
    </div>
  );
}

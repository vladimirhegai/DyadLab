import { SPOTLIGHT_OBJECTS, type SpotlightRoundDefinition } from "./rounds";
import {
  sceneDistance,
  type SpotlightObject,
  type SpotlightPoint,
  type SpotlightRoundMeasures,
  type SpotlightRoundTrace,
  type SpotlightTraceSample,
} from "./types";

/**
 * Spotlight Sync runs as a continuous pointer task rather than a click task:
 * a target is claimed by holding both spotlights over the same object. This
 * module is the deterministic core of that loop — no React, no DOM, no timers —
 * so the same rules can drive the bot demo, the live session, and any test.
 */

export const ENGINE = {
  /** Aspect-corrected distance at which a spotlight counts as covering an object. */
  lockRadius: 0.078,
  /** How long both spotlights must hold an object before it resolves. */
  lockHoldMs: 620,
  /** Lock progress lost per second once the hold breaks. */
  lockDecayPerSecond: 2.4,
  /** Separation at which the two light fields visibly overlap. */
  overlapRadius: 0.155,
  /** How near a spotlight must come to a distractor to count as captured. */
  captureRadius: 0.11,
  /** Capture is only counted while the onset is recent. */
  captureWindowMs: 1500,
  /** A wrong lock disables that object so it cannot be re-tried on the rebound. */
  falseLockCooldownMs: 2000,
  /** A round that is never solved resolves as a miss rather than stalling. */
  roundTimeoutMs: 42000,
  /** Long enough to read the outcome before the next round takes the screen. */
  feedbackMs: 2200,
  traceIntervalMs: 50,
} as const;

export type EngineEffect =
  | { type: "round-started"; roundIndex: number }
  | { type: "converged"; roundIndex: number; convergenceMs: number }
  | { type: "distractor-onset"; roundIndex: number; objectId: string; relevance: "relevant" | "irrelevant" }
  | { type: "distractor-captured"; roundIndex: number; objectId: string; relevance: "relevant" | "irrelevant"; latencyMs: number }
  | { type: "false-lock"; roundIndex: number; objectId: string; atMs: number }
  | {
      type: "round-resolved";
      roundIndex: number;
      success: boolean;
      objectId: string | null;
      measures: SpotlightRoundMeasures;
      point: SpotlightPoint | null;
    }
  | { type: "task-completed"; hits: number };

export interface EngineRoundState {
  index: number;
  elapsedMs: number;
  /** Object both spotlights are currently holding, if any. */
  holdId: string | null;
  /** 0 → 1 fill of the focus lock. */
  holdProgress: number;
  convergenceMs: number | null;
  distractorActive: boolean;
  distractorCaptured: boolean | null;
  falseLocks: number;
  cooldowns: Map<string, number>;
  separationSum: number;
  separationSamples: number;
  relevantSamples: number;
  dwellSamples: number;
  traceAccumulatorMs: number;
  samples: SpotlightTraceSample[];
  resolved: boolean;
}

export interface EngineState {
  phase: "idle" | "playing" | "feedback" | "completed";
  /** The session being played. Generated per playthrough, not a module constant. */
  rounds: SpotlightRoundDefinition[];
  roundIndex: number;
  /** Milliseconds since the task started. */
  clockMs: number;
  self: SpotlightPoint;
  partner: SpotlightPoint;
  round: EngineRoundState;
  feedbackUntilMs: number;
  lastSuccess: boolean | null;
  lastResolvedId: string | null;
  hits: number;
  misses: number;
  streak: number;
  bestStreak: number;
  foundIds: string[];
  measures: SpotlightRoundMeasures[];
  traces: SpotlightRoundTrace[];
}

function emptyRound(index: number): EngineRoundState {
  return {
    index,
    elapsedMs: 0,
    holdId: null,
    holdProgress: 0,
    convergenceMs: null,
    distractorActive: false,
    distractorCaptured: null,
    falseLocks: 0,
    cooldowns: new Map(),
    separationSum: 0,
    separationSamples: 0,
    relevantSamples: 0,
    dwellSamples: 0,
    traceAccumulatorMs: 0,
    samples: [],
    resolved: false,
  };
}

export function createEngineState(
  self: SpotlightPoint,
  partner: SpotlightPoint,
  rounds: SpotlightRoundDefinition[],
): EngineState {
  return {
    phase: "idle",
    rounds,
    roundIndex: 0,
    clockMs: 0,
    self: { ...self },
    partner: { ...partner },
    round: emptyRound(0),
    feedbackUntilMs: 0,
    lastSuccess: null,
    lastResolvedId: null,
    hits: 0,
    misses: 0,
    streak: 0,
    bestStreak: 0,
    foundIds: [],
    measures: [],
    traces: [],
  };
}

export function startRound(state: EngineState, index: number, effects: EngineEffect[]) {
  state.roundIndex = index;
  state.round = emptyRound(index);
  state.phase = "playing";
  state.lastSuccess = null;
  state.lastResolvedId = null;
  effects.push({ type: "round-started", roundIndex: index });
}

/** Nearest object to a point, but only if the point is actually covering it. */
export function objectUnder(
  point: SpotlightPoint,
  radius: number = ENGINE.lockRadius,
): SpotlightObject | null {
  let best: SpotlightObject | null = null;
  let bestDistance = radius;
  for (const item of SPOTLIGHT_OBJECTS) {
    const distance = sceneDistance(point, item);
    if (distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}

function finishRound(
  state: EngineState,
  success: boolean,
  objectId: string | null,
  point: SpotlightPoint | null,
  effects: EngineEffect[],
) {
  const round = state.rounds[state.round.index];
  const measures: SpotlightRoundMeasures = {
    roundIndex: state.round.index,
    roundId: round.id,
    targetId: round.targetId,
    success,
    convergenceMs: state.round.convergenceMs,
    searchMs: Math.round(state.round.elapsedMs),
    meanSeparation: state.round.separationSamples
      ? state.round.separationSum / state.round.separationSamples
      : 0,
    relevantDwell: state.round.dwellSamples
      ? state.round.relevantSamples / state.round.dwellSamples
      : 0,
    falseLocks: state.round.falseLocks,
    distractorRelevance: round.distractor?.relevance ?? null,
    distractorCaptured: round.distractor ? state.round.distractorCaptured ?? false : null,
  };

  state.round.resolved = true;
  state.measures.push(measures);
  state.traces.push({
    roundIndex: state.round.index,
    targetId: round.targetId,
    success,
    samples: state.round.samples,
    lockPoint: point,
  });

  if (success) {
    state.hits += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.foundIds.push(round.targetId);
  } else {
    state.misses += 1;
    state.streak = 0;
  }

  state.phase = "feedback";
  state.lastSuccess = success;
  state.lastResolvedId = objectId;
  state.feedbackUntilMs = state.clockMs + ENGINE.feedbackMs;
  effects.push({
    type: "round-resolved",
    roundIndex: state.round.index,
    success,
    objectId,
    measures,
    point,
  });
}

/**
 * Advance the simulation by `dt` milliseconds. `state.self` and `state.partner`
 * are expected to have been updated by the caller (pointer, bot, or network)
 * before the step runs.
 */
export function stepEngine(
  state: EngineState,
  dt: number,
  effects: EngineEffect[],
): EngineState {
  state.clockMs += dt;

  if (state.phase === "feedback") {
    if (state.clockMs >= state.feedbackUntilMs) {
      const next = state.roundIndex + 1;
      if (next >= state.rounds.length) {
        state.phase = "completed";
        effects.push({ type: "task-completed", hits: state.hits });
      } else {
        startRound(state, next, effects);
      }
    }
    return state;
  }

  if (state.phase !== "playing") return state;

  const round = state.rounds[state.roundIndex];
  const target = SPOTLIGHT_OBJECTS.find((item) => item.id === round.targetId)!;
  const r = state.round;
  r.elapsedMs += dt;

  // --- continuous measures -------------------------------------------------
  const separation = sceneDistance(state.self, state.partner);
  r.separationSum += separation;
  r.separationSamples += 1;
  r.dwellSamples += 1;
  const selfSurface = state.self.y < 0.42 ? "upper" : state.self.y < 0.72 ? "mid" : "lower";
  if (selfSurface === target.surface) r.relevantSamples += 1;

  if (r.convergenceMs === null && separation <= ENGINE.overlapRadius) {
    r.convergenceMs = Math.round(r.elapsedMs);
    effects.push({
      type: "converged",
      roundIndex: r.index,
      convergenceMs: r.convergenceMs,
    });
  }

  r.traceAccumulatorMs += dt;
  if (r.traceAccumulatorMs >= ENGINE.traceIntervalMs) {
    r.traceAccumulatorMs = 0;
    r.samples.push({
      t: Math.round(r.elapsedMs),
      p1: { x: state.self.x, y: state.self.y },
      p2: { x: state.partner.x, y: state.partner.y },
    });
  }

  // --- salient onset (attentional capture) ---------------------------------
  const distractor = round.distractor;
  if (distractor) {
    const active =
      r.elapsedMs >= distractor.onsetMs &&
      r.elapsedMs < distractor.onsetMs + distractor.durationMs;
    if (active && !r.distractorActive) {
      r.distractorActive = true;
      r.distractorCaptured = false;
      effects.push({
        type: "distractor-onset",
        roundIndex: r.index,
        objectId: distractor.objectId,
        relevance: distractor.relevance,
      });
    } else if (!active && r.distractorActive) {
      r.distractorActive = false;
    }

    const sinceOnset = r.elapsedMs - distractor.onsetMs;
    if (
      r.distractorCaptured === false &&
      sinceOnset >= 0 &&
      sinceOnset <= ENGINE.captureWindowMs
    ) {
      const distractorObject = SPOTLIGHT_OBJECTS.find(
        (item) => item.id === distractor.objectId,
      )!;
      if (sceneDistance(state.self, distractorObject) <= ENGINE.captureRadius) {
        r.distractorCaptured = true;
        effects.push({
          type: "distractor-captured",
          roundIndex: r.index,
          objectId: distractor.objectId,
          relevance: distractor.relevance,
          latencyMs: Math.round(sinceOnset),
        });
      }
    }
  }

  // --- focus lock ----------------------------------------------------------
  for (const [id, until] of r.cooldowns) {
    if (state.clockMs >= until) r.cooldowns.delete(id);
  }

  const selfObject = objectUnder(state.self);
  const partnerObject = objectUnder(state.partner);
  const shared =
    selfObject && partnerObject && selfObject.id === partnerObject.id
      ? selfObject
      : null;
  const eligible = shared && !r.cooldowns.has(shared.id) ? shared : null;

  if (eligible) {
    if (r.holdId !== eligible.id) {
      r.holdId = eligible.id;
      r.holdProgress = 0;
    }
    r.holdProgress = Math.min(1, r.holdProgress + dt / ENGINE.lockHoldMs);
    if (r.holdProgress >= 1) {
      const point = { x: eligible.x, y: eligible.y };
      if (eligible.id === round.targetId) {
        finishRound(state, true, eligible.id, point, effects);
        return state;
      }
      r.falseLocks += 1;
      r.cooldowns.set(eligible.id, state.clockMs + ENGINE.falseLockCooldownMs);
      r.holdId = null;
      r.holdProgress = 0;
      effects.push({
        type: "false-lock",
        roundIndex: r.index,
        objectId: eligible.id,
        atMs: Math.round(r.elapsedMs),
      });
    }
  } else {
    r.holdProgress = Math.max(
      0,
      r.holdProgress - (dt / 1000) * ENGINE.lockDecayPerSecond,
    );
    if (r.holdProgress === 0) r.holdId = null;
  }

  if (r.elapsedMs >= ENGINE.roundTimeoutMs) {
    finishRound(state, false, null, null, effects);
  }

  return state;
}

export function meanConvergence(measures: SpotlightRoundMeasures[]) {
  const values = measures
    .map((item) => item.convergenceMs)
    .filter((value): value is number => value !== null);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function captureRateByRelevance(measures: SpotlightRoundMeasures[]) {
  const buckets = { relevant: { seen: 0, captured: 0 }, irrelevant: { seen: 0, captured: 0 } };
  for (const item of measures) {
    if (!item.distractorRelevance) continue;
    const bucket = buckets[item.distractorRelevance];
    bucket.seen += 1;
    if (item.distractorCaptured) bucket.captured += 1;
  }
  return buckets;
}

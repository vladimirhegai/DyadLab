import type { ParticipantId } from "@/lib/demo/types";

export type SpotlightObjectKind =
  | "mug"
  | "key"
  | "flask"
  | "moth"
  | "plant"
  | "ivy"
  | "clock"
  | "camera"
  | "notebook"
  | "books"
  | "star"
  | "specimen"
  | "glasses"
  | "headphones"
  | "bulb"
  | "crate"
  | "toolbox"
  | "spool"
  | "boot"
  | "can";

/**
 * Surface Guidance Framework regions (Pereira & Castelhano, 2019): scenes are
 * divided by the horizontal surfaces objects rest on, and search is constrained
 * to the surfaces where the target could plausibly be.
 */
export type SpotlightSurface = "upper" | "mid" | "lower";
export type SpotlightZone = "left" | "centre" | "right";
export type SpotlightRegion = `${SpotlightSurface}-${SpotlightZone}`;

export type SpotlightContextMode = "rich" | "reduced";
export type SpotlightFeedbackMode = "warm" | "neutral";
export type SpotlightTaskPhase = "idle" | "playing" | "feedback" | "completed";

export interface SpotlightPoint {
  x: number;
  y: number;
}

export interface SpotlightObject {
  id: string;
  label: string;
  kind: SpotlightObjectKind;
  color: string;
  x: number;
  y: number;
  surface: SpotlightSurface;
  zone: SpotlightZone;
  region: SpotlightRegion;
  /** Visible properties a WHAT clue can name. Keyed by `SpotlightTrait`. */
  traits: string[];
}

export interface SpotlightClue {
  /** `object` = object content (WHAT). `context` = scene region (WHERE). */
  kind: "object" | "context";
  label: string;
  shortLabel: string;
  /** Every object this clue is true of. Both clues intersect on exactly one. */
  candidates: string[];
}

/**
 * A brief salient onset. `relevance` records whether it appeared on the
 * target-relevant surface, which is the manipulation the capture study turned on.
 */
export interface SpotlightDistractor {
  objectId: string;
  relevance: "relevant" | "irrelevant";
  onsetMs: number;
  durationMs: number;
}

export interface SpotlightRoundView {
  id: string;
  objects: SpotlightObject[];
  clue: SpotlightClue | null;
  partnerClue?: SpotlightClue | null;
  researcherClues?: Record<ParticipantId, SpotlightClue>;
  targetId?: string;
  distractor?: SpotlightDistractor | null;
}

export interface SpotlightOutcome {
  roundId: string;
  success: boolean;
  targetId: string;
  selections: Record<ParticipantId, string>;
  reactionTimeMs: number;
  /** Time from round start until the two spotlights first overlapped. */
  convergenceMs: number;
}

export interface SpotlightStats {
  hits: number;
  misses: number;
  streak: number;
  bestStreak: number;
  convergenceTotalMs: number;
  convergenceSamples: number;
}

export interface SpotlightTaskState {
  status: "idle" | "active" | "completed";
  phase: SpotlightTaskPhase;
  currentRoundIndex: number;
  roundCount: number;
  currentRound: SpotlightRoundView | null;
  selections: Record<ParticipantId, string | null>;
  selectionTimes: Record<ParticipantId, number | null>;
  stats: SpotlightStats;
  history: SpotlightOutcome[];
  lastOutcome: SpotlightOutcome | null;
  feedbackMode: SpotlightFeedbackMode;
  contextMode: SpotlightContextMode;
  startedAt: number | null;
  roundStartedAt: number | null;
}

export type SpotlightPositions = Record<ParticipantId, SpotlightPoint | null>;

/** One 20 Hz sample of both spotlights, used for the search-trace replay. */
export interface SpotlightTraceSample {
  t: number;
  p1: SpotlightPoint;
  p2: SpotlightPoint;
}

export interface SpotlightRoundTrace {
  roundIndex: number;
  targetId: string;
  success: boolean;
  samples: SpotlightTraceSample[];
  /** Where the pair committed, if they committed. */
  lockPoint: SpotlightPoint | null;
}

/** Per-round measures the researcher view and the exports care about. */
export interface SpotlightRoundMeasures {
  roundIndex: number;
  roundId: string;
  targetId: string;
  success: boolean;
  /** Round start → both spotlights first within overlap distance. */
  convergenceMs: number | null;
  /** Round start → focus lock completed. */
  searchMs: number;
  /** Mean separation between the two spotlights across the round. */
  meanSeparation: number;
  /** Proportion of the round the player's light spent on the target surface. */
  relevantDwell: number;
  falseLocks: number;
  distractorRelevance: SpotlightDistractor["relevance"] | null;
  distractorCaptured: boolean | null;
}

export const EMPTY_SPOTLIGHT_STATS: SpotlightStats = {
  hits: 0,
  misses: 0,
  streak: 0,
  bestStreak: 0,
  convergenceTotalMs: 0,
  convergenceSamples: 0,
};

export const EMPTY_SPOTLIGHT_TASK: SpotlightTaskState = {
  status: "idle",
  phase: "idle",
  currentRoundIndex: 0,
  roundCount: 6,
  currentRound: null,
  selections: { P01: null, P02: null },
  selectionTimes: { P01: null, P02: null },
  stats: { ...EMPTY_SPOTLIGHT_STATS },
  history: [],
  lastOutcome: null,
  feedbackMode: "warm",
  contextMode: "rich",
  startedAt: null,
  roundStartedAt: null,
};

export const DEFAULT_SPOTLIGHT_POSITIONS: SpotlightPositions = {
  P01: { x: 0.3, y: 0.66 },
  P02: { x: 0.72, y: 0.3 },
};

/** The scene is authored in a 1000 x 620 box; distances must respect that. */
export const SCENE_ASPECT = 1000 / 620;

/** Aspect-corrected distance between two normalized scene points. */
export function sceneDistance(a: SpotlightPoint, b: SpotlightPoint) {
  const dx = (a.x - b.x) * SCENE_ASPECT;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

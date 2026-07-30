import type { ParticipantId } from "@/lib/demo/types";

export type SignalShape = "circle" | "diamond" | "triangle" | "hexagon";
export type SignalColor = "violet" | "magenta" | "gold" | "teal";
export type SignalPattern = "solid" | "striped" | "dotted";
export type SignalFeedbackMode = "warm" | "neutral";
export type SignalTaskPhase = "idle" | "playing" | "feedback" | "completed";

export interface SignalToken {
  id: string;
  shape: SignalShape;
  color: SignalColor;
  pattern: SignalPattern;
}

export interface SignalClue {
  kind: "shape" | "color";
  value: SignalShape | SignalColor;
  label: string;
}

export interface SignalRoundView {
  id: string;
  tokens: SignalToken[];
  clue: SignalClue | null;
  partnerClue?: SignalClue | null;
  researcherClues?: Record<ParticipantId, SignalClue>;
  targetId?: string;
}

export interface SignalOutcome {
  roundId: string;
  success: boolean;
  targetId: string;
  selections: Record<ParticipantId, string>;
  reactionTimeMs: number;
  syncDeltaMs: number;
}

export interface SignalStats {
  hits: number;
  misses: number;
  streak: number;
  bestStreak: number;
  syncTotalMs: number;
  syncSamples: number;
}

export interface SignalTaskState {
  status: "idle" | "active" | "completed";
  phase: SignalTaskPhase;
  currentRoundIndex: number;
  roundCount: number;
  currentRound: SignalRoundView | null;
  selections: Record<ParticipantId, string | null>;
  selectionTimes: Record<ParticipantId, number | null>;
  stats: SignalStats;
  history: SignalOutcome[];
  lastOutcome: SignalOutcome | null;
  feedbackMode: SignalFeedbackMode;
  startedAt: number | null;
  roundStartedAt: number | null;
}

export const EMPTY_SIGNAL_STATS: SignalStats = {
  hits: 0,
  misses: 0,
  streak: 0,
  bestStreak: 0,
  syncTotalMs: 0,
  syncSamples: 0,
};

export const EMPTY_SIGNAL_TASK: SignalTaskState = {
  status: "idle",
  phase: "idle",
  currentRoundIndex: 0,
  roundCount: 4,
  currentRound: null,
  selections: { P01: null, P02: null },
  selectionTimes: { P01: null, P02: null },
  stats: EMPTY_SIGNAL_STATS,
  history: [],
  lastOutcome: null,
  feedbackMode: "warm",
  startedAt: null,
  roundStartedAt: null,
};

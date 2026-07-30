import type {
  SignalClue,
  SignalColor,
  SignalRoundView,
  SignalShape,
  SignalToken,
} from "./types";

export interface SignalRoundDefinition {
  id: string;
  clues: {
    P01: SignalClue;
    P02: SignalClue;
  };
  targetId: string;
  tokens: SignalToken[];
}

function shape(value: SignalShape, label: string): SignalClue {
  return { kind: "shape", value, label };
}

function color(value: SignalColor, label: string): SignalClue {
  return { kind: "color", value, label };
}

export const SIGNAL_ROUNDS: SignalRoundDefinition[] = [
  {
    id: "signal-01",
    clues: {
      P01: shape("circle", "Circle"),
      P02: color("magenta", "Magenta"),
    },
    targetId: "s01-magenta-circle",
    tokens: [
      { id: "s01-violet-diamond", shape: "diamond", color: "violet", pattern: "striped" },
      { id: "s01-magenta-circle", shape: "circle", color: "magenta", pattern: "solid" },
      { id: "s01-gold-hexagon", shape: "hexagon", color: "gold", pattern: "dotted" },
      { id: "s01-teal-circle", shape: "circle", color: "teal", pattern: "striped" },
      { id: "s01-magenta-triangle", shape: "triangle", color: "magenta", pattern: "dotted" },
      { id: "s01-violet-hexagon", shape: "hexagon", color: "violet", pattern: "solid" },
    ],
  },
  {
    id: "signal-02",
    clues: {
      P01: color("violet", "Violet"),
      P02: shape("diamond", "Diamond"),
    },
    targetId: "s02-violet-diamond",
    tokens: [
      { id: "s02-teal-triangle", shape: "triangle", color: "teal", pattern: "solid" },
      { id: "s02-violet-circle", shape: "circle", color: "violet", pattern: "dotted" },
      { id: "s02-gold-diamond", shape: "diamond", color: "gold", pattern: "striped" },
      { id: "s02-magenta-hexagon", shape: "hexagon", color: "magenta", pattern: "solid" },
      { id: "s02-violet-diamond", shape: "diamond", color: "violet", pattern: "solid" },
      { id: "s02-teal-diamond", shape: "diamond", color: "teal", pattern: "dotted" },
    ],
  },
  {
    id: "signal-03",
    clues: {
      P01: shape("triangle", "Triangle"),
      P02: color("gold", "Gold"),
    },
    targetId: "s03-gold-triangle",
    tokens: [
      { id: "s03-magenta-circle", shape: "circle", color: "magenta", pattern: "striped" },
      { id: "s03-gold-hexagon", shape: "hexagon", color: "gold", pattern: "solid" },
      { id: "s03-violet-triangle", shape: "triangle", color: "violet", pattern: "dotted" },
      { id: "s03-teal-diamond", shape: "diamond", color: "teal", pattern: "striped" },
      { id: "s03-gold-triangle", shape: "triangle", color: "gold", pattern: "solid" },
      { id: "s03-magenta-diamond", shape: "diamond", color: "magenta", pattern: "dotted" },
    ],
  },
  {
    id: "signal-04",
    clues: {
      P01: color("teal", "Teal"),
      P02: shape("hexagon", "Hexagon"),
    },
    targetId: "s04-teal-hexagon",
    tokens: [
      { id: "s04-violet-circle", shape: "circle", color: "violet", pattern: "solid" },
      { id: "s04-teal-triangle", shape: "triangle", color: "teal", pattern: "dotted" },
      { id: "s04-gold-diamond", shape: "diamond", color: "gold", pattern: "solid" },
      { id: "s04-magenta-hexagon", shape: "hexagon", color: "magenta", pattern: "striped" },
      { id: "s04-teal-hexagon", shape: "hexagon", color: "teal", pattern: "solid" },
      { id: "s04-gold-circle", shape: "circle", color: "gold", pattern: "dotted" },
    ],
  },
];

export function getDemoRound(index: number): SignalRoundView {
  const round = SIGNAL_ROUNDS[index];
  if (!round) throw new Error(`Unknown Signal Sync round: ${index}`);
  return {
    id: round.id,
    tokens: round.tokens,
    clue: round.clues.P01,
    partnerClue: round.clues.P02,
    researcherClues: round.clues,
    targetId: round.targetId,
  };
}

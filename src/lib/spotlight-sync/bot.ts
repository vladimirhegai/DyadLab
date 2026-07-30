import { ENGINE } from "./engine";
import { SPOTLIGHT_OBJECT_BY_ID, SPOTLIGHT_ROUNDS } from "./rounds";
import { sceneDistance, type SpotlightPoint } from "./types";

/**
 * The demo partner only knows its half of the round. It patrols objects its
 * clue is true of, comments on the player's choices, and occasionally says
 * enough to unstick the search without revealing the answer.
 */

const NOTICE_RADIUS = 0.125;
const NOTICE_DWELL_MS = 320;
const RECOIL_MS = 620;
const SCAN_DWELL_MS: [number, number] = [780, 1250];

export type BotMode = "scan" | "commit" | "recoil";

export interface BotLine {
  text: string;
  emphasis?: string;
}

export interface BotState {
  pos: SpotlightPoint;
  velocity: SpotlightPoint;
  goal: SpotlightPoint;
  goalId: string | null;
  mode: BotMode;
  modeUntilMs: number;
  cursor: number;
  watchId: string | null;
  watchMs: number;
  reactedTo: string | null;
  reactAfterMs: number;
  line: BotLine | null;
  lineUntilMs: number;
  lineSeq: number;
  nextHintMs: number;
  seed: number;
}

const COMMIT_LINES: BotLine[] = [
  { text: "That fits my clue — hold here.", emphasis: "hold here" },
  { text: "Yes, this one matches mine. Keep your light steady.", emphasis: "matches mine" },
  { text: "I think we overlap here. Hold for a moment.", emphasis: "Hold for a moment" },
  { text: "This is one of mine. Let’s test it together.", emphasis: "test it together" },
];

const RECOIL_LINES: BotLine[] = [
  { text: "Not this one — my clue rules it out.", emphasis: "rules it out" },
  { text: "My clue points somewhere else. Follow my light.", emphasis: "Follow my light" },
  { text: "That’s outside my area. Watch where I circle back.", emphasis: "outside my area" },
  { text: "I don’t think this fits mine. Try one I keep revisiting.", emphasis: "keep revisiting" },
];

const OBJECT_OPENERS: Record<string, BotLine[]> = {
  "Alive and growing": [
    {
      text: "Mine’s alive and growing… should be somewhere around here.",
      emphasis: "alive and growing",
    },
    {
      text: "My clue says alive and growing. I’ll check the living things.",
      emphasis: "alive and growing",
    },
    {
      text: "I’m looking for something alive. Watch the objects my light returns to.",
      emphasis: "something alive",
    },
  ],
  Violet: [
    { text: "Mine is violet. I’m checking the purple objects.", emphasis: "violet" },
    {
      text: "My clue is violet — watch which coloured objects I revisit.",
      emphasis: "violet",
    },
  ],
  "It holds liquid": [
    {
      text: "Mine holds liquid. I’ll sweep the containers in the room.",
      emphasis: "holds liquid",
    },
    {
      text: "I’m looking for something that holds liquid. Follow my light if you get stuck.",
      emphasis: "holds liquid",
    },
  ],
};

function nextRandom(state: BotState) {
  state.seed = (state.seed * 1664525 + 1013904223) % 4294967296;
  return state.seed / 4294967296;
}

export function createBotState(start: SpotlightPoint): BotState {
  return {
    pos: { ...start },
    velocity: { x: 0, y: 0 },
    goal: { ...start },
    goalId: null,
    mode: "scan",
    modeUntilMs: 0,
    cursor: 0,
    watchId: null,
    watchMs: 0,
    reactedTo: null,
    reactAfterMs: 0,
    line: null,
    lineUntilMs: 0,
    lineSeq: 0,
    nextHintMs: 0,
    seed: 20260908,
  };
}

function spokenLabel(label: string) {
  return label.replace(" · ", ", ").toLowerCase();
}

/** Several natural ways a partner might introduce the clue. */
export function spokenClue(label: string, kind: "object" | "context"): BotLine[] {
  if (kind === "object" && OBJECT_OPENERS[label]) return OBJECT_OPENERS[label];

  const spoken = spokenLabel(label);
  return kind === "context"
    ? [
        {
          text: `Mine puts it ${spoken}. I’ll narrow down that part of the room.`,
          emphasis: spoken,
        },
        {
          text: `I have ${spoken}. Watch where my light spends its time.`,
          emphasis: spoken,
        },
        {
          text: `My clue points ${spoken}. I’m checking that area now.`,
          emphasis: spoken,
        },
      ]
    : [
        {
          text: `Mine says ${spoken}. I’ll circle the objects that fit.`,
          emphasis: spoken,
        },
        {
          text: `My clue is ${spoken}. Watch which objects I revisit.`,
          emphasis: spoken,
        },
      ];
}

export function botSay(
  state: BotState,
  line: string | BotLine,
  clockMs: number,
  holdMs = 2400,
) {
  state.line = typeof line === "string" ? { text: line } : line;
  state.lineUntilMs = clockMs + holdMs;
  state.lineSeq += 1;
}

function hintLine(state: BotState, roundIndex: number): BotLine {
  const clue = SPOTLIGHT_ROUNDS[roundIndex].clues.P02;
  const goal = state.goalId ? SPOTLIGHT_OBJECT_BY_ID.get(state.goalId) : null;
  const clueText = spokenLabel(clue.label);
  const options: BotLine[] =
    clue.kind === "object"
      ? [
          {
            text: `My clue is still ${clueText}. The objects I revisit are your best lead.`,
            emphasis: clueText,
          },
          {
            text: "I’ve narrowed it to a few matches. Compare them with your clue.",
            emphasis: "Compare them with your clue",
          },
        ]
      : [
          {
            text: `Stay near ${clueText}. Anything outside that area can be ruled out.`,
            emphasis: clueText,
          },
          {
            text: "I know the part of the room, not the object. Use my light to narrow it down.",
            emphasis: "Use my light",
          },
        ];

  if (goal) {
    const objectName = goal.label.toLowerCase();
    options.push({
      text: `I’m checking the ${objectName} now. Does it fit your clue?`,
      emphasis: objectName,
    });
  }

  return options[Math.floor(nextRandom(state) * options.length)];
}

export function resetBotForRound(state: BotState, roundIndex: number, clockMs: number) {
  const round = SPOTLIGHT_ROUNDS[roundIndex];
  const clue = round.clues.P02;
  state.mode = "scan";
  state.modeUntilMs = clockMs + 260;
  state.cursor = Math.floor(nextRandom(state) * clue.candidates.length);
  state.goalId = null;
  state.watchId = null;
  state.watchMs = 0;
  state.reactedTo = null;
  state.reactAfterMs = clockMs + 2600;

  const openers = spokenClue(clue.label, clue.kind);
  botSay(state, openers[Math.floor(nextRandom(state) * openers.length)], clockMs, 3400);
  state.nextHintMs = clockMs + 5200 + nextRandom(state) * 2200;
}

function pointFor(objectId: string): SpotlightPoint {
  const object = SPOTLIGHT_OBJECT_BY_ID.get(objectId);
  return object ? { x: object.x, y: object.y } : { x: 0.5, y: 0.5 };
}

export function stepBot(
  state: BotState,
  dt: number,
  clockMs: number,
  roundIndex: number,
  player: SpotlightPoint,
  cooldowns: Map<string, number>,
) {
  const round = SPOTLIGHT_ROUNDS[roundIndex];
  const candidates = round.clues.P02.candidates;

  let watching: string | null = null;
  let bestDistance = NOTICE_RADIUS;
  for (const id of SPOTLIGHT_OBJECT_BY_ID.keys()) {
    const distance = sceneDistance(player, pointFor(id));
    if (distance < bestDistance) {
      watching = id;
      bestDistance = distance;
    }
  }

  if (watching && watching === state.watchId) {
    state.watchMs += dt;
  } else {
    state.watchId = watching;
    state.watchMs = 0;
    if (!watching) state.reactedTo = null;
  }

  const settled = state.watchId && state.watchMs >= NOTICE_DWELL_MS;
  if (settled && state.watchId && clockMs >= state.reactAfterMs) {
    const known = candidates.includes(state.watchId);
    const blocked = cooldowns.has(state.watchId);
    if (known && !blocked) {
      if (state.goalId !== state.watchId) {
        state.goalId = state.watchId;
        state.mode = "commit";
        if (state.reactedTo !== state.watchId) {
          state.reactedTo = state.watchId;
          botSay(
            state,
            COMMIT_LINES[Math.floor(nextRandom(state) * COMMIT_LINES.length)],
            clockMs,
            2200,
          );
          state.nextHintMs = clockMs + 4800 + nextRandom(state) * 2200;
        }
      }
    } else if (state.reactedTo !== state.watchId) {
      state.reactedTo = state.watchId;
      state.mode = "recoil";
      state.modeUntilMs = clockMs + RECOIL_MS;
      botSay(
        state,
        RECOIL_LINES[Math.floor(nextRandom(state) * RECOIL_LINES.length)],
        clockMs,
        2200,
      );
      state.nextHintMs = clockMs + 4200 + nextRandom(state) * 2200;
    }
  }

  if (state.mode === "commit" && state.goalId && state.watchId !== state.goalId) {
    state.mode = "scan";
    state.modeUntilMs = clockMs;
    state.goalId = null;
  }

  if (state.mode === "recoil" && clockMs >= state.modeUntilMs) {
    state.mode = "scan";
    state.modeUntilMs = clockMs;
  }

  if (state.mode === "scan" && clockMs >= state.modeUntilMs && candidates.length) {
    state.cursor = (state.cursor + 1) % candidates.length;
    state.goalId = candidates[state.cursor];
    const [low, high] = SCAN_DWELL_MS;
    state.modeUntilMs = clockMs + low + nextRandom(state) * (high - low);
  }

  if (!state.line && clockMs >= state.nextHintMs) {
    botSay(state, hintLine(state, roundIndex), clockMs, 3000);
    state.nextHintMs = clockMs + 6200 + nextRandom(state) * 2600;
  }

  let goal: SpotlightPoint;
  if (state.mode === "recoil" && state.watchId) {
    const towards = pointFor(state.watchId);
    goal = {
      x: state.pos.x + (towards.x - state.pos.x) * 0.32,
      y: state.pos.y + (towards.y - state.pos.y) * 0.32,
    };
  } else if (state.goalId) {
    goal = pointFor(state.goalId);
  } else {
    goal = state.goal;
  }

  if (state.mode !== "commit") {
    const wobble = clockMs / 900;
    goal = {
      x: goal.x + Math.sin(wobble) * 0.012,
      y: goal.y + Math.cos(wobble * 1.37) * 0.014,
    };
  }
  state.goal = goal;

  const seconds = Math.min(dt, 48) / 1000;
  const stiffness = state.mode === "commit" ? 13 : 6.5;
  const damping = 2 * Math.sqrt(stiffness) * 0.92;
  state.velocity.x += ((goal.x - state.pos.x) * stiffness - state.velocity.x * damping) * seconds;
  state.velocity.y += ((goal.y - state.pos.y) * stiffness - state.velocity.y * damping) * seconds;
  state.pos.x = Math.min(1, Math.max(0, state.pos.x + state.velocity.x * seconds));
  state.pos.y = Math.min(1, Math.max(0, state.pos.y + state.velocity.y * seconds));

  if (state.line && clockMs >= state.lineUntilMs) state.line = null;
  return state;
}

export function botIsHolding(state: BotState, objectId: string) {
  return sceneDistance(state.pos, pointFor(objectId)) <= ENGINE.lockRadius;
}

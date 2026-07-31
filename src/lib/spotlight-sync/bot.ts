import { SPOTLIGHT_OBJECT_BY_ID, type SpotlightRoundDefinition } from "./rounds";
import { sceneDistance, type SpotlightPoint } from "./types";

/**
 * The demo partner.
 *
 * It only ever knows its own half of the round, so everything it does has to be
 * readable from the outside: it patrols the objects its clue is true of, holds
 * still when the player settles on one of them, and pulls away from the ones its
 * clue rules out. Watching the teal light is a complete solution path.
 *
 * It is also deliberately quiet. Every line carries a priority and a read time,
 * and the line on screen is never replaced until it has been up long enough to
 * read and something more important needs saying. The partner should come across
 * as someone who says one useful thing and then lets you search, not as a ticker.
 */

/** How near the player's light must be before the partner reads it as interest. */
const NOTICE_RADIUS = 0.125;
/** Settling on an object the partner's clue allows is treated as a proposal. */
const COMMIT_DWELL_MS = 340;
/** Sweeping a light across an object is not a proposal, so ruling one out waits. */
const REJECT_DWELL_MS = 780;
const RECOIL_MS = 700;
const SCAN_DWELL_MS: [number, number] = [900, 1450];
/** An object the partner has just inspected is not circled again this soon. */
const REVISIT_COOLDOWN_MS = 5200;
/** A proposal survives the player's light wobbling off the object. */
const COMMIT_GRACE_MS = 900;
/** How far into a round the partner starts working harder at being followed. */
const ASSIST_AFTER_MS = 15000;
/** Floor on unprompted speech. */
const QUIET_MS = 9000;
/** Rejections are the easiest line to overuse, so they get their own floor. */
const REJECT_INTERVAL_MS = 7000;
/**
 * Nothing short of a round outcome may replace a line this soon after it
 * appeared. Priority decides *which* line wins; this decides that the loser was
 * at least readable first.
 */
const MIN_ON_SCREEN_MS = 1900;

export type BotMode = "scan" | "commit" | "recoil";

export interface BotLine {
  text: string;
  emphasis?: string;
}

/**
 * Higher wins. A line may only cut another one short if it outranks it, which is
 * what stops a stream of "not that one" from burying the opener that carries the
 * partner's clue.
 */
export const BOT_PRIORITY = {
  nudge: 1,
  opener: 2,
  reject: 3,
  commit: 4,
  outcome: 5,
} as const;

export type BotPriority = (typeof BOT_PRIORITY)[keyof typeof BOT_PRIORITY];

export interface BotState {
  pos: SpotlightPoint;
  velocity: SpotlightPoint;
  goal: SpotlightPoint;
  goalId: string | null;
  mode: BotMode;
  modeUntilMs: number;
  /** Candidates in walking order, so the patrol reads as a route. */
  route: string[];
  routeCursor: number;
  /** When each candidate was last inspected, for the revisit cooldown. */
  visitedAtMs: Map<string, number>;
  /** Objects a joint lock has already disproved this round. */
  ruledOut: Set<string>;
  watchId: string | null;
  watchMs: number;
  /** The last object the partner said something about. */
  spokenFor: string | null;
  reactAfterMs: number;
  commitGraceUntilMs: number;
  lastRejectMs: number;
  line: BotLine | null;
  linePriority: number;
  lineShownAtMs: number;
  /** The line stays put at least this long; after that it simply persists. */
  lineHoldUntilMs: number;
  lineSeq: number;
  lastSpokeMs: number;
  seed: number;
}

const COMMIT_LINES: BotLine[] = [
  { text: "That one fits mine. Hold it there.", emphasis: "Hold it there" },
  { text: "Yes — that matches my clue. Keep still.", emphasis: "matches my clue" },
  { text: "That’s one of mine. Hold with me.", emphasis: "Hold with me" },
  { text: "Mine allows that one. Stay on it.", emphasis: "Stay on it" },
];

const REJECT_LINES: BotLine[] = [
  { text: "My clue rules that one out.", emphasis: "rules that one out" },
  { text: "Not there. Follow my light instead.", emphasis: "Follow my light" },
  { text: "That’s outside my half of it.", emphasis: "outside my half" },
];

const RULED_OUT_LINE: BotLine = {
  text: "We tried that one. It’s out.",
  emphasis: "It’s out",
};

/**
 * One natural phrasing per trait. Keys are the WHAT clue labels, so a new trait
 * without an entry still speaks — it just falls back to the generic wording.
 */
const OBJECT_OPENERS: Record<string, BotLine[]> = {
  "It holds liquid": [
    { text: "Mine holds liquid. I’ll sweep the containers.", emphasis: "holds liquid" },
    { text: "I’m after something that holds liquid.", emphasis: "holds liquid" },
  ],
  "Alive and growing": [
    { text: "Mine is alive and growing.", emphasis: "alive and growing" },
    { text: "I’m after something living. Watch my light.", emphasis: "something living" },
  ],
  "Made of glass": [
    { text: "Mine is glass. Watch what the light passes through.", emphasis: "glass" },
    { text: "I’m after something made of glass.", emphasis: "made of glass" },
  ],
  "Made of paper": [
    { text: "Mine is paper. I’ll check the printed things.", emphasis: "paper" },
    { text: "I’m after something made of paper.", emphasis: "made of paper" },
  ],
  "Made of wood": [
    { text: "Mine is wood. Only a couple of those in here.", emphasis: "wood" },
    { text: "I’m after something wooden.", emphasis: "wooden" },
  ],
  "Made of metal": [
    { text: "Mine is metal. I’ll circle the hard edges.", emphasis: "metal" },
    { text: "I’m after something made of metal.", emphasis: "made of metal" },
  ],
  "You wear it": [
    { text: "Mine is something you wear.", emphasis: "something you wear" },
    { text: "You’d put mine on. Watch what I revisit.", emphasis: "put mine on" },
  ],
  "Amber or gold": [
    { text: "Mine is amber or gold. Watch the warm ones.", emphasis: "amber or gold" },
    { text: "My clue is a warm yellow. I’ll circle those.", emphasis: "warm yellow" },
  ],
  "Pink or rose": [
    { text: "Mine is pink. I’ll check the rose-coloured ones.", emphasis: "pink" },
    { text: "My clue is pink or rose.", emphasis: "pink or rose" },
  ],
  Violet: [
    { text: "Mine is violet. Watch the purple things.", emphasis: "violet" },
    { text: "My clue is violet — I’ll circle what fits.", emphasis: "violet" },
  ],
  "Green or teal": [
    { text: "Mine is green or teal. Watch the cool greens.", emphasis: "green or teal" },
    { text: "My clue is a green. I’ll sweep those.", emphasis: "a green" },
  ],
  "Cool grey or pale blue": [
    { text: "Mine is grey or pale blue. The washed-out ones.", emphasis: "grey or pale blue" },
    { text: "My clue is a cool grey. Watch what I revisit.", emphasis: "cool grey" },
  ],
};

function nextRandom(state: BotState) {
  state.seed = (state.seed * 1664525 + 1013904223) % 4294967296;
  return state.seed / 4294967296;
}

function pointFor(objectId: string): SpotlightPoint {
  const object = SPOTLIGHT_OBJECT_BY_ID.get(objectId);
  return object ? { x: object.x, y: object.y } : { x: 0.5, y: 0.5 };
}

export function createBotState(start: SpotlightPoint): BotState {
  return {
    pos: { ...start },
    velocity: { x: 0, y: 0 },
    goal: { ...start },
    goalId: null,
    mode: "scan",
    modeUntilMs: 0,
    route: [],
    routeCursor: 0,
    visitedAtMs: new Map(),
    ruledOut: new Set(),
    watchId: null,
    watchMs: 0,
    spokenFor: null,
    reactAfterMs: 0,
    commitGraceUntilMs: 0,
    lastRejectMs: -Infinity,
    line: null,
    linePriority: 0,
    lineShownAtMs: -Infinity,
    lineHoldUntilMs: 0,
    lineSeq: 0,
    lastSpokeMs: -Infinity,
    seed: 20260908,
  };
}

function spokenLabel(label: string) {
  return label.replace(" · ", ", ").toLowerCase();
}

/**
 * How long a line needs to stay on screen to be readable. Lines are short by
 * design, so this is generous rather than tight: nothing is worse than a hint
 * that vanishes halfway through.
 */
export function botReadMs(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.min(7200, Math.max(3000, 1000 + words * 360));
}

/** Several natural ways a partner might introduce the clue. */
function spokenClue(label: string, kind: "object" | "context"): BotLine[] {
  if (kind === "object" && OBJECT_OPENERS[label]) return OBJECT_OPENERS[label];

  const spoken = spokenLabel(label);
  return kind === "context"
    ? [
        { text: `Mine says ${spoken}. I’ll work that area.`, emphasis: spoken },
        { text: `I have ${spoken}. Watch where my light stays.`, emphasis: spoken },
      ]
    : [
        { text: `Mine says ${spoken}. I’ll circle what fits.`, emphasis: spoken },
        { text: `My clue is ${spoken}. Watch what I revisit.`, emphasis: spoken },
      ];
}

/** Avoid saying the same words twice in a row. */
function pickLine(state: BotState, options: BotLine[]): BotLine {
  if (options.length === 1) return options[0];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const candidate = options[Math.floor(nextRandom(state) * options.length)];
    if (candidate.text !== state.line?.text) return candidate;
  }
  return options[0];
}

/**
 * Put a line on screen, unless something at least as important is still being
 * read. Returns whether it spoke.
 */
export function botSay(
  state: BotState,
  line: BotLine,
  clockMs: number,
  priority: BotPriority,
) {
  if (state.line && clockMs < state.lineHoldUntilMs && priority <= state.linePriority) {
    return false;
  }
  if (
    state.line &&
    priority !== BOT_PRIORITY.outcome &&
    clockMs < state.lineShownAtMs + MIN_ON_SCREEN_MS
  ) {
    return false;
  }
  if (state.line && state.line.text === line.text) {
    // Same thing again: extend the read window rather than restart the bubble.
    state.lineHoldUntilMs = Math.max(state.lineHoldUntilMs, clockMs + botReadMs(line.text));
    return false;
  }
  state.line = line;
  state.linePriority = priority;
  state.lineShownAtMs = clockMs;
  state.lineHoldUntilMs = clockMs + botReadMs(line.text);
  state.lineSeq += 1;
  state.lastSpokeMs = clockMs;
  return true;
}

/**
 * A joint lock on the wrong object is real evidence, and the partner is entitled
 * to it: that object is off its list for the rest of the round.
 */
export function botRuleOut(state: BotState, objectId: string) {
  state.ruledOut.add(objectId);
  if (state.goalId === objectId) {
    state.goalId = null;
    state.mode = "scan";
    state.modeUntilMs = 0;
  }
}

/** Nearest-neighbour tour of the candidates, so the patrol looks deliberate. */
function buildRoute(from: SpotlightPoint, candidates: string[]) {
  const remaining = [...candidates];
  const route: string[] = [];
  let cursor = from;
  while (remaining.length) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const distance = sceneDistance(cursor, pointFor(remaining[index]));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    const [id] = remaining.splice(bestIndex, 1);
    route.push(id);
    cursor = pointFor(id);
  }
  return route;
}

/**
 * The next object to inspect: the next one along the route that is neither
 * disproved nor freshly visited. If every survivor is on cooldown the least
 * recently seen one wins, so the patrol never stalls.
 */
function pickNextGoal(state: BotState, clockMs: number) {
  const live = state.route.filter((id) => !state.ruledOut.has(id));
  if (!live.length) return null;
  if (live.length === 1) return live[0];

  const fresh = live.filter(
    (id) => clockMs - (state.visitedAtMs.get(id) ?? -Infinity) >= REVISIT_COOLDOWN_MS,
  );
  if (!fresh.length) {
    return live.reduce((oldest, id) =>
      (state.visitedAtMs.get(id) ?? 0) < (state.visitedAtMs.get(oldest) ?? 0) ? id : oldest,
    );
  }

  for (let step = 1; step <= state.route.length; step += 1) {
    const id = state.route[(state.routeCursor + step) % state.route.length];
    if (fresh.includes(id)) {
      state.routeCursor = state.route.indexOf(id);
      return id;
    }
  }
  return fresh[0];
}

function nudgeLine(state: BotState, round: SpotlightRoundDefinition): BotLine {
  const clue = round.clues.P02;
  const goal = state.goalId ? SPOTLIGHT_OBJECT_BY_ID.get(state.goalId) : null;
  if (goal) {
    return {
      text: `I’m on the ${goal.label.toLowerCase()} now. Does it fit yours?`,
      emphasis: goal.label.toLowerCase(),
    };
  }
  const clueText = spokenLabel(clue.label);
  return clue.kind === "object"
    ? { text: `Still ${clueText}. Compare that with yours.`, emphasis: clueText }
    : { text: `Anything outside ${clueText} is out.`, emphasis: clueText };
}

export function resetBotForRound(
  state: BotState,
  round: SpotlightRoundDefinition,
  clockMs: number,
) {
  const clue = round.clues.P02;
  state.mode = "scan";
  state.modeUntilMs = clockMs + 260;
  state.route = buildRoute(state.pos, clue.candidates);
  state.routeCursor = 0;
  state.visitedAtMs.clear();
  state.ruledOut.clear();
  state.goalId = null;
  state.watchId = null;
  state.watchMs = 0;
  state.spokenFor = null;
  state.commitGraceUntilMs = 0;
  state.lastRejectMs = -Infinity;
  // Let the opener be read before anything can react over the top of it.
  state.reactAfterMs = clockMs + 3200;

  state.line = null;
  state.linePriority = 0;
  state.lineShownAtMs = -Infinity;
  state.lineHoldUntilMs = 0;
  botSay(state, pickLine(state, spokenClue(clue.label, clue.kind)), clockMs, BOT_PRIORITY.opener);
}

export function stepBot(
  state: BotState,
  dt: number,
  clockMs: number,
  round: SpotlightRoundDefinition,
  player: SpotlightPoint,
  cooldowns: Map<string, number>,
  roundElapsedMs: number,
) {
  const candidates = round.clues.P02.candidates;
  const assisting = roundElapsedMs >= ASSIST_AFTER_MS;

  // --- what is the player looking at? --------------------------------------
  let watching: string | null = null;
  let bestDistance = NOTICE_RADIUS;
  for (const id of SPOTLIGHT_OBJECT_BY_ID.keys()) {
    const distance = sceneDistance(player, pointFor(id));
    if (distance < bestDistance) {
      watching = id;
      bestDistance = distance;
    }
  }

  if (watching === state.watchId) {
    state.watchMs += dt;
  } else {
    state.watchId = watching;
    state.watchMs = 0;
  }

  // --- react ----------------------------------------------------------------
  // Converging is never rate-limited: whenever the player settles on an object
  // this clue allows, the partner goes there, however often that happens. Only
  // the talking is throttled.
  const attended = state.watchId;
  const allowed =
    attended !== null &&
    candidates.includes(attended) &&
    !state.ruledOut.has(attended) &&
    !cooldowns.has(attended);

  if (attended && allowed && state.watchMs >= COMMIT_DWELL_MS) {
    if (state.mode !== "commit" || state.goalId !== attended) {
      state.goalId = attended;
      state.mode = "commit";
      state.commitGraceUntilMs = clockMs + COMMIT_GRACE_MS;
    }
    if (state.spokenFor !== attended && clockMs >= state.reactAfterMs) {
      state.spokenFor = attended;
      botSay(state, pickLine(state, COMMIT_LINES), clockMs, BOT_PRIORITY.commit);
    }
  } else if (
    attended &&
    !allowed &&
    state.watchMs >= REJECT_DWELL_MS &&
    state.mode !== "commit"
  ) {
    if (state.spokenFor !== attended) {
      state.mode = "recoil";
      state.modeUntilMs = clockMs + RECOIL_MS;
      if (clockMs >= state.reactAfterMs && clockMs - state.lastRejectMs >= REJECT_INTERVAL_MS) {
        state.spokenFor = attended;
        state.lastRejectMs = clockMs;
        botSay(
          state,
          state.ruledOut.has(attended) ? RULED_OUT_LINE : pickLine(state, REJECT_LINES),
          clockMs,
          BOT_PRIORITY.reject,
        );
      }
    }
  }

  // A proposal survives the player's light drifting off for a moment; bailing on
  // the first stray pixel is what used to make the lock so hard to complete.
  if (state.mode === "commit" && state.goalId) {
    if (state.watchId === state.goalId && allowed) {
      state.commitGraceUntilMs = clockMs + COMMIT_GRACE_MS;
    } else if (clockMs >= state.commitGraceUntilMs) {
      state.visitedAtMs.set(state.goalId, clockMs);
      state.goalId = null;
      state.mode = "scan";
      state.modeUntilMs = clockMs;
    }
  }

  if (state.mode === "recoil" && clockMs >= state.modeUntilMs) {
    state.mode = "scan";
    state.modeUntilMs = clockMs;
  }

  // --- patrol ---------------------------------------------------------------
  if (state.mode === "scan" && clockMs >= state.modeUntilMs) {
    if (state.goalId) state.visitedAtMs.set(state.goalId, clockMs);
    state.goalId = pickNextGoal(state, clockMs);
    const [low, high] = SCAN_DWELL_MS;
    // Late in a round the partner lingers, which makes its shortlist easier to
    // read off the screen.
    const stretch = assisting ? 1.7 : 1;
    state.modeUntilMs = clockMs + (low + nextRandom(state) * (high - low)) * stretch;
  }

  // --- speak, rarely --------------------------------------------------------
  if (assisting && clockMs - state.lastSpokeMs >= QUIET_MS) {
    botSay(state, nudgeLine(state, round), clockMs, BOT_PRIORITY.nudge);
  }

  // --- move -----------------------------------------------------------------
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
    const amount = assisting ? 0.5 : 1;
    goal = {
      x: goal.x + Math.sin(wobble) * 0.012 * amount,
      y: goal.y + Math.cos(wobble * 1.37) * 0.014 * amount,
    };
  }
  state.goal = goal;

  const seconds = Math.min(dt, 48) / 1000;
  const stiffness = state.mode === "commit" ? 13 : assisting ? 5 : 6.5;
  const damping = 2 * Math.sqrt(stiffness) * 0.92;
  state.velocity.x += ((goal.x - state.pos.x) * stiffness - state.velocity.x * damping) * seconds;
  state.velocity.y += ((goal.y - state.pos.y) * stiffness - state.velocity.y * damping) * seconds;
  state.pos.x = Math.min(1, Math.max(0, state.pos.x + state.velocity.x * seconds));
  state.pos.y = Math.min(1, Math.max(0, state.pos.y + state.velocity.y * seconds));

  return state;
}

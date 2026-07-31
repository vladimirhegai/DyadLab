import {
  sceneDistance,
  type SpotlightClue,
  type SpotlightDistractor,
  type SpotlightObject,
  type SpotlightSurface,
  type SpotlightZone,
} from "./types";

/**
 * Scene layout and round generation for Spotlight Sync.
 *
 * Objects are grouped by the horizontal surface they rest on — upper (wall
 * shelves, hooks, window), mid (bench and desktops), lower (floor) — following
 * the Surface Guidance Framework used in Pereira & Castelhano (2019). WHERE
 * clues name a surface, so a scene-context clue constrains the search the same
 * way surface expectations do in the original studies.
 *
 * Rounds are not authored. Every object carries a list of visible traits, every
 * trait and every region is a possible clue, and a round is any (trait, region)
 * pair whose intersection is exactly one object. The generator searches that
 * space for a sequence that spreads across the room, rotates surfaces, avoids
 * repeating itself, and gets harder as it goes.
 *
 * Coordinates are normalized against the authored 1000 x 620 scene box.
 */

const SURFACE_BOUNDS: Record<SpotlightSurface, [number, number]> = {
  upper: [0, 0.42],
  mid: [0.42, 0.72],
  lower: [0.72, 1],
};

const ZONE_BOUNDS: Record<SpotlightZone, [number, number]> = {
  left: [0, 0.36],
  centre: [0.36, 0.66],
  right: [0.66, 1],
};

export const SURFACE_LABEL: Record<SpotlightSurface, string> = {
  upper: "Up high",
  mid: "Desk height",
  lower: "Floor level",
};

/** The same surfaces, phrased the way a person says them out loud. */
const SURFACE_PHRASE: Record<string, string> = {
  "Up high": "Somewhere up high",
  "Desk height": "Somewhere at desk height",
  "Floor level": "Somewhere on floor level",
};

function surfaceOf(y: number): SpotlightSurface {
  if (y < SURFACE_BOUNDS.upper[1]) return "upper";
  if (y < SURFACE_BOUNDS.mid[1]) return "mid";
  return "lower";
}

function zoneOf(x: number): SpotlightZone {
  if (x < ZONE_BOUNDS.left[1]) return "left";
  if (x < ZONE_BOUNDS.centre[1]) return "centre";
  return "right";
}

/**
 * Every property a WHAT clue can name. A trait has to be answerable from the
 * artwork alone — colour families and obvious substances and uses — because the
 * player is looking at a blurred silhouette, not reading a database.
 */
const TRAIT_LABEL = {
  liquid: "It holds liquid",
  alive: "Alive and growing",
  glass: "Made of glass",
  paper: "Made of paper",
  wood: "Made of wood",
  metal: "Made of metal",
  worn: "You wear it",
  warm: "Amber or gold",
  rose: "Pink or rose",
  violet: "Violet",
  verdant: "Green or teal",
  cool: "Cool grey or pale blue",
} as const;

export type SpotlightTrait = keyof typeof TRAIT_LABEL;

function object(
  id: string,
  label: string,
  kind: SpotlightObject["kind"],
  color: string,
  x: number,
  y: number,
  traits: SpotlightTrait[],
): SpotlightObject {
  const surface = surfaceOf(y);
  const zone = zoneOf(x);
  return { id, label, kind, color, x, y, surface, zone, region: `${surface}-${zone}`, traits };
}

export const SPOTLIGHT_OBJECTS: SpotlightObject[] = [
  // Upper surfaces — wall shelving, pegboard, pendant, window.
  object("jar", "Specimen jar", "specimen", "#7fe0d4", 0.088, 0.188, ["liquid", "glass", "verdant"]),
  object("books", "Book stack", "books", "#e8579c", 0.222, 0.192, ["paper", "rose"]),
  object("ivy", "Trailing ivy", "ivy", "#68c99b", 0.148, 0.334, ["alive", "verdant"]),
  object("clock", "Wall clock", "clock", "#f3c96b", 0.412, 0.145, ["metal", "warm"]),
  object("bulb", "Pendant bulb", "bulb", "#ffd489", 0.598, 0.196, ["glass", "warm"]),
  object("moth", "Violet moth", "moth", "#c08cf5", 0.836, 0.198, ["alive", "violet"]),
  object("star", "Paper star", "star", "#ffd477", 0.944, 0.322, ["paper", "warm"]),

  // Mid surfaces — the long bench and the raised desk.
  object("key", "Brass key", "key", "#f6c453", 0.168, 0.575, ["metal", "warm"]),
  object("camera", "Camera", "camera", "#9b8fa8", 0.298, 0.562, ["cool"]),
  object("notebook", "Notebook", "notebook", "#e3539a", 0.418, 0.578, ["paper", "rose"]),
  object("flask", "Teal flask", "flask", "#4fd0c0", 0.532, 0.556, ["liquid", "glass", "verdant"]),
  object("headphones", "Headphones", "headphones", "#a989e8", 0.688, 0.512, ["worn", "violet"]),
  object("mug", "Rose mug", "mug", "#f472ac", 0.812, 0.5, ["liquid", "rose"]),
  // Cooled off from its old lilac: colour is a load-bearing clue now, and a pale
  // violet here would have made "Violet" ambiguous against the headphones.
  object("glasses", "Glasses", "glasses", "#cfd8e3", 0.918, 0.524, ["glass", "worn", "cool"]),

  // Lower surface — the floor. The toolbox sits centre rather than left so that
  // every zone of every surface holds at least two objects, which is what makes
  // a zone-narrowed WHERE clue legal there and keeps the cable spool reachable.
  object("crate", "Wooden crate", "crate", "#c08a5e", 0.082, 0.862, ["wood"]),
  object("fern", "Potted fern", "plant", "#5fc496", 0.246, 0.806, ["alive", "verdant"]),
  object("toolbox", "Toolbox", "toolbox", "#8fa5c4", 0.436, 0.882, ["metal", "cool"]),
  object("spool", "Cable spool", "spool", "#a6b3c9", 0.556, 0.838, ["wood", "cool"]),
  object("boot", "Rain boot", "boot", "#a67ce6", 0.668, 0.862, ["worn", "violet"]),
  object("can", "Watering can", "can", "#b7c3d6", 0.864, 0.82, ["liquid", "metal", "cool"]),
];

export const SPOTLIGHT_OBJECT_BY_ID = new Map(
  SPOTLIGHT_OBJECTS.map((item) => [item.id, item]),
);

/** A clue is only a clue if it leaves the search ambiguous on its own. */
const MIN_CANDIDATES = 2;

interface ClueSource {
  key: string;
  label: string;
  objectIds: string[];
}

const TRAIT_CLUES: ClueSource[] = (Object.keys(TRAIT_LABEL) as SpotlightTrait[])
  .map((trait) => ({
    key: trait,
    label: TRAIT_LABEL[trait],
    objectIds: SPOTLIGHT_OBJECTS.filter((item) => item.traits.includes(trait)).map((item) => item.id),
  }))
  .filter((clue) => clue.objectIds.length >= MIN_CANDIDATES);

function zoneSuffix(zone: SpotlightZone) {
  return ` · ${zone === "centre" ? "middle" : `${zone} side`}`;
}

interface RegionClue extends ClueSource {
  surface: SpotlightSurface;
  zone: SpotlightZone | null;
}

const REGION_CLUES: RegionClue[] = (() => {
  const surfaces = Object.keys(SURFACE_BOUNDS) as SpotlightSurface[];
  const zones = Object.keys(ZONE_BOUNDS) as SpotlightZone[];
  const out: RegionClue[] = [];
  for (const surface of surfaces) {
    const whole = SPOTLIGHT_OBJECTS.filter((item) => item.surface === surface);
    out.push({
      key: surface,
      label: SURFACE_LABEL[surface],
      objectIds: whole.map((item) => item.id),
      surface,
      zone: null,
    });
    for (const zone of zones) {
      const narrowed = whole.filter((item) => item.zone === zone);
      if (narrowed.length < MIN_CANDIDATES) continue;
      out.push({
        key: `${surface}-${zone}`,
        label: `${SURFACE_LABEL[surface]}${zoneSuffix(zone)}`,
        objectIds: narrowed.map((item) => item.id),
        surface,
        zone,
      });
    }
  }
  return out.filter((clue) => clue.objectIds.length >= MIN_CANDIDATES);
})();

/**
 * Every legal round in the scene: a trait and a region that overlap on exactly
 * one object. This is the whole search space, enumerated once at module load.
 */
export interface RoundCore {
  targetId: string;
  trait: ClueSource;
  region: RegionClue;
}

export const ROUND_CORES: RoundCore[] = (() => {
  const out: RoundCore[] = [];
  for (const trait of TRAIT_CLUES) {
    for (const region of REGION_CLUES) {
      const overlap = trait.objectIds.filter((id) => region.objectIds.includes(id));
      if (overlap.length === 1) out.push({ targetId: overlap[0], trait, region });
    }
  }
  return out;
})();

// The promise the scene makes is that nothing in it is decoration: every object
// can be the answer to some round. Break that by editing a trait or a position
// and the module refuses to load rather than quietly stranding an object.
{
  const reachable = new Set(ROUND_CORES.map((core) => core.targetId));
  const stranded = SPOTLIGHT_OBJECTS.filter((item) => !reachable.has(item.id));
  if (stranded.length) {
    throw new Error(
      `Spotlight Sync: no clue pair can single out ${stranded.map((item) => item.id).join(", ")}`,
    );
  }
}

export interface SpotlightRoundDefinition {
  id: string;
  clues: { P01: SpotlightClue; P02: SpotlightClue };
  targetId: string;
  targetSurface: SpotlightSurface;
  distractor: SpotlightDistractor | null;
}

/** Longest possible separation in the scene, used to normalize travel scores. */
const MAX_TRAVEL = sceneDistance({ x: 0, y: 0 }, { x: 1, y: 1 });
/** Biggest (trait + region) candidate count any round can have. */
const MAX_BREADTH = Math.max(
  ...ROUND_CORES.map((core) => core.trait.objectIds.length + core.region.objectIds.length),
);

const WEIGHTS = {
  /** Send the pair across the room rather than to the next object along. */
  travel: 3,
  /** A new surface forces the search to re-anchor instead of drifting. */
  surfaceChange: 2.2,
  /** Keep the three surfaces evenly used across a session. */
  surfaceBalance: 1.4,
  /** Hit the difficulty the ramp is asking for at this point in the session. */
  difficulty: 2.6,
  /** Do not reuse a phrase or a region while it is still fresh. */
  freshness: 2,
} as const;

/**
 * How much worse than the best a round can be and still get picked. Taking the
 * argmax every time produced good sequences that were always the *same* good
 * sequences, and left objects with an unremarkable score — the toolbox, the
 * bulb — chosen roughly once in a hundred sessions.
 */
const TEMPERATURE = 1.1;

/**
 * How many trait/region pairs single out each object. Sampling is divided by
 * this so an object with four ways in does not out-vote one with a single way
 * in: the choice is between objects, not between clue pairs.
 */
const CORES_PER_TARGET = new Map<string, number>();
for (const core of ROUND_CORES) {
  CORES_PER_TARGET.set(core.targetId, (CORES_PER_TARGET.get(core.targetId) ?? 0) + 1);
}

/** How many rounds a trait or region stays "recently used". */
const FRESH_WINDOW = 3;
/** Salient onsets land somewhere in here, never twice at the same moment. */
const ONSET_RANGE: [number, number] = [1100, 2400];
const ONSET_MIN_GAP = 260;

function makeRandom(seed: number) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function freshness(usedAt: Map<string, number>, key: string, index: number) {
  const last = usedAt.get(key);
  if (last === undefined) return 1;
  return Math.min(1, (index - last) / FRESH_WINDOW);
}

/**
 * Pick the flash for a round.
 *
 * `relevant` decides the manipulation — whether the onset lands on the surface
 * the target could plausibly be on. Beyond that the best decoy is one that is
 * true of exactly one of the two clues: it looks like a live candidate to one
 * player while the other's clue silently rules it out. Distance from the target
 * matters too, since a flash next to the answer is a hint, not a distraction.
 */
function pickDistractor(
  target: SpotlightObject,
  core: RoundCore,
  relevant: boolean,
  random: () => number,
  onsetMs: number,
): SpotlightDistractor {
  let best = SPOTLIGHT_OBJECTS[0];
  let bestScore = -Infinity;
  for (const item of SPOTLIGHT_OBJECTS) {
    if (item.id === target.id) continue;
    if ((item.surface === target.surface) !== relevant) continue;
    const inTrait = core.trait.objectIds.includes(item.id);
    const inRegion = core.region.objectIds.includes(item.id);
    const score =
      (inTrait !== inRegion ? 2 : 0) +
      sceneDistance(item, target) / MAX_TRAVEL +
      random() * 0.8;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return {
    objectId: best.id,
    relevance: relevant ? "relevant" : "irrelevant",
    onsetMs: Math.round(onsetMs),
    durationMs: 900,
  };
}

/**
 * Build a session.
 *
 * Same seed, same rounds — the demo rolls a fresh seed per playthrough and logs
 * it, so any run someone reports can be replayed exactly.
 */
export function generateRounds(seed: number, count = 6): SpotlightRoundDefinition[] {
  const random = makeRandom(seed);
  const rounds: SpotlightRoundDefinition[] = [];
  const usedTargets = new Set<string>();
  const traitUsedAt = new Map<string, number>();
  const regionUsedAt = new Map<string, number>();
  const surfaceUse: Record<SpotlightSurface, number> = { upper: 0, mid: 0, lower: 0 };

  // Both alternations start on a coin flip so a session is not recognisable from
  // its first round, then strictly alternate so the split stays even.
  let holder: "P01" | "P02" = random() < 0.5 ? "P01" : "P02";
  let relevant = random() < 0.5;
  let previous: SpotlightObject | null = null;
  let previousOnset = -Infinity;
  let lastTraitKey = "";
  let lastRegionKey = "";

  for (let index = 0; index < count; index += 1) {
    // Open narrow and finish broad: a clue true of more objects rules out less.
    const wantBreadth = count > 1 ? index / (count - 1) : 1;
    // Freshness makes a repeat unlikely; back-to-back is ruled out outright,
    // because hearing the same clue twice running reads as a bug rather than a
    // coincidence. Each fallback widens only if the stricter pool came up empty.
    const unused = ROUND_CORES.filter((core) => !usedTargets.has(core.targetId));
    const varied = unused.filter(
      (core) => core.trait.key !== lastTraitKey && core.region.key !== lastRegionKey,
    );
    const options = varied.length ? varied : unused.length ? unused : ROUND_CORES;

    const scores = options.map((core) => {
      const target = SPOTLIGHT_OBJECT_BY_ID.get(core.targetId)!;
      const breadth =
        (core.trait.objectIds.length + core.region.objectIds.length) / MAX_BREADTH;
      return (
        (previous ? sceneDistance(previous, target) / MAX_TRAVEL : 0) * WEIGHTS.travel +
        (previous && previous.surface !== target.surface ? 1 : 0) * WEIGHTS.surfaceChange -
        surfaceUse[target.surface] * WEIGHTS.surfaceBalance -
        Math.abs(breadth - wantBreadth) * WEIGHTS.difficulty +
        (freshness(traitUsedAt, core.trait.key, index) +
          freshness(regionUsedAt, core.region.key, index)) *
          WEIGHTS.freshness
      );
    });

    // Softmax over the scores rather than argmax, normalized per object so the
    // number of ways into an object does not double as its odds.
    const ceiling = Math.max(...scores);
    const weights = scores.map(
      (score, at) =>
        Math.exp((score - ceiling) / TEMPERATURE) /
        (CORES_PER_TARGET.get(options[at].targetId) ?? 1),
    );
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = random() * total;
    let best = options[options.length - 1];
    for (let at = 0; at < options.length; at += 1) {
      roll -= weights[at];
      if (roll <= 0) {
        best = options[at];
        break;
      }
    }

    const target = SPOTLIGHT_OBJECT_BY_ID.get(best.targetId)!;
    usedTargets.add(best.targetId);
    traitUsedAt.set(best.trait.key, index);
    regionUsedAt.set(best.region.key, index);
    lastTraitKey = best.trait.key;
    lastRegionKey = best.region.key;
    surfaceUse[target.surface] += 1;

    let onsetMs = 0;
    do {
      onsetMs = ONSET_RANGE[0] + random() * (ONSET_RANGE[1] - ONSET_RANGE[0]);
    } while (Math.abs(onsetMs - previousOnset) < ONSET_MIN_GAP);
    previousOnset = onsetMs;

    const whatClue: SpotlightClue = {
      kind: "object",
      label: best.trait.label,
      shortLabel: "WHAT",
      candidates: best.trait.objectIds,
    };
    const whereClue: SpotlightClue = {
      kind: "context",
      label: best.region.label,
      shortLabel: "WHERE",
      candidates: best.region.objectIds,
    };

    rounds.push({
      id: `spotlight-${String(index + 1).padStart(2, "0")}`,
      clues:
        holder === "P01"
          ? { P01: whatClue, P02: whereClue }
          : { P01: whereClue, P02: whatClue },
      targetId: best.targetId,
      targetSurface: target.surface,
      distractor: pickDistractor(target, best, relevant, random, onsetMs),
    });

    holder = holder === "P01" ? "P02" : "P01";
    relevant = !relevant;
    previous = target;
  }

  assertRoundsPlayable(rounds);
  return rounds;
}

/**
 * The task rests on the two clues being individually ambiguous and jointly
 * decisive. Generated data gets checked, not trusted.
 */
export function assertRoundsPlayable(rounds: SpotlightRoundDefinition[]) {
  for (const round of rounds) {
    const { P01, P02 } = round.clues;
    const overlap = P01.candidates.filter((id) => P02.candidates.includes(id));
    if (overlap.length !== 1 || overlap[0] !== round.targetId) {
      throw new Error(
        `Round ${round.id} does not resolve to exactly one target: [${overlap.join(", ")}]`,
      );
    }
    if (P01.candidates.length < MIN_CANDIDATES || P02.candidates.length < MIN_CANDIDATES) {
      throw new Error(`Round ${round.id} has a clue that is decisive on its own`);
    }
    if (round.distractor?.objectId === round.targetId) {
      throw new Error(`Round ${round.id} uses the target as its own distractor`);
    }
  }
}

/** The canonical session, for the hero preview and for anything that needs a fixed one. */
export const DEFAULT_ROUND_SEED = 20260908;
export const SPOTLIGHT_ROUNDS: SpotlightRoundDefinition[] = generateRounds(DEFAULT_ROUND_SEED);

/**
 * A clue as its holder would say it — used for the tag that rides along with
 * your own spotlight, so the half of the answer you hold is never off screen.
 */
export function spokenSelfClue(clue: SpotlightClue) {
  if (clue.kind === "object") return `${clue.label}…`;
  const [surface, zone] = clue.label.split(" · ");
  const phrase = SURFACE_PHRASE[surface] ?? `Somewhere ${surface.toLowerCase()}`;
  return zone ? `${phrase}, ${zone}…` : `${phrase}…`;
}

export function getSpotlightObject(objectId: string): SpotlightObject | undefined {
  return SPOTLIGHT_OBJECT_BY_ID.get(objectId);
}

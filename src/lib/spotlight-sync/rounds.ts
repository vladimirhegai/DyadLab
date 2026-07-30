import type {
  SpotlightClue,
  SpotlightDistractor,
  SpotlightObject,
  SpotlightRoundView,
  SpotlightSurface,
  SpotlightZone,
} from "./types";

/**
 * Scene layout for Spotlight Sync.
 *
 * Objects are grouped by the horizontal surface they rest on — upper (wall
 * shelves, hooks, window), mid (bench and desktops), lower (floor) — following
 * the Surface Guidance Framework used in Pereira & Castelhano (2019). WHERE
 * clues name a surface, so a scene-context clue constrains the search the same
 * way surface expectations do in the original studies.
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

function object(
  id: string,
  label: string,
  kind: SpotlightObject["kind"],
  color: string,
  x: number,
  y: number,
): SpotlightObject {
  const surface = surfaceOf(y);
  const zone = zoneOf(x);
  return { id, label, kind, color, x, y, surface, zone, region: `${surface}-${zone}` };
}

export const SPOTLIGHT_OBJECTS: SpotlightObject[] = [
  // Upper surfaces — wall shelving, pegboard, pendant, window.
  object("jar", "Specimen jar", "specimen", "#7fe0d4", 0.088, 0.188),
  object("books", "Book stack", "books", "#e8579c", 0.222, 0.192),
  object("ivy", "Trailing ivy", "ivy", "#68c99b", 0.148, 0.334),
  object("clock", "Wall clock", "clock", "#f3c96b", 0.412, 0.145),
  object("bulb", "Pendant bulb", "bulb", "#ffd489", 0.598, 0.196),
  object("moth", "Violet moth", "moth", "#c08cf5", 0.836, 0.198),
  object("star", "Paper star", "star", "#ffd477", 0.944, 0.322),

  // Mid surfaces — the long bench and the raised desk.
  object("key", "Brass key", "key", "#f6c453", 0.168, 0.575),
  object("camera", "Camera", "camera", "#9b8fa8", 0.298, 0.562),
  object("notebook", "Notebook", "notebook", "#e3539a", 0.418, 0.578),
  object("flask", "Teal flask", "flask", "#4fd0c0", 0.532, 0.556),
  object("headphones", "Headphones", "headphones", "#a989e8", 0.688, 0.512),
  object("mug", "Rose mug", "mug", "#f472ac", 0.812, 0.5),
  object("glasses", "Glasses", "glasses", "#d8c8e1", 0.918, 0.524),

  // Lower surface — the floor.
  object("crate", "Wooden crate", "crate", "#c08a5e", 0.082, 0.862),
  object("fern", "Potted fern", "plant", "#5fc496", 0.246, 0.806),
  object("toolbox", "Toolbox", "toolbox", "#8fa5c4", 0.338, 0.882),
  object("spool", "Cable spool", "spool", "#a6b3c9", 0.512, 0.838),
  object("boot", "Rain boot", "boot", "#a67ce6", 0.668, 0.862),
  object("can", "Watering can", "can", "#b7c3d6", 0.864, 0.82),
];

export const SPOTLIGHT_OBJECT_BY_ID = new Map(
  SPOTLIGHT_OBJECTS.map((item) => [item.id, item]),
);

function inRegion(surface: SpotlightSurface, zone?: SpotlightZone) {
  return SPOTLIGHT_OBJECTS.filter(
    (item) => item.surface === surface && (!zone || item.zone === zone),
  ).map((item) => item.id);
}

interface RoundSource {
  id: string;
  /** Object-content clue: every object the property is true of. */
  what: { label: string; candidates: string[] };
  /** Scene-context clue: a surface, optionally narrowed to one side. */
  where: { surface: SpotlightSurface; zone?: SpotlightZone };
  /** Which participant holds the WHAT clue this round; roles alternate. */
  contentHolder: "P01" | "P02";
  targetId: string;
  distractor?: { objectId: string; onsetMs?: number; durationMs?: number };
}

const ROUND_SOURCES: RoundSource[] = [
  {
    id: "spotlight-01",
    what: { label: "It holds liquid", candidates: ["jar", "flask", "mug", "can"] },
    where: { surface: "mid", zone: "right" },
    contentHolder: "P01",
    targetId: "mug",
  },
  {
    id: "spotlight-02",
    what: { label: "Violet", candidates: ["moth", "headphones", "boot"] },
    where: { surface: "upper", zone: "right" },
    contentHolder: "P02",
    targetId: "moth",
  },
  {
    id: "spotlight-03",
    what: { label: "Brass, a warm yellow metal", candidates: ["clock", "key"] },
    where: { surface: "mid" },
    contentHolder: "P01",
    targetId: "key",
    // Onset on the target-relevant surface.
    distractor: { objectId: "camera" },
  },
  {
    id: "spotlight-04",
    what: { label: "Alive and growing", candidates: ["ivy", "moth", "fern"] },
    where: { surface: "lower" },
    contentHolder: "P02",
    targetId: "fern",
    // Onset on a target-irrelevant surface.
    distractor: { objectId: "clock" },
  },
  {
    id: "spotlight-05",
    what: { label: "Glass, and it holds liquid", candidates: ["jar", "flask", "mug"] },
    where: { surface: "upper", zone: "left" },
    contentHolder: "P01",
    targetId: "jar",
    distractor: { objectId: "books" },
  },
  {
    id: "spotlight-06",
    what: { label: "It holds liquid", candidates: ["jar", "flask", "mug", "can"] },
    where: { surface: "lower" },
    contentHolder: "P02",
    targetId: "can",
    distractor: { objectId: "headphones" },
  },
];

export interface SpotlightRoundDefinition {
  id: string;
  clues: { P01: SpotlightClue; P02: SpotlightClue };
  targetId: string;
  targetSurface: SpotlightSurface;
  distractor: SpotlightDistractor | null;
}

function buildRound(source: RoundSource): SpotlightRoundDefinition {
  const whereCandidates = inRegion(source.where.surface, source.where.zone);
  const intersection = source.what.candidates.filter((id) =>
    whereCandidates.includes(id),
  );

  // The whole task rests on the two clues being individually ambiguous and
  // jointly decisive, so the data is validated rather than trusted.
  if (intersection.length !== 1 || intersection[0] !== source.targetId) {
    throw new Error(
      `Round ${source.id} does not resolve to exactly one target: [${intersection.join(", ")}]`,
    );
  }
  if (source.what.candidates.length < 2 || whereCandidates.length < 2) {
    throw new Error(`Round ${source.id} has a clue that is decisive on its own`);
  }

  const target = SPOTLIGHT_OBJECT_BY_ID.get(source.targetId)!;
  const zoneLabel = source.where.zone
    ? ` · ${source.where.zone === "centre" ? "middle" : `${source.where.zone} side`}`
    : "";

  const whatClue: SpotlightClue = {
    kind: "object",
    label: source.what.label,
    shortLabel: "WHAT",
    candidates: source.what.candidates,
  };
  const whereClue: SpotlightClue = {
    kind: "context",
    label: `${SURFACE_LABEL[source.where.surface]}${zoneLabel}`,
    shortLabel: "WHERE",
    candidates: whereCandidates,
  };

  let distractor: SpotlightDistractor | null = null;
  if (source.distractor) {
    const distractorObject = SPOTLIGHT_OBJECT_BY_ID.get(source.distractor.objectId);
    if (!distractorObject) {
      throw new Error(`Round ${source.id} names an unknown distractor`);
    }
    if (distractorObject.id === source.targetId) {
      throw new Error(`Round ${source.id} uses the target as its own distractor`);
    }
    distractor = {
      objectId: distractorObject.id,
      relevance:
        distractorObject.surface === target.surface ? "relevant" : "irrelevant",
      onsetMs: source.distractor.onsetMs ?? 1600,
      durationMs: source.distractor.durationMs ?? 900,
    };
  }

  return {
    id: source.id,
    clues:
      source.contentHolder === "P01"
        ? { P01: whatClue, P02: whereClue }
        : { P01: whereClue, P02: whatClue },
    targetId: source.targetId,
    targetSurface: target.surface,
    distractor,
  };
}

export const SPOTLIGHT_ROUNDS: SpotlightRoundDefinition[] =
  ROUND_SOURCES.map(buildRound);

export function getSpotlightRound(
  index: number,
  viewer: "P01" | "P02" | "researcher",
): SpotlightRoundView {
  const round = SPOTLIGHT_ROUNDS[index];
  if (!round) throw new Error(`Unknown Spotlight Sync round: ${index}`);

  if (viewer === "researcher") {
    return {
      id: round.id,
      objects: SPOTLIGHT_OBJECTS,
      clue: null,
      researcherClues: round.clues,
      targetId: round.targetId,
      distractor: round.distractor,
    };
  }

  const partner = viewer === "P01" ? "P02" : "P01";
  return {
    id: round.id,
    objects: SPOTLIGHT_OBJECTS,
    clue: round.clues[viewer],
    partnerClue: round.clues[partner],
  };
}

export function getSpotlightObject(objectId: string): SpotlightObject | undefined {
  return SPOTLIGHT_OBJECT_BY_ID.get(objectId);
}

export function objectsOnSurface(surface: SpotlightSurface) {
  return SPOTLIGHT_OBJECTS.filter((item) => item.surface === surface);
}

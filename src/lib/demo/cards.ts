import type { AbstractCard, ParticipantId } from "./types";

// 12 unique abstract card "types". Cards c1-c4 are shared between both
// participants' hands (the ground-truth overlap the task asks them to find).
// c5-c8 belong only to P01, c9-c12 only to P02.
const DECK: AbstractCard[] = [
  { id: "c1", shape: "circle", color: "#1f6f78", pattern: "solid" },
  { id: "c2", shape: "diamond", color: "#a6192e", pattern: "striped" },
  { id: "c3", shape: "hexagon", color: "#8a6d3b", pattern: "dotted" },
  { id: "c4", shape: "star", color: "#3b5b8c", pattern: "solid" },
  { id: "c5", shape: "triangle", color: "#54607a", pattern: "solid" },
  { id: "c6", shape: "square", color: "#1f6f78", pattern: "dotted" },
  { id: "c7", shape: "circle", color: "#a6192e", pattern: "striped" },
  { id: "c8", shape: "diamond", color: "#8a6d3b", pattern: "solid" },
  { id: "c9", shape: "hexagon", color: "#3b5b8c", pattern: "striped" },
  { id: "c10", shape: "star", color: "#54607a", pattern: "dotted" },
  { id: "c11", shape: "triangle", color: "#1f6f78", pattern: "solid" },
  { id: "c12", shape: "square", color: "#a6192e", pattern: "solid" },
];

export const SHARED_CARD_IDS = ["c1", "c2", "c3", "c4"];

const byId = new Map(DECK.map((c) => [c.id, c]));

function cardsFor(ids: string[]): AbstractCard[] {
  return ids.map((id) => {
    const card = byId.get(id);
    if (!card) throw new Error(`Unknown demo card id: ${id}`);
    return card;
  });
}

export function dealHand(participant: ParticipantId): AbstractCard[] {
  if (participant === "P01") {
    return cardsFor(["c1", "c5", "c2", "c6", "c3", "c7", "c4", "c8"]);
  }
  return cardsFor(["c9", "c1", "c10", "c2", "c11", "c3", "c12", "c4"]);
}

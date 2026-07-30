"use client";

import { useEffect, useRef, useState } from "react";
import { SpotlightStage, type StageHandle } from "@/components/spotlight/SpotlightStage";
import { SPOTLIGHT_OBJECT_BY_ID, SPOTLIGHT_ROUNDS } from "@/lib/spotlight-sync/rounds";
import type { SpotlightPoint } from "@/lib/spotlight-sync/types";

const PREVIEW_ROUNDS = SPOTLIGHT_ROUNDS.slice(0, 3);
const ROUND_MS = 4200;

const STARTS: { p1: SpotlightPoint; p2: SpotlightPoint }[] = [
  { p1: { x: 0.18, y: 0.72 }, p2: { x: 0.78, y: 0.24 } },
  { p1: { x: 0.74, y: 0.7 }, p2: { x: 0.2, y: 0.3 } },
  { p1: { x: 0.26, y: 0.24 }, p2: { x: 0.84, y: 0.68 } },
];

const WAYPOINTS: { p1: SpotlightPoint; p2: SpotlightPoint }[] = [
  { p1: { x: 0.42, y: 0.52 }, p2: { x: 0.66, y: 0.42 } },
  { p1: { x: 0.56, y: 0.34 }, p2: { x: 0.38, y: 0.62 } },
  { p1: { x: 0.38, y: 0.7 }, p2: { x: 0.62, y: 0.32 } },
];

function ease(value: number) {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 3);
}

function mix(from: SpotlightPoint, to: SpotlightPoint, progress: number): SpotlightPoint {
  const amount = ease(progress);
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
  };
}

function botPosition(
  start: SpotlightPoint,
  waypoint: SpotlightPoint,
  target: SpotlightPoint,
  progress: number,
) {
  if (progress < 0.46) return mix(start, waypoint, progress / 0.46);
  if (progress < 0.8) return mix(waypoint, target, (progress - 0.46) / 0.34);
  return target;
}

export function HeroSpotlightPreview() {
  const stageRef = useRef<StageHandle>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const activeRoundRef = useRef(-1);
  const celebratedRoundRef = useRef(-1);
  const [activeRound, setActiveRound] = useState(0);
  const [foundIds, setFoundIds] = useState<string[]>([]);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = (now: number) => {
      // The first RAF timestamp can be fractionally earlier than a freshly
      // sampled performance.now(), which would otherwise produce round -1.
      const elapsed = reduceMotion ? ROUND_MS * 0.7 : Math.max(0, now - startedAt);
      const roundIndex = Math.floor(elapsed / ROUND_MS) % PREVIEW_ROUNDS.length;
      const progress = (elapsed % ROUND_MS) / ROUND_MS;
      const definition = PREVIEW_ROUNDS[roundIndex];
      const targetObject = SPOTLIGHT_OBJECT_BY_ID.get(definition.targetId);

      if (!targetObject) {
        frame = requestAnimationFrame(tick);
        return;
      }

      if (roundIndex !== activeRoundRef.current) {
        activeRoundRef.current = roundIndex;
        celebratedRoundRef.current = -1;
        setActiveRound(roundIndex);
        setFoundIds(roundIndex === 0 ? [] : PREVIEW_ROUNDS.slice(0, roundIndex).map((item) => item.targetId));
      }

      const target = { x: targetObject.x, y: targetObject.y };
      const starts = STARTS[roundIndex];
      const waypoints = WAYPOINTS[roundIndex];
      const p1 = botPosition(starts.p1, waypoints.p1, target, progress);
      const p2 = botPosition(starts.p2, waypoints.p2, target, Math.max(0, progress - 0.08) / 0.92);
      const locking = progress >= 0.8;

      stageRef.current?.apply({
        p1,
        p2,
        hoverId: null,
        lockId: locking ? definition.targetId : null,
        lockProgress: locking ? Math.min(1, (progress - 0.8) / 0.13) : 0,
        distractorId: null,
        dt: 16,
      });

      if (statusRef.current) {
        statusRef.current.textContent =
          progress < 0.46 ? "Bots searching" : progress < 0.8 ? "Converging" : "Target found";
      }

      if (progress > 0.9 && celebratedRoundRef.current !== roundIndex) {
        celebratedRoundRef.current = roundIndex;
        stageRef.current?.celebrate(target);
      }

      if (!reduceMotion) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <figure
      className="hero-preview"
      aria-label="The real Spotlight Sync scene with two simulated bots playing"
    >
      <div className="hero-preview-chrome">
        <div className="hero-preview-title">
          <span className="hero-preview-live" aria-hidden="true" />
          <span>Spotlight Sync</span>
        </div>
        <span className="hero-preview-mode">Live bot simulation</span>
      </div>

      <div className="hero-preview-actual">
        <SpotlightStage
          ref={stageRef}
          contextMode="rich"
          interactive={false}
          foundIds={foundIds}
          ariaLabel="Two automated spotlights search the real game scene"
        />
        <div className="hero-preview-clue hero-preview-clue-you" aria-hidden="true">
          <span>Bot A knows what</span>
          <strong>{PREVIEW_ROUNDS[activeRound].clues.P01.label}</strong>
        </div>
        <div className="hero-preview-clue hero-preview-clue-bot" aria-hidden="true">
          <span>Bot B knows where</span>
          <strong>{PREVIEW_ROUNDS[activeRound].clues.P02.label}</strong>
        </div>
      </div>

      <figcaption className="hero-preview-caption">
        <span>
          <i className="hero-avatar hero-avatar-you">A</i>
          Bot A
        </span>
        <span className="hero-preview-status">
          <i aria-hidden="true" />
          <span ref={statusRef}>Bots searching</span>
        </span>
        <span>
          <i className="hero-avatar hero-avatar-bot">B</i>
          Bot B
        </span>
      </figcaption>
    </figure>
  );
}

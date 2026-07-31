"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ParticipantId } from "@/lib/demo/types";
import { ENGINE, objectUnder } from "@/lib/spotlight-sync/engine";
import { getSpotlightObject, spokenSelfClue } from "@/lib/spotlight-sync/rounds";
import {
  DEFAULT_SPOTLIGHT_POSITIONS,
  type SpotlightPoint,
  type SpotlightPositions,
  type SpotlightTaskState,
} from "@/lib/spotlight-sync/types";
import { SpotlightStage, type StageHandle } from "./SpotlightStage";

const MemoStage = memo(SpotlightStage);

/**
 * The two-browser version of the task.
 *
 * Input matches the bot experience: both spotlights must cover the same object
 * while the focus ring fills. The server verifies that shared hold and owns the
 * outcome, so this component never decides whether a round was a hit.
 */
export function SpotlightLiveBoard({
  task,
  viewer,
  positions,
  onMove,
  onSelect,
}: {
  task: SpotlightTaskState;
  viewer: ParticipantId;
  positions: SpotlightPositions;
  onMove: (point: SpotlightPoint) => void;
  onSelect: (objectId: string) => void;
}) {
  const partner: ParticipantId = viewer === "P01" ? "P02" : "P01";
  const round = task.currentRound;
  const ownSelection = task.selections[viewer];
  const partnerSelection = task.selections[partner];
  const playing = task.status === "active" && task.phase === "playing" && !ownSelection;

  const stageRef = useRef<StageHandle>(null);
  const selfRef = useRef<SpotlightPoint>(
    positions[viewer] ?? DEFAULT_SPOTLIGHT_POSITIONS[viewer]!,
  );
  const partnerRef = useRef<SpotlightPoint>(
    positions[partner] ?? DEFAULT_SPOTLIGHT_POSITIONS[partner]!,
  );
  const holdRef = useRef({ id: null as string | null, progress: 0, blockedId: null as string | null });
  const committedRef = useRef<string | null>(null);
  const playingRef = useRef(playing);
  const roundKeyRef = useRef("");
  const viewerRef = useRef(viewer);
  const [sharedObjectId, setSharedObjectId] = useState<string | null>(null);

  const foundIds = useMemo(
    () => task.history.filter((outcome) => outcome.success).map((outcome) => outcome.targetId),
    [task.history],
  );

  // Everything the loop reads goes through a ref. The parent re-renders on every
  // inbound partner position, and a loop that restarted that often would reset
  // its own frame clock and never accumulate a hold.
  const liveRef = useRef({ roundKey: "", onSelect });

  useEffect(() => {
    playingRef.current = playing;
    viewerRef.current = viewer;
    liveRef.current = {
      roundKey: `${task.currentRoundIndex}:${task.phase}`,
      onSelect,
    };
    const incoming = positions[partner];
    if (incoming) partnerRef.current = incoming;
  });

  useEffect(() => {
    if (task.status !== "active") {
      stageRef.current?.apply({
        p1:
          viewerRef.current === "P01"
            ? selfRef.current
            : partnerRef.current,
        p2:
          viewerRef.current === "P01"
            ? partnerRef.current
            : selfRef.current,
        hoverId: null,
        lockId: null,
        lockProgress: 0,
        distractorId: null,
        dt: 0,
      });
      return;
    }

    let frame = 0;
    let last = performance.now();
    let lastShared: string | null = null;

    const tick = (now: number) => {
      const dt = Math.max(0, now - last);
      last = now;
      const self = selfRef.current;
      const other = partnerRef.current;
      const hold = holdRef.current;
      const { roundKey, onSelect: commit } = liveRef.current;

      // A fresh round clears the local hold. The object committed last round
      // stays blocked until the spotlight leaves it, so simply resting where the
      // previous target was can never commit that object again by accident.
      if (roundKey !== roundKeyRef.current) {
        roundKeyRef.current = roundKey;
        hold.id = null;
        hold.progress = 0;
        hold.blockedId = committedRef.current ?? hold.blockedId;
        committedRef.current = null;
      }

      const selfObject = objectUnder(self);
      const partnerObject = objectUnder(other);
      const sharedObject =
        selfObject && partnerObject && selfObject.id === partnerObject.id
          ? selfObject
          : null;

      if (playingRef.current && !committedRef.current) {
        if (sharedObject && sharedObject.id !== hold.blockedId) {
          hold.blockedId = null;
          if (hold.id !== sharedObject.id) {
            hold.id = sharedObject.id;
            hold.progress = 0;
          }
          hold.progress = Math.min(1, hold.progress + dt / ENGINE.lockHoldMs);
          if (hold.progress >= 1) {
            committedRef.current = sharedObject.id;
            commit(sharedObject.id);
          }
        } else {
          if (!sharedObject) hold.blockedId = null;
          hold.progress = Math.max(0, hold.progress - (dt / 1000) * ENGINE.lockDecayPerSecond);
          if (hold.progress === 0) hold.id = null;
        }
      }

      const bothHere = sharedObject?.id ?? null;
      if (bothHere !== lastShared) {
        lastShared = bothHere;
        setSharedObjectId(bothHere);
      }

      stageRef.current?.apply({
        p1: viewerRef.current === "P01" ? self : other,
        p2: viewerRef.current === "P01" ? other : self,
        hoverId: playingRef.current ? selfObject?.id ?? null : null,
        lockId: committedRef.current ?? hold.id,
        lockProgress: committedRef.current ? 1 : hold.progress,
        distractorId: null,
        dt: Math.min(dt, 50),
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [task.status]);

  useEffect(() => {
    if (task.phase === "playing" && !ownSelection && committedRef.current) {
      const blockedId = committedRef.current;
      committedRef.current = null;
      holdRef.current.id = null;
      holdRef.current.progress = 0;
      holdRef.current.blockedId = blockedId;
    }
  }, [ownSelection, task.phase]);

  useEffect(() => {
    if (task.phase === "feedback" && task.lastOutcome?.success) {
      const object = getSpotlightObject(task.lastOutcome.targetId);
      if (object) stageRef.current?.celebrate({ x: object.x, y: object.y });
    }
  }, [task.phase, task.lastOutcome]);

  const handleMove = useCallback(
    (point: SpotlightPoint) => {
      selfRef.current = point;
      onMove(point);
    },
    [onMove],
  );

  const handleSnap = useCallback(
    (_objectId: string, point: SpotlightPoint) => {
      selfRef.current = point;
      onMove(point);
    },
    [onMove],
  );

  return (
    <section className="sl-shell" aria-label="Live Spotlight Sync task">
      <header className="sl-topbar">
        <div>
          <p className="sl-kicker">Collaborative activity</p>
          <h2 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Spotlight Sync
          </h2>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/75">
          {task.status === "idle"
            ? "Waiting"
            : task.status === "completed"
              ? "Complete"
              : `Round ${task.currentRoundIndex + 1} / ${task.roundCount}`}
        </span>
      </header>

      <div className="sl-live-instruction" aria-live="polite">
        {task.status === "active" && round?.clue ? (
          <>
            <div className={`sl-clue ${viewer === "P01" ? "is-you" : "is-partner"}`}>
              <span>Your private clue · {round.clue.shortLabel}</span>
              <strong>{round.clue.label}</strong>
            </div>
            <p>
              Say it out loud — your partner knows{" "}
              <strong>{round.clue.kind === "object" ? "where" : "what"}</strong>. Hold your
              spotlights together on the object you agree on until the ring fills.
            </p>
          </>
        ) : (
          <p>
            {task.status === "completed"
              ? `${task.stats.hits} of ${task.roundCount} shared targets found.`
              : "The researcher will start the task when both participants are ready."}
          </p>
        )}
      </div>

      <div className="sl-stage-wrap">
        <MemoStage
          ref={stageRef}
          contextMode={task.contextMode}
          interactive={playing}
          foundIds={foundIds}
          selfParticipant={viewer}
          selfClue={playing && round?.clue ? spokenSelfClue(round.clue) : null}
          onMove={handleMove}
          onSnap={handleSnap}
          ariaLabel="Search scene. Move your spotlight with the pointer, or tab through the objects."
        />

        {task.status === "active" && (
          <div className="sl-readout" aria-hidden="true">
            <div className={`sl-meter ${sharedObjectId ? "is-overlapping" : ""}`}>
              <i style={{ transform: `scaleX(${sharedObjectId ? 1 : 0.12})` }} />
            </div>
            <span>
              {ownSelection
                ? `Committed · waiting for ${partner}`
                : sharedObjectId
                  ? "Both lights on the same object"
                  : "Find each other"}
            </span>
          </div>
        )}

        {task.status === "idle" && (
          <div className="sl-overlay">
            <span className="sl-dyad-mark" aria-hidden="true"><i /><i /></span>
            <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">
              Waiting for the researcher
            </h3>
            <p className="mt-2 max-w-sm text-sm text-white/65">
              Keep talking — your first private clue will appear here.
            </p>
          </div>
        )}

        {task.phase === "feedback" && task.lastOutcome && (
          <div className={`sl-toast ${task.lastOutcome.success ? "is-success" : "is-miss"}`} role="status">
            <strong>
              {task.lastOutcome.success
                ? task.feedbackMode === "warm"
                  ? "You found it together"
                  : "Target found"
                : "Focus did not match"}
            </strong>
            <small>{task.lastOutcome.convergenceMs} ms to first overlap</small>
          </div>
        )}

        {task.status === "completed" && (
          <div className="sl-overlay">
            <span className="sl-complete-mark" aria-hidden="true">✦</span>
            <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">
              Shared search complete
            </h3>
            <p className="mt-2 text-sm text-white/65">
              {task.stats.hits} hits · {task.stats.misses} misses
            </p>
          </div>
        )}
      </div>

      <footer className="sl-footer">
        <div className="flex flex-wrap gap-x-7 gap-y-2 text-xs text-white/60">
          <span><strong className="text-white">{task.stats.hits}</strong> shared finds</span>
          <span><strong className="text-white">{task.stats.bestStreak}</strong> best streak</span>
          <span>
            <strong className="text-white">
              {task.stats.convergenceSamples
                ? Math.round(task.stats.convergenceTotalMs / task.stats.convergenceSamples)
                : "—"}
            </strong>{" "}
            mean convergence
          </span>
        </div>
        {ownSelection && task.phase === "playing" && (
          <p className="text-xs font-semibold text-white/70">
            Focus locked on {getSpotlightObject(ownSelection)?.label ?? ownSelection}. Waiting for{" "}
            {partner}
            {partnerSelection ? " to resolve" : "…"}
          </p>
        )}
      </footer>
    </section>
  );
}

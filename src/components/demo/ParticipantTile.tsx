"use client";

import { useEffect, useRef } from "react";
import type { ParticipantState, ParticipantId } from "@/lib/demo/types";

const TINTS: Record<ParticipantId, string> = { P01: "#7a0f8c", P02: "#d31c77" };

const CONDITION_LABEL: Record<ParticipantState["videoCondition"], string> = {
  normal: "Live",
  disabled: "Video disabled",
  blurred: "Blur enabled",
  grayscale: "Grayscale enabled",
  reducedFrameRate: "~6 fps",
};

export function ParticipantTile({
  id,
  state,
  stream,
  isSelfView = false,
}: {
  id: ParticipantId;
  state: ParticipantState;
  stream?: MediaStream | null;
  isSelfView?: boolean;
}) {
  const { videoCondition, selfViewHidden, connected } = state;
  const videoRef = useRef<HTMLVideoElement>(null);
  const filter =
    videoCondition === "blurred"
      ? "blur(6px)"
      : videoCondition === "grayscale"
        ? "grayscale(1)"
        : undefined;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream ?? null;
    }
  }, [stream]);

  const hideLiveSelfView = Boolean(stream && isSelfView && selfViewHidden);

  return (
    <div className="relative flex aspect-video flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl bg-ink">
      {hideLiveSelfView ? (
        <div className="flex flex-col items-center gap-2 text-white/70">
          <span className="text-xs font-medium">Self-view hidden</span>
          <span className="text-[10px] text-white/45">Your camera is still shared</span>
        </div>
      ) : videoCondition === "disabled" ? (
        <div className="flex flex-col items-center gap-2 text-white/70">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2l20 20M16 16.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7c0-.5.2-1 .5-1.3M9 5h5a2 2 0 0 1 2 2v3.5l4-3v9l-2.5-1.9" />
          </svg>
          <span className="text-xs font-medium">Video disabled</span>
        </div>
      ) : stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelfView}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full text-sm font-semibold text-white transition-[filter] duration-200 ${
            videoCondition === "reducedFrameRate" ? "" : "animate-breathe"
          }`}
          style={{ background: TINTS[id], filter }}
        >
          {id}
        </div>
      )}

      {!connected && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/80 text-xs font-medium text-white/80">
          Connecting…
        </div>
      )}

      {!stream && connected && !selfViewHidden && videoCondition !== "disabled" && (
        <div
          className="absolute bottom-2 right-2 h-8 w-11 rounded border border-white/20"
          style={{ background: TINTS[id], filter, opacity: 0.85 }}
        />
      )}

      <div className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
        {id}
      </div>
      {videoCondition !== "normal" && (
        <div className="absolute right-2 top-2 rounded bg-accent/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {CONDITION_LABEL[videoCondition]}
        </div>
      )}
      {selfViewHidden && connected && (
        <div className="absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-medium text-white/70">
          self-view hidden
        </div>
      )}
    </div>
  );
}

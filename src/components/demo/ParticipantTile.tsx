import type { ParticipantState, ParticipantId } from "@/lib/demo/types";

const TINTS: Record<ParticipantId, string> = { P01: "#1f6f78", P02: "#3b5b8c" };

const CONDITION_LABEL: Record<ParticipantState["videoCondition"], string> = {
  normal: "Live",
  disabled: "Video disabled",
  blurred: "Blur enabled",
  grayscale: "Grayscale enabled",
  reducedFrameRate: "~6 fps",
};

export function ParticipantTile({ id, state }: { id: ParticipantId; state: ParticipantState }) {
  const { videoCondition, selfViewHidden, connected } = state;
  const filter =
    videoCondition === "blurred"
      ? "blur(6px)"
      : videoCondition === "grayscale"
        ? "grayscale(1)"
        : undefined;

  return (
    <div className="relative flex aspect-video flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-ink">
      {videoCondition === "disabled" ? (
        <div className="flex flex-col items-center gap-2 text-white/70">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2l20 20M16 16.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7c0-.5.2-1 .5-1.3M9 5h5a2 2 0 0 1 2 2v3.5l4-3v9l-2.5-1.9" />
          </svg>
          <span className="text-xs font-medium">Video disabled</span>
        </div>
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

      {connected && !selfViewHidden && videoCondition !== "disabled" && (
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

import type { DemoAction } from "@/lib/demo/reducer";
import type { DemoState, ParticipantId, VideoCondition } from "@/lib/demo/types";
import { Button } from "@/components/ui/Button";

const CONDITIONS: { value: VideoCondition; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "disabled", label: "Disable Video" },
  { value: "blurred", label: "Blur" },
  { value: "grayscale", label: "Grayscale" },
  { value: "reducedFrameRate", label: "Reduce Frame Rate" },
];

function ParticipantControls({
  id,
  state,
  dispatch,
}: {
  id: ParticipantId;
  state: DemoState["participants"][ParticipantId];
  dispatch: React.Dispatch<DemoAction>;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{id} video</p>
      <div className="flex flex-wrap gap-1.5">
        {CONDITIONS.map((c) => (
          <Button
            key={c.value}
            size="sm"
            variant={c.value === "disabled" && state.videoCondition === "disabled" ? "warn" : "secondary"}
            active={state.videoCondition === c.value}
            onClick={() => dispatch({ type: "SET_VIDEO_CONDITION", participant: id, condition: c.value })}
          >
            {c.label}
          </Button>
        ))}
        <Button
          size="sm"
          active={state.selfViewHidden}
          onClick={() => dispatch({ type: "TOGGLE_SELF_VIEW", participant: id })}
        >
          {state.selfViewHidden ? "Show Self-View" : "Hide Self-View"}
        </Button>
      </div>
    </div>
  );
}

export function ControlPanel({ state, dispatch }: { state: DemoState; dispatch: React.Dispatch<DemoAction> }) {
  return (
    <div className="card-surface flex flex-col gap-5 p-5">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Collaborative task
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="primary"
            disabled={state.task.status === "active"}
            onClick={() => dispatch({ type: "START_TASK" })}
          >
            Start Task
          </Button>
          <Button
            size="sm"
            disabled={state.task.status !== "active"}
            onClick={() => dispatch({ type: "STOP_TASK" })}
          >
            Stop Task
          </Button>
        </div>
      </div>

      <ParticipantControls id="P01" state={state.participants.P01} dispatch={dispatch} />
      <ParticipantControls id="P02" state={state.participants.P02} dispatch={dispatch} />

      <div className="border-t border-border pt-4">
        <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "RESET" })}>
          ↺ Reset Demo
        </Button>
      </div>
    </div>
  );
}

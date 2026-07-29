import type { DemoAction } from "@/lib/demo/reducer";
import type { DemoState } from "@/lib/demo/types";
import { CardIcon } from "./CardIcon";

function Hand({
  participant,
  state,
  agreedCardIds,
  interactive,
  dispatch,
}: {
  participant: "P01" | "P02";
  state: DemoState["participants"]["P01"];
  agreedCardIds: string[];
  interactive: boolean;
  dispatch?: React.Dispatch<DemoAction>;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {participant} hand {!interactive && <span className="normal-case font-normal">(auto-playing partner)</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {state.hand.map((card) => {
          const selected = state.selectedCardIds.includes(card.id);
          const agreed = agreedCardIds.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              disabled={!interactive}
              onClick={() => dispatch?.({ type: "TOGGLE_CARD", participant, cardId: card.id })}
              className={`flex h-11 w-11 items-center justify-center rounded-md border transition-colors ${
                agreed
                  ? "border-accent bg-accent-soft"
                  : selected
                    ? "border-accent-strong bg-white ring-1 ring-accent"
                    : "border-border bg-white"
              } ${interactive ? "cursor-pointer hover:border-accent" : "cursor-default opacity-80"}`}
              title={card.id}
            >
              <CardIcon card={card} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CardTask({ state, dispatch }: { state: DemoState; dispatch: React.Dispatch<DemoAction> }) {
  const { task } = state;
  return (
    <div className="card-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Common-ground card task
        </p>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            task.status === "completed"
              ? "bg-accent-soft text-accent-strong"
              : task.status === "active"
                ? "bg-accent text-white"
                : "bg-black/[0.04] text-ink-muted"
          }`}
        >
          {task.status === "idle" && "Not started"}
          {task.status === "active" && `${task.agreedCardIds.length} / ${task.sharedCardIds.length} agreed`}
          {task.status === "completed" &&
            `Completed · ${Math.round((task.correctness ?? 0) * 100)}% correct`}
        </span>
      </div>

      {task.status === "idle" ? (
        <p className="text-sm text-ink-muted">
          Click <strong>Start Task</strong> in the control panel. Each participant receives a partially
          overlapping hand of abstract cards and must identify the {task.sharedCardIds.length} they share.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <Hand
            participant="P01"
            state={state.participants.P01}
            agreedCardIds={task.agreedCardIds}
            interactive={task.status === "active"}
            dispatch={dispatch}
          />
          <Hand
            participant="P02"
            state={state.participants.P02}
            agreedCardIds={task.agreedCardIds}
            interactive={false}
          />
        </div>
      )}
    </div>
  );
}

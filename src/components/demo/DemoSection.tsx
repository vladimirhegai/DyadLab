"use client";

import { useEffect, useReducer } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { createInitialState, demoReducer } from "@/lib/demo/reducer";
import { ParticipantTile } from "./ParticipantTile";
import { ControlPanel } from "./ControlPanel";
import { CardTask } from "./CardTask";
import { EventTimeline } from "./EventTimeline";

const P02_AUTO_DELAYS = [1800, 3200, 4600, 6000];

export function DemoSection() {
  const [state, dispatch] = useReducer(demoReducer, undefined, createInitialState);

  // Simulate the two participants joining shortly after the demo mounts.
  useEffect(() => {
    const t1 = setTimeout(() => dispatch({ type: "JOIN", participant: "P01" }), 700);
    const t2 = setTimeout(() => dispatch({ type: "JOIN", participant: "P02" }), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Simulate participant P02 independently converging on the shared cards
  // once the task is running, so the demo resolves without needing a second person.
  useEffect(() => {
    if (state.task.status !== "active" || !state.task.startedAt) return;
    const timers = state.task.sharedCardIds.map((cardId, i) =>
      setTimeout(() => {
        dispatch({ type: "TOGGLE_CARD", participant: "P02", cardId });
      }, P02_AUTO_DELAYS[i] ?? 1800 + i * 1400),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.task.startedAt, state.task.status]);

  return (
    <section id="demo" className="border-b border-border py-20 md:py-28">
      <div className="section-shell">
        <SectionHeading
          eyebrow="Interactive demo"
          title="Try changing the video conditions below"
          description="Every action is recorded in the session timeline, exactly as it would be for a real session. No camera access required — both participants are simulated."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-5">
            <div className="flex gap-4">
              <ParticipantTile id="P01" state={state.participants.P01} />
              <ParticipantTile id="P02" state={state.participants.P02} />
            </div>
            <CardTask state={state} dispatch={dispatch} />
            <EventTimeline events={state.events} />
          </div>
          <ControlPanel state={state} dispatch={dispatch} />
        </div>
      </div>
    </section>
  );
}

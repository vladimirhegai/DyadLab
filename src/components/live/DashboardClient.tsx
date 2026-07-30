"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { OperateHeader } from "@/components/nav/OperateHeader";
import { EventTimeline } from "@/components/demo/EventTimeline";
import { VIDEO_CONDITIONS } from "@/lib/demo/video-conditions";
import { SpotlightResearchMonitor } from "@/components/spotlight/SpotlightResearchMonitor";
import type { DemoEvent, ParticipantId, VideoCondition } from "@/lib/demo/types";
import {
  DEFAULT_SPOTLIGHT_POSITIONS,
  type SpotlightContextMode,
  type SpotlightFeedbackMode,
  type SpotlightPositions,
} from "@/lib/spotlight-sync/types";
import { getBackendUrl, getWebSocketUrl } from "@/lib/live/config";
import {
  EMPTY_CONDITIONS,
  EMPTY_PRESENCE,
  EMPTY_SPOTLIGHT_LIVE_TASK,
  type ConditionState,
  type CreatedSession,
  type LiveSpotlightTaskState,
  type PresenceState,
  type ServerMessage,
  type SessionSnapshot,
} from "@/lib/live/types";

const PARTICIPANTS: ParticipantId[] = ["P01", "P02"];

function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        connected ? "bg-accent-soft text-accent-strong" : "bg-bg-soft text-ink-muted"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-accent" : "bg-ink-muted/40"}`} />
      {connected ? "Connected" : "Waiting"}
    </span>
  );
}

function CopyableLink({
  participant,
  url,
}: {
  participant: ParticipantId;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[64px_1fr_auto] sm:items-center">
      <span className="text-xs font-semibold text-ink">{participant}</span>
      <input
        data-testid={`${participant.toLowerCase()}-link`}
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        aria-label={`${participant} participant link`}
        className="min-w-0 rounded-xl bg-bg-soft px-3 py-2 font-mono text-xs text-ink"
      />
      <Button size="sm" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}

function ParticipantControls({
  participant,
  state,
  connected,
  onCondition,
  onSelfView,
}: {
  participant: ParticipantId;
  state: ConditionState[ParticipantId];
  connected: boolean;
  onCondition: (participant: ParticipantId, condition: VideoCondition) => void;
  onSelfView: (participant: ParticipantId, hidden: boolean) => void;
}) {
  return (
    <div className="rounded-2xl bg-bg-soft p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{participant}</p>
          <p className="text-xs text-ink-muted">Video and self-view conditions</p>
        </div>
        <ConnectionPill connected={connected} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {VIDEO_CONDITIONS.map((condition) => (
          <Button
            key={condition.value}
            size="sm"
            variant={
              condition.value === "disabled" && state.videoCondition === "disabled"
                ? "warn"
                : "secondary"
            }
            active={state.videoCondition === condition.value}
            disabled={!connected}
            data-testid={`${participant.toLowerCase()}-${condition.value}`}
            onClick={() => onCondition(participant, condition.value)}
          >
            {condition.label}
          </Button>
        ))}
        <Button
          size="sm"
          active={state.selfViewHidden}
          disabled={!connected}
          onClick={() => onSelfView(participant, !state.selfViewHidden)}
        >
          {state.selfViewHidden ? "Show Self-View" : "Hide Self-View"}
        </Button>
      </div>
    </div>
  );
}

export function DashboardClient({ initialCode }: { initialCode?: string }) {
  const backendUrl = getBackendUrl();
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? "");
  const [presence, setPresence] = useState<PresenceState>(EMPTY_PRESENCE);
  const [conditions, setConditions] = useState<ConditionState>(EMPTY_CONDITIONS);
  const [spotlightTask, setSpotlightTask] = useState<LiveSpotlightTaskState>(EMPTY_SPOTLIGHT_LIVE_TASK);
  const [spotlightPositions, setSpotlightPositions] =
    useState<SpotlightPositions>(DEFAULT_SPOTLIGHT_POSITIONS);
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );
  const links = useMemo(
    () =>
      code && origin
        ? {
            P01: `${origin}/session?code=${code}&participant=P01`,
            P02: `${origin}/session?code=${code}&participant=P02`,
          }
        : null,
    [code, origin],
  );

  useEffect(() => {
    if (!code) return;
    let disposed = false;
    let reconnectTimer: number | undefined;

    const loadSession = async () => {
      try {
        const [sessionResponse, eventResponse] = await Promise.all([
          fetch(`${backendUrl}/sessions/${code}`),
          fetch(`${backendUrl}/sessions/${code}/events`),
        ]);
        if (!sessionResponse.ok || !eventResponse.ok) {
          throw new Error("This session could not be found.");
        }
        const snapshot = (await sessionResponse.json()) as SessionSnapshot;
        const persistedEvents = (await eventResponse.json()) as DemoEvent[];
        if (disposed) return;
        setPresence(snapshot.presence);
        setConditions(snapshot.conditions);
        setSpotlightTask(snapshot.spotlightTask ?? EMPTY_SPOTLIGHT_LIVE_TASK);
        setSpotlightPositions(snapshot.spotlightPositions ?? DEFAULT_SPOTLIGHT_POSITIONS);
        setEvents(persistedEvents);
        setError("");
      } catch (sessionError) {
        if (!disposed) {
          setError(sessionError instanceof Error ? sessionError.message : "Could not load the session.");
        }
      }
    };

    const connect = () => {
      const socket = new WebSocket(`${getWebSocketUrl()}/ws/${code}?role=researcher`);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === "welcome") {
          setPresence(message.presence);
          setConditions(message.conditions);
          setSpotlightTask(message.spotlightTask ?? EMPTY_SPOTLIGHT_LIVE_TASK);
          setSpotlightPositions(message.spotlightPositions ?? DEFAULT_SPOTLIGHT_POSITIONS);
        } else if (message.type === "presence") {
          setPresence(message.presence);
        } else if (message.type === "condition_state") {
          setConditions(message.conditions);
        } else if (message.type === "spotlight_task_state") {
          setSpotlightTask(message.task);
        } else if (message.type === "spotlight_position") {
          setSpotlightPositions((current) => ({
            ...current,
            [message.participant]: message.point,
          }));
        } else if (message.type === "event") {
          setEvents((current) =>
            current.some((item) => item.id === message.event.id)
              ? current
              : [...current, message.event],
          );
        } else if (message.type === "error") {
          setError(message.message);
        }
      };

      socket.onopen = () => setError("");
      socket.onclose = () => {
        if (!disposed) {
          reconnectTimer = window.setTimeout(connect, 1500);
        }
      };
      socket.onerror = () => setError("The live session service is unavailable.");
    };

    void loadSession();
    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [backendUrl, code]);

  const createSession = async () => {
    setCreating(true);
    setError("");
    try {
      const response = await fetch(`${backendUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ join_base_url: window.location.origin }),
      });
      if (!response.ok) throw new Error("Could not create a session.");
      const session = (await response.json()) as CreatedSession;
      setCode(session.code);
      setEvents([]);
      setPresence(EMPTY_PRESENCE);
      setConditions(EMPTY_CONDITIONS);
      setSpotlightTask(EMPTY_SPOTLIGHT_LIVE_TASK);
      setSpotlightPositions(DEFAULT_SPOTLIGHT_POSITIONS);
      window.history.replaceState({}, "", `/dashboard?code=${session.code}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not reach the live session service.",
      );
    } finally {
      setCreating(false);
    }
  };

  const send = (message: object) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setError("The live control channel is reconnecting. Try again in a moment.");
      return;
    }
    socketRef.current.send(JSON.stringify(message));
  };

  const setCondition = (participant: ParticipantId, condition: VideoCondition) => {
    send({ type: "set_condition", participant, condition });
  };

  const setSelfView = (participant: ParticipantId, hidden: boolean) => {
    send({ type: "set_self_view", participant, hidden });
  };

  return (
    <>
      <OperateHeader label="Researcher workspace" />
      <main className="flex-1 py-10 md:py-14">
      <div className="section-shell">
        <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-7">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-magenta">
              Researcher workspace
            </p>
            <h1 className="font-display mt-2 text-[30px] font-medium tracking-tight text-ink">
              Live session dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Create a session, share one private link with each participant, then control video
              conditions and monitor the task in real time.
            </p>
          </div>
          {code && (
            <div className="rounded-2xl bg-bg-soft px-4 py-3 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Session code</p>
              <p className="font-mono text-xl font-semibold tracking-[0.18em] text-ink">{code}</p>
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-lg border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn">
            {error}
          </div>
        )}

        {!code ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="card-surface p-6 md:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">New study session</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">Generate two participant links</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Each link assigns a pseudonymous participant ID. No account or participant name is required.
            </p>
            <Button
              className="mt-6"
              variant="primary"
              disabled={creating}
              data-testid="create-session"
              onClick={createSession}
            >
              {creating ? "Creating…" : "Create Session"}
            </Button>
          </section>
          <aside className="card-surface p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">What happens next</p>
            <ol className="mt-4 grid gap-4">
              {[
                "Two private links are generated — one per participant.",
                "Each participant joins with their own camera and microphone.",
                "You control video conditions and watch the task live.",
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-[12px] font-semibold text-accent-strong">
                    {i + 1}
                  </span>
                  <span className="text-[13.5px] leading-relaxed text-ink-muted">{step}</span>
                </li>
              ))}
            </ol>
          </aside>
          </div>
        ) : (
          <div className="mt-8 grid gap-6">
            <section className="card-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    Participant access
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">Share each link with exactly one participant.</p>
                </div>
                <Button size="sm" variant="ghost" onClick={createSession} disabled={creating}>
                  New session
                </Button>
              </div>
              {links && (
                <div className="mt-4 grid gap-3">
                  <CopyableLink participant="P01" url={links.P01} />
                  <CopyableLink participant="P02" url={links.P02} />
                </div>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_310px]">
              <div className="grid gap-6">
                <section className="card-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                        Spotlight Sync
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {spotlightTask.status === "idle" &&
                          `${spotlightTask.roundCount} rounds of cooperative visual search.`}
                        {spotlightTask.status === "active" &&
                          `Round ${spotlightTask.currentRoundIndex + 1} of ${spotlightTask.roundCount} · ${spotlightTask.stats.hits} shared finds.`}
                        {spotlightTask.status === "completed" &&
                          `${spotlightTask.stats.hits} of ${spotlightTask.roundCount} shared targets found.`}
                      </p>
                    </div>
                    <span
                      data-testid="spotlight-task-status"
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        spotlightTask.status === "completed"
                          ? "bg-accent-soft text-accent-strong"
                          : spotlightTask.status === "active"
                            ? "bg-accent text-white"
                            : "bg-black/[0.04] text-ink-muted"
                      }`}
                    >
                      {spotlightTask.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={spotlightTask.status === "active"}
                      data-testid="start-spotlight-task"
                      onClick={() => send({ type: "spotlight_task_control", action: "start" })}
                    >
                      Start Spotlight Sync
                    </Button>
                    <Button
                      size="sm"
                      disabled={spotlightTask.status !== "active"}
                      onClick={() => send({ type: "spotlight_task_control", action: "stop" })}
                    >
                      Stop
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                    <fieldset>
                      <legend className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                        Scene context
                      </legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(["rich", "reduced"] as SpotlightContextMode[]).map((mode) => (
                          <Button
                            key={mode}
                            size="sm"
                            active={spotlightTask.contextMode === mode}
                            aria-pressed={spotlightTask.contextMode === mode}
                            onClick={() => send({ type: "set_spotlight_context", mode })}
                          >
                            {mode === "rich" ? "Rich scene" : "Reduced"}
                          </Button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                        Outcome feedback
                      </legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(["warm", "neutral"] as SpotlightFeedbackMode[]).map((mode) => (
                          <Button
                            key={mode}
                            size="sm"
                            active={spotlightTask.feedbackMode === mode}
                            aria-pressed={spotlightTask.feedbackMode === mode}
                            onClick={() => send({ type: "set_spotlight_feedback", mode })}
                          >
                            {mode === "warm" ? "Warm" : "Neutral"}
                          </Button>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                </section>

                <SpotlightResearchMonitor task={spotlightTask} positions={spotlightPositions} />

                <EventTimeline
                  events={events}
                  exportPrefix={`dyadlab-${code}-live-events`}
                  emptyMessage="Waiting for live session events…"
                />

                <section className="card-surface flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      Server-backed data
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Download the complete persisted event log, including events from before a reconnect.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ButtonLink
                      size="sm"
                      variant="secondary"
                      href={`${backendUrl}/sessions/${code}/events.csv`}
                    >
                      Download CSV
                    </ButtonLink>
                    <ButtonLink
                      size="sm"
                      variant="secondary"
                      href={`${backendUrl}/sessions/${code}/events.json`}
                    >
                      Download JSON
                    </ButtonLink>
                  </div>
                </section>
              </div>

              <aside className="card-surface h-fit p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Live conditions
                </p>
                <div className="mt-4 grid gap-3">
                  {PARTICIPANTS.map((participant) => (
                    <ParticipantControls
                      key={participant}
                      participant={participant}
                      state={conditions[participant]}
                      connected={presence[participant]}
                      onCondition={setCondition}
                      onSelfView={setSelfView}
                    />
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-ink-muted">
                  Blur, grayscale, and frame-rate conditions are applied on the participant&apos;s device before
                  the video track is sent to their peer.
                </p>
              </aside>
            </div>
          </div>
        )}
      </div>
      </main>
    </>
  );
}

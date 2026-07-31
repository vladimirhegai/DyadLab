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
import {
  getBackendUrl,
  getIceServers,
  getWebSocketUrl,
  sessionApiUrl,
} from "@/lib/live/config";
import {
  EMPTY_CONDITIONS,
  EMPTY_MEDIA_STATE,
  EMPTY_PRESENCE,
  EMPTY_SPOTLIGHT_LIVE_TASK,
  type ConditionState,
  type CreatedSession,
  type LiveSpotlightTaskState,
  type MediaState,
  type ParticipantMedia,
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

function MediaAvailability({
  media,
}: {
  media: ParticipantMedia;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          media.camera ? "bg-accent-soft text-accent-strong" : "bg-black/[0.05] text-ink-muted"
        }`}
      >
        Camera {media.camera ? "on" : "off"}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          media.microphone ? "bg-accent-soft text-accent-strong" : "bg-black/[0.05] text-ink-muted"
        }`}
      >
        Mic {media.microphone ? "on" : "off"}
      </span>
    </div>
  );
}

function ResearcherMediaTile({
  participant,
  connected,
  media,
  stream,
  condition,
}: {
  participant: ParticipantId;
  connected: boolean;
  media: ParticipantMedia;
  stream: MediaStream | null;
  condition: VideoCondition;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideoTrack = Boolean(stream?.getVideoTracks().length);
  const hasAudioTrack = Boolean(stream?.getAudioTracks().length);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div data-testid={`${participant.toLowerCase()}-researcher-feed`} className="overflow-hidden rounded-xl bg-ink">
      <div className="relative flex aspect-video items-center justify-center">
        {stream && (hasVideoTrack || hasAudioTrack) && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={
              hasVideoTrack && media.camera && condition !== "disabled"
                ? "absolute inset-0 h-full w-full object-cover"
                : "absolute h-px w-px opacity-0"
            }
          />
        )}
        {!connected ? (
          <div className="grid justify-items-center gap-2 text-white/65">
            <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
            <span className="text-xs font-medium">Waiting for {participant}</span>
          </div>
        ) : !media.camera || condition === "disabled" ? (
          <div className="grid justify-items-center gap-2 px-4 text-center text-white/70">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-sm font-semibold">
              {participant}
            </span>
            <span className="text-xs font-medium">
              {condition === "disabled"
                ? "Video disabled by researcher"
                : media.microphone
                  ? "Joined with audio only"
                  : "Joined without camera"}
            </span>
          </div>
        ) : !stream ? (
          <div className="grid justify-items-center gap-2 text-white/65">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-magenta" />
            <span className="text-xs font-medium">Connecting preview…</span>
          </div>
        ) : null}
        <div className="absolute left-2.5 top-2.5 rounded-md bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
          {participant}
        </div>
        {condition !== "normal" && (
          <div className="absolute right-2.5 top-2.5 rounded-md bg-accent/90 px-2 py-1 text-[10px] font-semibold text-white">
            {VIDEO_CONDITIONS.find((item) => item.value === condition)?.label}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1b1024] px-3 py-2">
        <ConnectionPill connected={connected} />
        <MediaAvailability media={media} />
      </div>
    </div>
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
  media,
  onCondition,
  onSelfView,
}: {
  participant: ParticipantId;
  state: ConditionState[ParticipantId];
  connected: boolean;
  media: ParticipantMedia;
  onCondition: (participant: ParticipantId, condition: VideoCondition) => void;
  onSelfView: (participant: ParticipantId, hidden: boolean) => void;
}) {
  return (
    <div className="rounded-xl bg-bg-soft p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{participant}</p>
          <p className="text-xs text-ink-muted">
            {media.camera ? "Video condition" : "No camera available"}
          </p>
        </div>
        <ConnectionPill connected={connected} />
      </div>
      <div className="grid gap-2">
        <label className="grid gap-1 text-[11px] font-semibold text-ink-muted">
          Outgoing video
          <select
            value={state.videoCondition}
            disabled={!connected || !media.camera}
            data-testid={`${participant.toLowerCase()}-condition-select`}
            onChange={(event) =>
              onCondition(participant, event.target.value as VideoCondition)
            }
            className="min-h-10 rounded-lg bg-surface px-3 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {VIDEO_CONDITIONS.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          size="sm"
          variant="ghost"
          active={state.selfViewHidden}
          disabled={!connected || !media.camera}
          onClick={() => onSelfView(participant, !state.selfViewHidden)}
        >
          {state.selfViewHidden ? "Show Self-View" : "Hide Self-View"}
        </Button>
      </div>
    </div>
  );
}

export function DashboardClient({
  initialCode,
  initialToken,
}: {
  initialCode?: string;
  initialToken?: string;
}) {
  const backendUrl = getBackendUrl();
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? "");
  const [researcherToken, setResearcherToken] = useState(initialToken ?? "");
  const [links, setLinks] = useState<Record<ParticipantId, string> | null>(null);
  const [presence, setPresence] = useState<PresenceState>(EMPTY_PRESENCE);
  const [conditions, setConditions] = useState<ConditionState>(EMPTY_CONDITIONS);
  const [mediaState, setMediaState] = useState<MediaState>(EMPTY_MEDIA_STATE);
  const [monitorStreams, setMonitorStreams] = useState<
    Record<ParticipantId, MediaStream | null>
  >({ P01: null, P02: null });
  const [spotlightTask, setSpotlightTask] = useState<LiveSpotlightTaskState>(EMPTY_SPOTLIGHT_LIVE_TASK);
  const [spotlightPositions, setSpotlightPositions] =
    useState<SpotlightPositions>(DEFAULT_SPOTLIGHT_POSITIONS);
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [error, setError] = useState(
    initialCode && !initialToken
      ? "This dashboard link is missing its researcher credential. Create a new session from this page."
      : "",
  );
  const [creating, setCreating] = useState(false);
  const [creatingMessage, setCreatingMessage] = useState("Creating…");
  const socketRef = useRef<WebSocket | null>(null);
  const monitorPeersRef = useRef<Record<ParticipantId, RTCPeerConnection | null>>({
    P01: null,
    P02: null,
  });
  const monitorCandidatesRef = useRef<Record<ParticipantId, RTCIceCandidateInit[]>>({
    P01: [],
    P02: [],
  });
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );
  const iceServers = useMemo(() => getIceServers(), []);

  useEffect(() => {
    if (!code || links) return;
    const stored = window.sessionStorage.getItem(
      `dyadlab:${code}:participant-links`,
    );
    if (!stored) return;
    try {
      const storedLinks = JSON.parse(stored) as Record<ParticipantId, string>;
      queueMicrotask(() => setLinks(storedLinks));
    } catch {
      window.sessionStorage.removeItem(`dyadlab:${code}:participant-links`);
    }
  }, [code, links]);

  useEffect(() => {
    if (!code || !researcherToken) return;
    let disposed = false;
    let reconnectTimer: number | undefined;
    let reconnectAttempt = 0;
    const monitorPeers = monitorPeersRef.current;
    const monitorCandidates = monitorCandidatesRef.current;

    const loadSession = async () => {
      try {
        const [sessionResponse, eventResponse] = await Promise.all([
          fetch(sessionApiUrl(`sessions/${code}`, researcherToken)),
          fetch(sessionApiUrl(`sessions/${code}/events`, researcherToken)),
        ]);
        if (!sessionResponse.ok || !eventResponse.ok) {
          throw new Error("This session could not be found.");
        }
        const snapshot = (await sessionResponse.json()) as SessionSnapshot;
        const persistedEvents = (await eventResponse.json()) as DemoEvent[];
        if (disposed) return;
        setPresence(snapshot.presence);
        setConditions(snapshot.conditions);
        setMediaState(snapshot.mediaState ?? EMPTY_MEDIA_STATE);
        setSpotlightTask(snapshot.spotlightTask ?? EMPTY_SPOTLIGHT_LIVE_TASK);
        setSpotlightPositions(snapshot.spotlightPositions ?? DEFAULT_SPOTLIGHT_POSITIONS);
        setEvents(persistedEvents);
        setError("");
        return true;
      } catch (sessionError) {
        if (!disposed) {
          setError(sessionError instanceof Error ? sessionError.message : "Could not load the session.");
        }
        return false;
      }
    };

    const connect = () => {
      const socketUrl = new URL(`${getWebSocketUrl()}/ws/${code}`);
      socketUrl.searchParams.set("role", "researcher");
      socketUrl.searchParams.set("token", researcherToken);
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      const closeMonitor = (participant: ParticipantId) => {
        monitorPeersRef.current[participant]?.close();
        monitorPeersRef.current[participant] = null;
        monitorCandidatesRef.current[participant] = [];
        setMonitorStreams((current) => ({ ...current, [participant]: null }));
      };
      const requestMonitor = (participant: ParticipantId) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "request_monitor_stream", participant }));
        }
      };
      const handleMonitorSignal = async (
        participant: ParticipantId,
        payload: {
          description?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
        },
      ) => {
        let peer = monitorPeersRef.current[participant];
        if (payload.description?.type === "offer") {
          closeMonitor(participant);
          peer = new RTCPeerConnection({
            iceServers,
          });
          monitorPeersRef.current[participant] = peer;
          peer.ontrack = (trackEvent) => {
            const stream = trackEvent.streams[0];
            if (stream) {
              setMonitorStreams((current) => ({ ...current, [participant]: stream }));
            } else {
              setMonitorStreams((current) => {
                const next = current[participant] ?? new MediaStream();
                next.addTrack(trackEvent.track);
                return { ...current, [participant]: next };
              });
            }
          };
          peer.onicecandidate = (candidateEvent) => {
            if (candidateEvent.candidate && socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  type: "monitor_signal",
                  target: participant,
                  payload: { candidate: candidateEvent.candidate.toJSON() },
                }),
              );
            }
          };
          peer.onconnectionstatechange = () => {
            if (["failed", "closed"].includes(peer?.connectionState ?? "")) {
              closeMonitor(participant);
            }
          };
        }
        if (!peer) {
          if (payload.candidate) {
            monitorCandidatesRef.current[participant].push(payload.candidate);
          }
          return;
        }
        if (payload.description) {
          await peer.setRemoteDescription(payload.description);
          for (const candidate of monitorCandidatesRef.current[participant]) {
            await peer.addIceCandidate(candidate);
          }
          monitorCandidatesRef.current[participant] = [];
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          if (peer.localDescription && socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: "monitor_signal",
                target: participant,
                payload: { description: peer.localDescription.toJSON() },
              }),
            );
          }
        } else if (payload.candidate) {
          if (peer.remoteDescription) {
            await peer.addIceCandidate(payload.candidate);
          } else {
            monitorCandidatesRef.current[participant].push(payload.candidate);
          }
        }
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === "welcome") {
          setPresence(message.presence);
          setConditions(message.conditions);
          setMediaState(message.mediaState ?? EMPTY_MEDIA_STATE);
          setSpotlightTask(message.spotlightTask ?? EMPTY_SPOTLIGHT_LIVE_TASK);
          setSpotlightPositions(message.spotlightPositions ?? DEFAULT_SPOTLIGHT_POSITIONS);
          PARTICIPANTS.forEach((participant) => {
            if (
              message.presence[participant] &&
              (message.mediaState?.[participant].camera ||
                message.mediaState?.[participant].microphone)
            ) {
              requestMonitor(participant);
            }
          });
        } else if (message.type === "presence") {
          setPresence(message.presence);
          if (!message.connected) closeMonitor(message.participant);
        } else if (message.type === "condition_state") {
          setConditions(message.conditions);
        } else if (message.type === "media_state") {
          setMediaState(message.mediaState);
          if (message.camera || message.microphone) {
            requestMonitor(message.participant);
          } else {
            closeMonitor(message.participant);
          }
        } else if (message.type === "monitor_signal" && message.from !== "researcher") {
          void handleMonitorSignal(message.from, message.payload).catch(() => {
            closeMonitor(message.from as ParticipantId);
          });
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

      socket.onopen = () => {
        reconnectAttempt = 0;
        setError("");
      };
      socket.onclose = (event) => {
        if (!disposed) {
          if ([4403, 4404, 4410].includes(event.code)) {
            setError(
              event.code === 4410
                ? "This session has expired."
                : "The researcher credential is no longer valid.",
            );
            return;
          }
          const delay = Math.min(15_000, 1000 * 2 ** reconnectAttempt);
          reconnectAttempt += 1;
          setError(
            `The live control channel disconnected. Reconnecting in ${Math.round(delay / 1000)}s…`,
          );
          reconnectTimer = window.setTimeout(connect, delay);
        }
      };
      socket.onerror = () => setError("The live session service is unavailable.");
    };

    void loadSession().then((loaded) => {
      if (!disposed && loaded) connect();
    });

    return () => {
      disposed = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
      PARTICIPANTS.forEach((participant) => {
        monitorPeers[participant]?.close();
        monitorPeers[participant] = null;
        monitorCandidates[participant] = [];
      });
    };
  }, [backendUrl, code, iceServers, researcherToken]);

  const createSession = async () => {
    setCreating(true);
    setCreatingMessage("Creating…");
    setError("");
    const controller = new AbortController();
    const slowTimer = window.setTimeout(
      () =>
        setCreatingMessage(
          "Waking the secure session service… this can take up to 30 seconds.",
        ),
      5000,
    );
    const timeoutTimer = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(`${backendUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ join_base_url: origin || window.location.origin }),
        signal: controller.signal,
      });
      if (response.status === 429) {
        throw new Error(
          "Too many sessions were created recently. Wait one minute and try again.",
        );
      }
      if (!response.ok) {
        throw new Error("The secure session service could not create a session.");
      }
      const session = (await response.json()) as CreatedSession;
      setCode(session.code);
      setResearcherToken(session.researcher_token);
      setLinks(session.participant_urls);
      window.sessionStorage.setItem(
        `dyadlab:${session.code}:participant-links`,
        JSON.stringify(session.participant_urls),
      );
      setEvents([]);
      setPresence(EMPTY_PRESENCE);
      setConditions(EMPTY_CONDITIONS);
      setMediaState(EMPTY_MEDIA_STATE);
      setMonitorStreams({ P01: null, P02: null });
      setSpotlightTask(EMPTY_SPOTLIGHT_LIVE_TASK);
      setSpotlightPositions(DEFAULT_SPOTLIGHT_POSITIONS);
      window.history.replaceState(
        {},
        "",
        `/dashboard?code=${session.code}&token=${encodeURIComponent(session.researcher_token)}`,
      );
    } catch (createError) {
      setError(
        createError instanceof DOMException && createError.name === "AbortError"
          ? "The session service did not respond within 45 seconds. Please try again."
          : createError instanceof Error
            ? createError.message
            : "Could not reach the live session service.",
      );
    } finally {
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
      setCreating(false);
      setCreatingMessage("Creating…");
    }
  };

  const deleteSession = async () => {
    if (!code || !researcherToken) return;
    const confirmed = window.confirm(
      "Delete this session and all of its stored events? This cannot be undone.",
    );
    if (!confirmed) return;
    try {
      const response = await fetch(
        sessionApiUrl(`sessions/${code}`, researcherToken),
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("The session data could not be deleted.");
      }
      window.sessionStorage.removeItem(`dyadlab:${code}:participant-links`);
      setCode("");
      setResearcherToken("");
      setLinks(null);
      setEvents([]);
      setPresence(EMPTY_PRESENCE);
      window.history.replaceState({}, "", "/dashboard");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "The session data could not be deleted.",
      );
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
  const bothParticipantsConnected = PARTICIPANTS.every(
    (participant) => presence[participant],
  );

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

        {!code || !researcherToken ? (
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
            {creating && (
              <p role="status" className="mt-3 text-xs text-ink-muted">
                {creatingMessage}
              </p>
            )}
          </section>
          <aside className="card-surface p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">What happens next</p>
            <ol className="mt-4 grid gap-4">
              {[
                "Two private links are generated — one per participant.",
                "Camera and microphone are recommended, but participants may join without either.",
                "You monitor focus, media availability, and structured events live.",
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
          <div className="mt-6 grid gap-5">
            <section className="card-surface px-4 py-3 md:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-ink">Participant access</span>
                  <span className="text-xs text-ink-muted">
                    {bothParticipantsConnected
                      ? "Both participants are connected."
                      : "Share one private link with each participant."}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={createSession} disabled={creating}>
                    {creating ? "Creating…" : "New session"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void deleteSession()}>
                    Delete session data
                  </Button>
                </div>
              </div>
              {links && !bothParticipantsConnected && (
                <div className="mt-3 grid gap-2 border-t border-border pt-3">
                  <CopyableLink participant="P01" url={links.P01} />
                  <CopyableLink participant="P02" url={links.P02} />
                </div>
              )}
              {!links && !bothParticipantsConnected && (
                <p className="mt-3 border-t border-border pt-3 text-xs text-ink-muted">
                  Participant credentials are shown only in the browser that created
                  the session. Create a new session if those private links were lost.
                </p>
              )}
            </section>

            <section className="card-surface p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-ink">Spotlight Sync controls</h2>
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
                  <p className="mt-1 text-xs text-ink-muted">
                    {spotlightTask.status === "active"
                      ? `Round ${spotlightTask.currentRoundIndex + 1} of ${spotlightTask.roundCount} · ${spotlightTask.stats.hits} shared finds`
                      : bothParticipantsConnected
                        ? `${spotlightTask.roundCount} cooperative visual-search rounds ready`
                        : "Waiting for both participants before the task can begin"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={spotlightTask.status === "active" || !bothParticipantsConnected}
                    data-testid="start-spotlight-task"
                    onClick={() => send({ type: "spotlight_task_control", action: "start" })}
                  >
                    Start task
                  </Button>
                  <Button
                    size="sm"
                    disabled={spotlightTask.status !== "active"}
                    onClick={() => send({ type: "spotlight_task_control", action: "stop" })}
                  >
                    Stop
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <fieldset>
                  <legend className="text-[11px] font-semibold text-ink-muted">Scene context</legend>
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
                  <legend className="text-[11px] font-semibold text-ink-muted">Outcome feedback</legend>
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

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <SpotlightResearchMonitor task={spotlightTask} positions={spotlightPositions} />

              <aside className="grid gap-5">
                <section className="card-surface p-4">
                  <h2 className="text-sm font-semibold text-ink">Participant feeds</h2>
                  <p className="mt-1 text-xs text-ink-muted">
                    Live previews appear only when participants grant media access.
                  </p>
                  <div className="mt-4 grid gap-3">
                    {PARTICIPANTS.map((participant) => (
                      <ResearcherMediaTile
                        key={participant}
                        participant={participant}
                        connected={presence[participant]}
                        media={mediaState[participant]}
                        stream={monitorStreams[participant]}
                        condition={conditions[participant].videoCondition}
                      />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3">
                    {PARTICIPANTS.map((participant) => (
                      <ParticipantControls
                        key={participant}
                        participant={participant}
                        state={conditions[participant]}
                        connected={presence[participant]}
                        media={mediaState[participant]}
                        onCondition={setCondition}
                        onSelfView={setSelfView}
                      />
                    ))}
                  </div>
                </section>

                <EventTimeline
                  events={events}
                  exportPrefix={`dyadlab-${code}-live-events`}
                  emptyMessage="Waiting for participant and task events…"
                  bodyClassName="h-72"
                  compact
                />
              </aside>
            </div>

            <section className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-1 pt-4">
              <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
                Media is peer-to-peer and never recorded. The pseudonymous event log stores
                researcher conditions, 10 Hz focus-path samples, task outcomes, and exact
                millisecond timing. Sessions expire after 24 hours unless the server policy is changed.
              </p>
              <div className="flex gap-2">
                <ButtonLink
                  size="sm"
                  variant="secondary"
                  href={sessionApiUrl(
                    `sessions/${code}/events.csv`,
                    researcherToken,
                  )}
                >
                  Download CSV
                </ButtonLink>
                <ButtonLink
                  size="sm"
                  variant="secondary"
                  href={sessionApiUrl(
                    `sessions/${code}/events.json`,
                    researcherToken,
                  )}
                >
                  Download JSON
                </ButtonLink>
              </div>
            </section>
          </div>
        )}
      </div>
      </main>
    </>
  );
}

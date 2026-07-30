"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OperateHeader } from "@/components/nav/OperateHeader";
import { ParticipantTile } from "@/components/demo/ParticipantTile";
import { SpotlightLiveBoard } from "@/components/spotlight/SpotlightLiveBoard";
import type { ParticipantId, ParticipantState, VideoCondition } from "@/lib/demo/types";
import {
  DEFAULT_SPOTLIGHT_POSITIONS,
  type SpotlightPoint,
  type SpotlightPositions,
} from "@/lib/spotlight-sync/types";
import { getWebSocketUrl } from "@/lib/live/config";
import { createConditionedMedia, type ConditionedMedia } from "@/lib/live/media";
import {
  EMPTY_SPOTLIGHT_LIVE_TASK,
  type LiveSpotlightTaskState,
  type PresenceState,
  type ServerMessage,
} from "@/lib/live/types";

type Phase = "ready" | "requesting" | "connecting" | "connected" | "disconnected" | "error";

const CONDITION_LABEL: Record<VideoCondition, string> = {
  normal: "Normal video",
  disabled: "Video disabled",
  blurred: "Blur enabled",
  grayscale: "Grayscale enabled",
  reducedFrameRate: "Reduced to approximately 6 fps",
};

function participantState(
  connected: boolean,
  videoCondition: VideoCondition,
  selfViewHidden: boolean,
): ParticipantState {
  return {
    connected,
    videoCondition,
    selfViewHidden,
  };
}

export function SessionClient({
  initialCode,
  initialParticipant,
}: {
  initialCode?: string;
  initialParticipant?: ParticipantId;
}) {
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? "");
  const [participant, setParticipant] = useState<ParticipantId>(initialParticipant ?? "P01");
  const [phase, setPhase] = useState<Phase>("ready");
  const [error, setError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [presence, setPresence] = useState<PresenceState>({ P01: false, P02: false });
  const [condition, setCondition] = useState<VideoCondition>("normal");
  const [selfViewHidden, setSelfViewHidden] = useState(false);
  const [spotlightTask, setSpotlightTask] =
    useState<LiveSpotlightTaskState>(EMPTY_SPOTLIGHT_LIVE_TASK);
  const [spotlightPositions, setSpotlightPositions] =
    useState<SpotlightPositions>(DEFAULT_SPOTLIGHT_POSITIONS);
  const [processingSupported, setProcessingSupported] = useState(true);
  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const mediaRef = useRef<ConditionedMedia | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const leavingRef = useRef(false);
  const lastSpotlightSentRef = useRef(0);

  const peerParticipant: ParticipantId = participant === "P01" ? "P02" : "P01";

  const sendSignal = useCallback(
    (payload: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({ type: "signal", target: peerParticipant, payload }),
        );
      }
    },
    [peerParticipant],
  );

  const makeOffer = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer || peer.signalingState !== "stable") return;
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (peer.localDescription) {
        sendSignal({ description: peer.localDescription.toJSON() });
      }
    } catch (offerError) {
      setError(offerError instanceof Error ? offerError.message : "Could not start the peer connection.");
    }
  }, [sendSignal]);

  const handleSignal = useCallback(
    async (message: Extract<ServerMessage, { type: "signal" }>) => {
      const peer = peerRef.current;
      if (!peer) return;
      const { description, candidate } = message.payload;

      try {
        if (description) {
          await peer.setRemoteDescription(description);
          for (const pendingCandidate of pendingCandidatesRef.current) {
            await peer.addIceCandidate(pendingCandidate);
          }
          pendingCandidatesRef.current = [];

          if (description.type === "offer") {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            if (peer.localDescription) {
              sendSignal({ description: peer.localDescription.toJSON() });
            }
          }
        } else if (candidate) {
          if (peer.remoteDescription) {
            await peer.addIceCandidate(candidate);
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
        }
      } catch (signalError) {
        setError(signalError instanceof Error ? signalError.message : "WebRTC signaling failed.");
      }
    },
    [sendSignal],
  );

  const stopSession = useCallback(() => {
    leavingRef.current = true;
    socketRef.current?.close();
    peerRef.current?.close();
    mediaRef.current?.stop();
    socketRef.current = null;
    peerRef.current = null;
    mediaRef.current = null;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setPresence({ P01: false, P02: false });
    setSpotlightTask(EMPTY_SPOTLIGHT_LIVE_TASK);
    setSpotlightPositions(DEFAULT_SPOTLIGHT_POSITIONS);
    setPhase("disconnected");
  }, []);

  useEffect(() => stopSession, [stopSession]);

  const joinSession = async () => {
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError("Enter the six-character session code from your invitation.");
      return;
    }

    leavingRef.current = false;
    setError("");
    setPhase("requesting");

    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const media = await createConditionedMedia(rawStream);
      mediaRef.current = media;
      setLocalStream(media.stream);
      setProcessingSupported(media.processingSupported);

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = peer;
      media.stream.getTracks().forEach((track) => peer.addTrack(track, media.stream));
      peer.ontrack = (event) => {
        if (event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else {
          setRemoteStream((current) => {
            const next = current ?? new MediaStream();
            next.addTrack(event.track);
            return next;
          });
        }
      };
      peer.onicecandidate = (event) => {
        if (event.candidate) sendSignal({ candidate: event.candidate.toJSON() });
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") setPhase("connected");
        if (["failed", "disconnected", "closed"].includes(peer.connectionState) && !leavingRef.current) {
          setPhase("disconnected");
        }
      };

      const socket = new WebSocket(
        `${getWebSocketUrl()}/ws/${code}?role=participant&participant=${participant}`,
      );
      socketRef.current = socket;
      setPhase("connecting");

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === "welcome") {
          setPresence(message.presence);
          setSpotlightTask(message.spotlightTask ?? EMPTY_SPOTLIGHT_LIVE_TASK);
          setSpotlightPositions(message.spotlightPositions ?? DEFAULT_SPOTLIGHT_POSITIONS);
          const participantCondition = message.conditions[participant];
          setCondition(participantCondition.videoCondition);
          setSelfViewHidden(participantCondition.selfViewHidden);
          media.setCondition(participantCondition.videoCondition);
          if (participant === "P01" && message.presence.P02) {
            window.setTimeout(() => void makeOffer(), 0);
          }
        } else if (message.type === "presence") {
          setPresence(message.presence);
          if (participant === "P01" && message.participant === "P02" && message.connected) {
            window.setTimeout(() => void makeOffer(), 0);
          }
        } else if (message.type === "signal") {
          void handleSignal(message);
        } else if (message.type === "condition_change" && message.participant === participant) {
          setCondition(message.condition);
          media.setCondition(message.condition);
        } else if (message.type === "self_view_change" && message.participant === participant) {
          setSelfViewHidden(message.hidden);
        } else if (message.type === "spotlight_task_state") {
          setSpotlightTask(message.task);
        } else if (message.type === "spotlight_position") {
          setSpotlightPositions((current) => ({
            ...current,
            [message.participant]: message.point,
          }));
        } else if (message.type === "error") {
          setError(message.message);
        }
      };
      socket.onclose = () => {
        if (!leavingRef.current) setPhase("disconnected");
      };
      socket.onerror = () => {
        setError("Could not connect to the live session service.");
        setPhase("error");
      };

      window.history.replaceState(
        {},
        "",
        `/session?code=${code}&participant=${participant}`,
      );
    } catch (joinError) {
      mediaRef.current?.stop();
      peerRef.current?.close();
      setPhase("error");
      setError(
        joinError instanceof Error
          ? joinError.message
          : "Camera and microphone access could not be started.",
      );
    }
  };

  const moveSpotlight = (point: SpotlightPoint) => {
    setSpotlightPositions((current) => ({ ...current, [participant]: point }));
    const now = performance.now();
    if (
      now - lastSpotlightSentRef.current < 50 ||
      socketRef.current?.readyState !== WebSocket.OPEN ||
      spotlightTask.status !== "active" ||
      spotlightTask.phase !== "playing"
    ) {
      return;
    }
    lastSpotlightSentRef.current = now;
    socketRef.current.send(JSON.stringify({ type: "spotlight_move", ...point }));
  };

  const selectSpotlightObject = (objectId: string) => {
    if (
      socketRef.current?.readyState !== WebSocket.OPEN ||
      spotlightTask.status !== "active" ||
      spotlightTask.phase !== "playing"
    ) return;
    socketRef.current.send(JSON.stringify({ type: "spotlight_select", object_id: objectId }));
  };

  const ownState = useMemo(
    () => participantState(Boolean(localStream), condition, selfViewHidden),
    [condition, localStream, selfViewHidden],
  );
  const peerState = useMemo(
    () => participantState(presence[peerParticipant], "normal", false),
    [peerParticipant, presence],
  );

  return (
    <>
      <OperateHeader label="Participant session" />
      <main className="flex-1 py-8 md:py-12">
      <div className="section-shell">
        <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-6">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-magenta">
              Participant session
            </p>
            <h1 className="font-display mt-2 text-[28px] font-medium tracking-tight text-ink">
              Join the virtual interaction
            </h1>
          </div>
          {code && (
            <div className="rounded-2xl bg-bg-soft px-4 py-3 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                Session · {participant}
              </p>
              <p className="font-mono text-lg font-semibold tracking-[0.16em] text-ink">{code}</p>
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-lg border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn">
            {error}
          </div>
        )}

        {phase === "ready" || phase === "error" || phase === "disconnected" ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="card-surface p-6 md:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Before joining</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">Camera and microphone permission</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Your audio and video are sent directly to the other participant. DyadLab stores behavioral
              task events and condition changes, not the media stream.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_150px]">
              <label className="grid gap-1.5 text-xs font-semibold text-ink">
                Session code
                <input
                  value={code}
                  maxLength={6}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  className="rounded-xl bg-bg-soft px-3 py-2.5 font-mono text-sm uppercase tracking-[0.15em]"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-ink">
                Participant
                <select
                  value={participant}
                  onChange={(event) => setParticipant(event.target.value as ParticipantId)}
                  className="rounded-xl bg-bg-soft px-3 py-2.5 text-sm"
                >
                  <option value="P01">P01</option>
                  <option value="P02">P02</option>
                </select>
              </label>
            </div>
            <Button
              className="mt-6"
              variant="primary"
              data-testid="join-session"
              onClick={joinSession}
            >
              Join with camera and microphone
            </Button>
          </section>
          <aside className="card-surface p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">What to expect</p>
            <ol className="mt-4 grid gap-4">
              {[
                "You'll see yourself and the other participant once you both join.",
                "The researcher may change your video condition at any time.",
                "A short collaborative task starts when the researcher begins it.",
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
                    Live connection
                  </p>
                  <p data-testid="connection-status" className="mt-1 text-sm text-ink-muted">
                    {phase === "requesting" && "Requesting media access…"}
                    {phase === "connecting" && `Waiting for ${peerParticipant}…`}
                    {phase === "connected" && `Connected to ${peerParticipant}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-strong">
                    {CONDITION_LABEL[condition]}
                  </span>
                  <Button size="sm" variant="ghost" onClick={stopSession}>
                    Leave
                  </Button>
                </div>
              </div>
              {!processingSupported && (
                <p className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-xs text-warn">
                  This browser can hide video, but does not support applying visual filters to the outgoing
                  stream. Use a current Chromium, Firefox, or Safari release for full condition enforcement.
                </p>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ParticipantTile id={participant} state={ownState} stream={localStream} isSelfView />
                <ParticipantTile id={peerParticipant} state={peerState} stream={remoteStream} />
              </div>
            </section>

            <SpotlightLiveBoard
              task={spotlightTask}
              viewer={participant}
              positions={spotlightPositions}
              onMove={moveSpotlight}
              onSelect={selectSpotlightObject}
            />
            <span data-testid="participant-spotlight-task-status" className="sr-only">
              {spotlightTask.status}
            </span>
          </div>
        )}
      </div>
      </main>
    </>
  );
}

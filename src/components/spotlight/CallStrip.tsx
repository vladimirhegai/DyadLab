"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BotLine } from "@/lib/spotlight-sync/bot";
import { BotFace } from "./BotFace";
import { BotMessage } from "./BotMessage";

/**
 * The video-call column.
 *
 * Two things earn their place here. First, the task is meant to run over a call,
 * so showing the call makes the demo look like the thing it is a demo of.
 * Second, it gives the bot a fixed place to speak: its lines used to float over
 * the scene next to a spotlight that never stops moving, which made them hard
 * to read. A caption box that never moves and never resizes fixes that.
 */

type CameraState = "off" | "starting" | "on" | "denied" | "unsupported";

export function CallStrip({
  botLine,
  botSpeaking,
  botMuted,
  connected,
}: {
  botLine: BotLine | null;
  botSpeaking: boolean;
  botMuted?: boolean;
  connected: boolean;
}) {
  const [camera, setCamera] = useState<CameraState>("off");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamera("off");
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("unsupported");
      return;
    }
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamera("on");
    } catch {
      setCamera("denied");
    }
  };

  return (
    <div className="sl-call">
      <p className="sl-call-title">Session call</p>

      <div className="sl-tile is-you">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={camera === "on" ? "" : "is-hidden"}
        />
        {camera !== "on" && (
          <span className="sl-tile-avatar is-you" aria-hidden="true">
            YOU
          </span>
        )}
        <span className="sl-tile-name">P01 · You</span>
        {camera === "on" ? (
          <button type="button" className="sl-tile-action" onClick={stopCamera}>
            Turn camera off
          </button>
        ) : (
          <button
            type="button"
            className="sl-tile-action"
            onClick={startCamera}
            disabled={camera === "starting" || camera === "unsupported"}
          >
            {camera === "starting"
              ? "Starting…"
              : camera === "denied"
                ? "Camera blocked · retry"
                : camera === "unsupported"
                  ? "Camera unavailable"
                  : "Turn camera on"}
          </button>
        )}
      </div>

      <div className={`sl-tile is-partner${botSpeaking ? " is-speaking" : ""}`}>
        <BotFace speaking={botSpeaking} />
        <span className="sl-tile-name">P02 · Bot partner</span>
        {connected && <span className="sl-tile-live" aria-hidden="true" />}
      </div>

      {/* Fixed height so an arriving line never reflows the column. */}
      <div className="sl-call-caption" role="status" aria-live="polite">
        {botLine ? (
          <p>
            <b aria-hidden="true">P02</b>
            <BotMessage line={botLine} />
          </p>
        ) : (
          <p className="is-idle">
            {botMuted
              ? "Partner text is muted by the researcher."
              : connected
                ? "Listening…"
                : "Your partner joins when the round starts."}
          </p>
        )}
      </div>
    </div>
  );
}

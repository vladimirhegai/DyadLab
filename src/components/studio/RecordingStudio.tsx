"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

interface Take {
  id: string;
  url: string;
  createdAt: string;
}

const MAX_TAKE_SECONDS = 15;

export function RecordingStudio() {
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [takes, setTakes] = useState<Take[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      takes.forEach((t) => URL.revokeObjectURL(t.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setCameraOn(true);
    } catch {
      setError("Could not access your camera or microphone. Check browser permissions and try again.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setTakes((prev) => [{ id: `take-${Date.now()}`, url, createdAt: new Date().toLocaleTimeString() }, ...prev]);
      setIsRecording(false);
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    stopTimerRef.current = setTimeout(() => recorder.stop(), MAX_TAKE_SECONDS * 1000);
  }

  function stopRecording() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    recorderRef.current?.stop();
  }

  function removeTake(id: string) {
    setTakes((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((t) => t.id !== id);
    });
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="card-surface p-5">
        <div className="aspect-video w-full overflow-hidden rounded-md bg-ink">
          <video ref={videoPreviewRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        </div>

        {error && <p className="mt-3 text-sm text-warn">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-3">
          {!cameraOn ? (
            <Button variant="primary" onClick={startCamera}>
              Start Camera
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={stopCamera} disabled={isRecording}>
                Stop Camera
              </Button>
              {!isRecording ? (
                <Button variant="primary" onClick={startRecording}>
                  ● Start Recording
                </Button>
              ) : (
                <Button variant="warn" onClick={stopRecording}>
                  Stop Recording
                </Button>
              )}
            </>
          )}
        </div>
        {isRecording && (
          <p className="animate-blink-rec mt-3 text-sm font-medium text-warn">
            ● Recording — auto-stops after {MAX_TAKE_SECONDS}s
          </p>
        )}
      </div>

      {takes.length > 0 && (
        <div>
          <p className="mb-3 text-[13px] font-semibold text-ink">Takes ({takes.length})</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {takes.map((take, i) => (
              <div key={take.id} className="card-surface p-3">
                <video src={take.url} controls className="w-full rounded-md bg-ink" />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-ink-muted">
                    Take {takes.length - i} · {take.createdAt}
                  </span>
                  <div className="flex gap-2">
                    <a
                      href={take.url}
                      download={`dyadlab-placeholder-${take.id}.webm`}
                      className="text-xs font-medium text-accent-strong hover:underline"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => removeTake(take.id)}
                      className="text-xs font-medium text-warn hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

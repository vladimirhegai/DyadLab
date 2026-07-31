import type { VideoCondition } from "@/lib/demo/types";

export interface ConditionedMedia {
  stream: MediaStream;
  processingSupported: boolean;
  setCondition: (condition: VideoCondition) => void;
  stop: () => void;
}

export async function createConditionedMedia(rawStream: MediaStream): Promise<ConditionedMedia> {
  const rawVideoTrack = rawStream.getVideoTracks()[0];
  if (!rawVideoTrack) {
    return {
      stream: rawStream,
      processingSupported: false,
      setCondition: () => undefined,
      stop: () => rawStream.getTracks().forEach((track) => track.stop()),
    };
  }

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = new MediaStream([rawVideoTrack]);
  await video.play();

  const canvas = document.createElement("canvas");
  const settings = rawVideoTrack.getSettings();
  canvas.width = settings.width || video.videoWidth || 640;
  canvas.height = settings.height || video.videoHeight || 360;
  const context = canvas.getContext("2d", { alpha: false });

  if (!context || typeof canvas.captureStream !== "function") {
    return {
      stream: rawStream,
      processingSupported: false,
      setCondition: (condition) => {
        rawVideoTrack.enabled = condition !== "disabled";
      },
      stop: () => {
        video.srcObject = null;
        rawStream.getTracks().forEach((track) => track.stop());
      },
    };
  }

  // A zero-rate canvas stream depends entirely on `requestFrame()`, which is
  // not implemented consistently enough across browsers for a live call. A
  // capped stream remains live while the drawing loop controls whether new
  // content arrives at 30 fps or at the reduced 6 fps condition.
  const processedStream = canvas.captureStream(30);
  const processedVideoTrack = processedStream.getVideoTracks()[0];
  if (!processedVideoTrack) {
    return {
      stream: rawStream,
      processingSupported: false,
      setCondition: (condition) => {
        rawVideoTrack.enabled = condition !== "disabled";
      },
      stop: () => {
        video.srcObject = null;
        rawStream.getTracks().forEach((track) => track.stop());
      },
    };
  }
  processedVideoTrack.contentHint = "motion";
  const outputStream = new MediaStream([processedVideoTrack, ...rawStream.getAudioTracks()]);

  let condition: VideoCondition = "normal";
  let stopped = false;
  let frameTimer: number | undefined;

  const drawFrame = () => {
    if (stopped) return;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      context.save();
      context.filter =
        condition === "blurred"
          ? "blur(10px)"
          : condition === "grayscale"
            ? "grayscale(1)"
            : "none";
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      context.restore();
    }

    const framesPerSecond = condition === "reducedFrameRate" ? 6 : 30;
    frameTimer = window.setTimeout(drawFrame, 1000 / framesPerSecond);
  };

  drawFrame();

  return {
    stream: outputStream,
    processingSupported: true,
    setCondition: (nextCondition) => {
      if (condition === nextCondition) return;
      condition = nextCondition;
      processedVideoTrack.enabled = nextCondition !== "disabled";
      if (frameTimer !== undefined) window.clearTimeout(frameTimer);
      drawFrame();
    },
    stop: () => {
      stopped = true;
      if (frameTimer !== undefined) window.clearTimeout(frameTimer);
      processedStream.getTracks().forEach((track) => track.stop());
      rawStream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    },
  };
}

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

  const processedStream = canvas.captureStream(0);
  const processedVideoTrack = processedStream.getVideoTracks()[0] as MediaStreamTrack & {
    requestFrame?: () => void;
  };
  const outputStream = new MediaStream([processedVideoTrack, ...rawStream.getAudioTracks()]);

  let condition: VideoCondition = "normal";
  let stopped = false;
  let frameTimer: number | undefined;

  const drawFrame = () => {
    if (stopped) return;
    context.save();
    context.filter =
      condition === "blurred"
        ? "blur(10px)"
        : condition === "grayscale"
          ? "grayscale(1)"
          : "none";
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();
    processedVideoTrack.requestFrame?.();

    const framesPerSecond = condition === "reducedFrameRate" ? 6 : 30;
    frameTimer = window.setTimeout(drawFrame, 1000 / framesPerSecond);
  };

  drawFrame();

  return {
    stream: outputStream,
    processingSupported: true,
    setCondition: (nextCondition) => {
      condition = nextCondition;
      processedVideoTrack.enabled = nextCondition !== "disabled";
    },
    stop: () => {
      stopped = true;
      if (frameTimer !== undefined) window.clearTimeout(frameTimer);
      processedVideoTrack.stop();
      rawStream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    },
  };
}

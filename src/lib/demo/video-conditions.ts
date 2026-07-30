import type { VideoCondition } from "./types";

/** Researcher-selectable video conditions, shared by the dashboard and session. */
export const VIDEO_CONDITIONS: { value: VideoCondition; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "disabled", label: "Disable video" },
  { value: "blurred", label: "Blur" },
  { value: "grayscale", label: "Grayscale" },
  { value: "reducedFrameRate", label: "Reduce frame rate" },
];

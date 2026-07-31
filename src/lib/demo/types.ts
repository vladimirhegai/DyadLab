export type ParticipantId = "P01" | "P02";

export type VideoCondition = "normal" | "disabled" | "blurred" | "grayscale" | "reducedFrameRate";

export interface ParticipantState {
  connected: boolean;
  videoCondition: VideoCondition;
  selfViewHidden: boolean;
}

export type EventActor = "researcher" | ParticipantId | "session";

export type EventType =
  | "joined_session"
  | "media_state"
  | "video_condition"
  | "self_view"
  | "spotlight_context_condition"
  | "spotlight_feedback_condition"
  | "spotlight_communication_condition"
  | "spotlight_task_started"
  | "spotlight_task_stopped"
  | "spotlight_round_started"
  | "spotlight_position_sample"
  | "spotlight_focus"
  | "spotlight_converged"
  | "spotlight_distractor_onset"
  | "spotlight_distractor_captured"
  | "spotlight_false_lock"
  | "spotlight_joint_found"
  | "spotlight_joint_missed"
  | "spotlight_task_completed";

export interface DemoEvent {
  id: string;
  sequence?: number;
  sessionCode?: string;
  schemaVersion?: number;
  elapsedMs: number;
  timestamp: string;
  recordedAt?: string;
  round?: number | null;
  actor: EventActor;
  type: EventType;
  payload?: Record<string, unknown>;
  value: string;
}

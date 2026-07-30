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
  | "video_condition"
  | "self_view"
  | "feedback_condition"
  | "task_started"
  | "task_stopped"
  | "round_started"
  | "signal_selected"
  | "joint_target_found"
  | "joint_target_missed"
  | "task_completed"
  | "spotlight_context_condition"
  | "spotlight_feedback_condition"
  | "spotlight_communication_condition"
  | "spotlight_task_started"
  | "spotlight_task_stopped"
  | "spotlight_round_started"
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
  elapsedMs: number;
  timestamp: string;
  actor: EventActor;
  type: EventType;
  value: string;
}

export interface DemoState {
  demoStartedAt: number;
  participants: Record<ParticipantId, ParticipantState>;
  task: import("@/lib/signal-sync/types").SignalTaskState;
  events: DemoEvent[];
}

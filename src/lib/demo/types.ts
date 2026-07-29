export type ParticipantId = "P01" | "P02";

export type VideoCondition = "normal" | "disabled" | "blurred" | "grayscale" | "reducedFrameRate";

export type CardShape = "circle" | "triangle" | "square" | "diamond" | "hexagon" | "star";

export interface AbstractCard {
  id: string;
  shape: CardShape;
  color: string;
  pattern: "solid" | "striped" | "dotted";
}

export interface ParticipantState {
  connected: boolean;
  videoCondition: VideoCondition;
  selfViewHidden: boolean;
  hand: AbstractCard[];
  selectedCardIds: string[];
}

export type TaskStatus = "idle" | "active" | "completed";

export interface TaskState {
  status: TaskStatus;
  sharedCardIds: string[];
  agreedCardIds: string[];
  startedAt: number | null;
  completedAt: number | null;
  correctness: number | null;
}

export type EventActor = "researcher" | ParticipantId | "session";

export type EventType =
  | "joined_session"
  | "video_condition"
  | "self_view"
  | "task_started"
  | "task_stopped"
  | "card_selected"
  | "card_deselected"
  | "agreement_reached"
  | "task_completed";

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
  task: TaskState;
  events: DemoEvent[];
}

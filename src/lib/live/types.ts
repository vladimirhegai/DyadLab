import type { DemoEvent, ParticipantId, VideoCondition } from "@/lib/demo/types";
import {
  EMPTY_SPOTLIGHT_TASK,
  type SpotlightPoint,
  type SpotlightPositions,
  type SpotlightTaskState,
} from "@/lib/spotlight-sync/types";

export interface ParticipantCondition {
  videoCondition: VideoCondition;
  selfViewHidden: boolean;
}

export type ConditionState = Record<ParticipantId, ParticipantCondition>;
export type PresenceState = Record<ParticipantId, boolean>;
export interface ParticipantMedia {
  camera: boolean;
  microphone: boolean;
}
export type MediaState = Record<ParticipantId, ParticipantMedia>;

export type LiveSpotlightTaskState = SpotlightTaskState;

export interface CreatedSession {
  code: string;
  created_at: string;
  expires_at: string;
  status: string;
  protocol_version: string;
  researcher_token: string;
  researcher_url: string;
  participant_urls: Record<ParticipantId, string>;
  join_urls: string[];
}

export interface SessionSnapshot {
  code: string;
  created_at: string;
  status: string;
  event_count: number;
  expires_at?: string;
  protocol_version?: string;
  presence: PresenceState;
  conditions: ConditionState;
  mediaState: MediaState;
  spotlightTask?: LiveSpotlightTaskState;
  spotlightPositions?: SpotlightPositions;
}

export type ServerMessage =
  | {
      type: "welcome";
      code: string;
      role: "participant" | "researcher";
      participant: ParticipantId | null;
      presence: PresenceState;
      conditions: ConditionState;
      mediaState: MediaState;
      spotlightTask?: LiveSpotlightTaskState;
      spotlightPositions?: SpotlightPositions;
    }
  | {
      type: "presence";
      participant: ParticipantId;
      connected: boolean;
      presence: PresenceState;
    }
  | {
      type: "condition_change";
      participant: ParticipantId;
      condition: VideoCondition;
    }
  | {
      type: "self_view_change";
      participant: ParticipantId;
      hidden: boolean;
    }
  | {
      type: "condition_state";
      conditions: ConditionState;
    }
  | {
      type: "media_state";
      participant: ParticipantId;
      camera: boolean;
      microphone: boolean;
      mediaState: MediaState;
    }
  | {
      type: "spotlight_task_state";
      task: LiveSpotlightTaskState;
    }
  | {
      type: "spotlight_position";
      participant: ParticipantId;
      point: SpotlightPoint;
    }
  | {
      type: "event";
      event: DemoEvent;
    }
  | {
      type: "signal";
      from: ParticipantId;
      payload: {
        description?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };
    }
  | {
      type: "monitor_requested";
    }
  | {
      type: "monitor_signal";
      from: ParticipantId | "researcher";
      payload: {
        description?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };
    }
  | {
      type: "error";
      message: string;
    };

export const EMPTY_PRESENCE: PresenceState = { P01: false, P02: false };
export const EMPTY_MEDIA_STATE: MediaState = {
  P01: { camera: false, microphone: false },
  P02: { camera: false, microphone: false },
};

export const EMPTY_CONDITIONS: ConditionState = {
  P01: { videoCondition: "normal", selfViewHidden: false },
  P02: { videoCondition: "normal", selfViewHidden: false },
};

export const EMPTY_SPOTLIGHT_LIVE_TASK: LiveSpotlightTaskState = {
  ...EMPTY_SPOTLIGHT_TASK,
  selections: { ...EMPTY_SPOTLIGHT_TASK.selections },
  selectionTimes: { ...EMPTY_SPOTLIGHT_TASK.selectionTimes },
  stats: { ...EMPTY_SPOTLIGHT_TASK.stats },
  history: [],
};

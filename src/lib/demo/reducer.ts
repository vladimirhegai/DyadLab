import { dealHand, SHARED_CARD_IDS } from "./cards";
import type { DemoEvent, DemoState, EventActor, EventType, ParticipantId, VideoCondition } from "./types";

export type DemoAction =
  | { type: "JOIN"; participant: ParticipantId }
  | { type: "SET_VIDEO_CONDITION"; participant: ParticipantId; condition: VideoCondition }
  | { type: "TOGGLE_SELF_VIEW"; participant: ParticipantId }
  | { type: "START_TASK" }
  | { type: "STOP_TASK" }
  | { type: "TOGGLE_CARD"; participant: ParticipantId; cardId: string }
  | { type: "RESET" };

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const mm = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const ss = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

let eventCounter = 0;

function makeEvent(
  demoStartedAt: number,
  actor: EventActor,
  type: EventType,
  value: string,
): DemoEvent {
  eventCounter += 1;
  const elapsedMs = Date.now() - demoStartedAt;
  return {
    id: `evt-${eventCounter}`,
    elapsedMs,
    timestamp: formatElapsed(elapsedMs),
    actor,
    type,
    value,
  };
}

export function createInitialState(): DemoState {
  return {
    demoStartedAt: Date.now(),
    participants: {
      P01: {
        connected: false,
        videoCondition: "normal",
        selfViewHidden: false,
        hand: dealHand("P01"),
        selectedCardIds: [],
      },
      P02: {
        connected: false,
        videoCondition: "normal",
        selfViewHidden: false,
        hand: dealHand("P02"),
        selectedCardIds: [],
      },
    },
    task: {
      status: "idle",
      sharedCardIds: SHARED_CARD_IDS,
      agreedCardIds: [],
      startedAt: null,
      completedAt: null,
      correctness: null,
    },
    events: [],
  };
}

const CONDITION_LABEL: Record<VideoCondition, string> = {
  normal: "normal",
  disabled: "disabled",
  blurred: "blurred",
  grayscale: "grayscale",
  reducedFrameRate: "reduced frame rate",
};

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "JOIN": {
      if (state.participants[action.participant].connected) return state;
      const event = makeEvent(state.demoStartedAt, action.participant, "joined_session", "successful");
      return {
        ...state,
        participants: {
          ...state.participants,
          [action.participant]: { ...state.participants[action.participant], connected: true },
        },
        events: [...state.events, event],
      };
    }

    case "SET_VIDEO_CONDITION": {
      const current = state.participants[action.participant];
      if (current.videoCondition === action.condition) return state;
      const event = makeEvent(
        state.demoStartedAt,
        "researcher",
        "video_condition",
        `${CONDITION_LABEL[action.condition]} (${action.participant})`,
      );
      return {
        ...state,
        participants: {
          ...state.participants,
          [action.participant]: { ...current, videoCondition: action.condition },
        },
        events: [...state.events, event],
      };
    }

    case "TOGGLE_SELF_VIEW": {
      const current = state.participants[action.participant];
      const nextHidden = !current.selfViewHidden;
      const event = makeEvent(
        state.demoStartedAt,
        "researcher",
        "self_view",
        `${nextHidden ? "hidden" : "visible"} (${action.participant})`,
      );
      return {
        ...state,
        participants: {
          ...state.participants,
          [action.participant]: { ...current, selfViewHidden: nextHidden },
        },
        events: [...state.events, event],
      };
    }

    case "START_TASK": {
      if (state.task.status === "active") return state;
      const event = makeEvent(state.demoStartedAt, "researcher", "task_started", "common_ground_card_task");
      return {
        ...state,
        participants: {
          P01: { ...state.participants.P01, selectedCardIds: [] },
          P02: { ...state.participants.P02, selectedCardIds: [] },
        },
        task: {
          ...state.task,
          status: "active",
          agreedCardIds: [],
          startedAt: Date.now(),
          completedAt: null,
          correctness: null,
        },
        events: [...state.events, event],
      };
    }

    case "STOP_TASK": {
      if (state.task.status !== "active") return state;
      const event = makeEvent(state.demoStartedAt, "researcher", "task_stopped", "manual_stop");
      return {
        ...state,
        task: { ...state.task, status: "idle" },
        events: [...state.events, event],
      };
    }

    case "TOGGLE_CARD": {
      if (state.task.status !== "active") return state;
      const participant = state.participants[action.participant];
      const alreadySelected = participant.selectedCardIds.includes(action.cardId);
      const nextSelected = alreadySelected
        ? participant.selectedCardIds.filter((id) => id !== action.cardId)
        : [...participant.selectedCardIds, action.cardId];

      const events: DemoEvent[] = [
        makeEvent(
          state.demoStartedAt,
          action.participant,
          alreadySelected ? "card_deselected" : "card_selected",
          action.cardId,
        ),
      ];

      const nextParticipants = {
        ...state.participants,
        [action.participant]: { ...participant, selectedCardIds: nextSelected },
      };

      const other = action.participant === "P01" ? nextParticipants.P02 : nextParticipants.P01;
      const isSharedCard = state.task.sharedCardIds.includes(action.cardId);
      const bothSelected = isSharedCard && !alreadySelected && other.selectedCardIds.includes(action.cardId);

      let agreedCardIds = state.task.agreedCardIds;
      if (bothSelected && !agreedCardIds.includes(action.cardId)) {
        agreedCardIds = [...agreedCardIds, action.cardId];
        events.push(makeEvent(state.demoStartedAt, "session", "agreement_reached", action.cardId));
      } else if (alreadySelected && agreedCardIds.includes(action.cardId)) {
        agreedCardIds = agreedCardIds.filter((id) => id !== action.cardId);
      }

      const allFound = state.task.sharedCardIds.every((id) => agreedCardIds.includes(id));

      let task = { ...state.task, agreedCardIds };
      if (allFound) {
        const startedAt = state.task.startedAt ?? Date.now();
        const correctness = agreedCardIds.length / state.task.sharedCardIds.length;
        task = {
          ...task,
          status: "completed",
          completedAt: Date.now(),
          correctness,
        };
        events.push(
          makeEvent(
            state.demoStartedAt,
            "session",
            "task_completed",
            `correct (${Math.round(correctness * 100)}%, ${Math.round((Date.now() - startedAt) / 1000)}s)`,
          ),
        );
      }

      return {
        ...state,
        participants: nextParticipants,
        task,
        events: [...state.events, ...events],
      };
    }

    case "RESET": {
      eventCounter = 0;
      return createInitialState();
    }

    default:
      return state;
  }
}

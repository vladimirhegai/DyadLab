# Spotlight Sync — implementation and handoff

Status: implemented feature specification for the bot demo, the live participant session, and the researcher
dashboard.

## Purpose

Spotlight Sync is a two-person collaborative visual-search task built on Effie Pereira and Monica Castelhano's
work on how **object content** and **scene context** jointly guide attention.

The rule fits in one sentence:

> One participant knows **what** to find. The other knows **which surface** it rests on. Talk, move your
> spotlights, and hold them on the same object.

It is a portfolio demonstration, not a validated experimental paradigm. Application copy should say “inspired
by,” never “replicates” or “tests.”

## Research mapping

| Source idea | Mechanic |
|---|---|
| Surface Guidance Framework — scenes divide into upper / mid / lower surfaces, and search is constrained to target-relevant ones (Pereira & Castelhano, 2019, *Psychon Bull Rev* 26(4), 1273–1281) | The room is authored in three surface bands. Every WHERE clue names a surface, optionally narrowed to one side. |
| Attentional capture is stronger for distractors on target-relevant surfaces (same paper) | Four rounds fire a brief salient onset; two land on the target's surface and two elsewhere. Capture is logged with its relevance. |
| Peripheral guidance — scene context and object content interact outside the fovea (Pereira & Castelhano, *JEP:HPP*) | Everything outside a spotlight is blurred and dimmed. Objects remain visible as shapes but must be lit to be identified. |
| Joint / social attention | A target only resolves while **both** spotlights cover it. Coordination is the commit action. |
| Temporal dynamics | Both paths are sampled at 20 Hz; separation, time to overlap, and dwell by surface are recorded per round. |

## Interaction model

There is no click-to-select. Input is pointer movement only.

1. A round begins and each participant receives one private clue.
2. Moving the pointer moves that participant's spotlight.
3. Both lights covering the same object fills a focus ring over `lockHoldMs` (620 ms). Breaking the hold
   decays it.
4. A completed ring on the target resolves the round. A completed ring elsewhere is recorded as a
   **false lock**, briefly disables that object, and play continues.
5. A round that is never solved resolves as a miss at `roundTimeoutMs` rather than stalling.
6. Roles alternate: the participant holding the WHAT clue swaps every round.

Keyboard and assistive users tab through invisible hit targets; focusing one moves that participant's
spotlight onto the object, which is the same input a pointer gives.

## Rounds

Round data is **validated at module load**: each round's WHAT candidate list is intersected with the objects
on its WHERE surface, and construction throws unless exactly one object survives and neither clue is decisive
on its own.

| Round | WHAT | WHERE | Target | Onset |
|---|---|---|---|---|
| 1 | It holds liquid | Desk height · right side | `mug` | — |
| 2 | Violet | Up high · right side | `moth` | — |
| 3 | Brass, a warm yellow metal | Desk height | `key` | `camera` (relevant) |
| 4 | Alive and growing | Floor level | `fern` | `clock` (irrelevant) |
| 5 | Glass, and it holds liquid | Up high · left side | `jar` | `books` (relevant) |
| 6 | It holds liquid | Floor level | `can` | `headphones` (irrelevant) |

Round 6 deliberately reuses round 1's object-content clue on a different surface: the same WHAT, a different
WHERE, a different answer.

## Experiences

### `/` (the front page)

Permission-free public demo. The visitor plays as P01 against a bot partner that only knows its own half of
the round — it patrols the objects its clue is true of, converges when the visitor settles on one of them, and
pulls away when the visitor settles somewhere its clue rules out. Everything needed to solve a round is
therefore visible in the partner's light. The board sits in a three-column workspace: researcher conditions
and the event timeline on the left, the scene in the middle, and the video call on the right. The partner's
lines appear both in a fixed-size bubble beside its spotlight and in the call column. Below the fold is a
search-trace replay of both paths.

Two dwell hints keep the rules learnable. Resting on an object your own clue rules out says so after 850 ms;
resting on one that fits your clue but not your partner's says that after 1.7 s. A completed lock on the wrong
object flashes red and names which clue it failed.

### `/session`

Each participant receives only their own clue. Pointer positions are shared transiently over the session
WebSocket. The hold is detected locally and commits a `spotlight_select`; the **server** waits for both
participants, compares both choices with the target, and redacts the partner's choice until the round
resolves. Camera conditions stay under researcher control.

### `/dashboard`

Starts and stops the task, controls rich versus reduced scene context and warm versus neutral feedback, and
shows both clues, candidate counts, the target and its surface, live positions, accuracy, convergence gap, and
round history. All durable events flow into the existing timeline and CSV/JSON exports.

## Durable event schema

Export columns are unchanged: `timestamp, participant, event, value`.

Event types:

- `spotlight_context_condition`, `spotlight_feedback_condition`
- `spotlight_task_started`, `spotlight_task_stopped`, `spotlight_task_completed`
- `spotlight_round_started`
- `spotlight_converged`
- `spotlight_distractor_onset`, `spotlight_distractor_captured`
- `spotlight_false_lock`
- `spotlight_focus`
- `spotlight_joint_found`, `spotlight_joint_missed`

Examples:

```text
spotlight_distractor_onset     round=3;object=camera;region_relevance=relevant
spotlight_distractor_captured  round=3;object=camera;region_relevance=relevant;latency_ms=612
spotlight_false_lock           round=3;object=camera;t_ms=2180
spotlight_focus                round=3;object=key;correct=true;rt_ms=4150;x=0.168;y=0.575
spotlight_joint_found          round=3;convergence_ms=168;rt_ms=4150;false_locks=1;relevant_dwell=0.71
```

High-frequency pointer coordinates are broadcast but never persisted. The trace replay is built from an
in-memory 20 Hz sample and is not written to the server.

## Privacy and authority

- Participant snapshots contain only that participant's clue.
- `targetId` and `researcherClues` are researcher-only during active play.
- The partner's focus selection and timestamp are redacted until feedback.
- The server validates object IDs and computes correctness, reaction time, and convergence gap.
- Spotlight coordinates are clamped to normalized values between 0 and 1.

## Rendering

The scene is authored vector art in a 1000 × 620 box and drawn three times, composited by CSS mask:

- **dim** — blurred, desaturated, darkened: the room as peripheral vision has it
- **sharp** — revealed inside the union of the two spotlights
- **bloom** — revealed only inside their intersection (`mask-composite: intersect`), so joint focus is the one
  place the room is fully legible

Objects live inside those layers rather than above them, so an unlit object is a shape rather than an icon.
A canvas above carries light trails, particles, and success rings; found targets are linked by a persistent
SVG constellation. Per-frame updates are pushed through an imperative handle so the ~400 SVG nodes are not
re-rendered by React at 60 fps.

Each success lights another part of the room, and completing the session drops the masks entirely.

## Main files

- `src/lib/spotlight-sync/rounds.ts` — scene layout, surface regions, self-validating round definitions
- `src/lib/spotlight-sync/engine.ts` — deterministic step function: hold, decay, onsets, measures, traces
- `src/lib/spotlight-sync/bot.ts` — the demo partner
- `src/components/spotlight/SceneArt.tsx` — the room
- `src/components/spotlight/ObjectGlyph.tsx` — the searchable objects
- `src/components/spotlight/SpotlightStage.tsx` — masked layers, canvas FX, hit targets
- `src/components/spotlight/SpotlightDemo.tsx` — bot demo shell and animation loop
- `src/components/spotlight/SpotlightLiveBoard.tsx` — two-browser board
- `src/components/spotlight/SpotlightTrace.tsx` — search-trace replay
- `src/components/spotlight/SpotlightResearchMonitor.tsx` — dashboard panel
- `backend/app/realtime.py` — server-authoritative task runtime (mirrors the round data)

## Known limitations

- Pointer paths are shared live and sampled client-side for the replay, but only discrete events are
  persisted. A research build should choose and store a deliberate sampling rate server-side.
- “Convergence gap” is the time between the two confirmed focus choices. It is not an eye-tracking measure.
- The bot uses a seeded PRNG for repeatability; it is not a model of human search.
- Distractor onsets run in the bot demo only. The live path would need the server to schedule them so both
  browsers see the same onset at the same time.
- Nothing here is experimentally validated. Any lab deployment should review timing windows, trial counts,
  counterbalancing, instructions, and consent language.

# Handoff: real sessions + backend

This document briefs whoever picks up the next phase of DyadLab. Read `DESIGN.md` first for the product rationale — this file is the engineering brief for what's left.

## Where things stand

The repo currently ships a **complete, working frontend**: a single-page product case study (`src/app/page.tsx`) whose centerpiece is a fully client-side simulated researcher dashboard (`src/components/demo/`). Every control in it is real React state (`src/lib/demo/reducer.ts`), not a mockup — video conditions, self-view, the card task, and the event timeline all work and are exportable as CSV/JSON. This required **no backend** and is already deployable to Vercel as-is.

What is *not* built: anything involving a second real browser, a real camera/mic stream between two people, or data that outlives a page refresh. That's this phase.

Two routes are already scaffolded as placeholders and are where this work plugs in:
- `/session` — will become the real two-participant WebRTC session
- `/dashboard` — will become the real, backend-connected researcher dashboard

Both currently just render a "not wired up yet" message (`src/app/session/page.tsx`, `src/app/dashboard/page.tsx`). Replace their contents; keep the routes.

## Goal for this phase

Make the "Launch real two-browser session" path in `DESIGN.md` §3 actually work, end to end:

1. A researcher opens `/dashboard`, creates a session, gets two shareable participant links (each with a session code).
2. Two people open those links in separate browsers/tabs, grant camera/mic permission, and see/hear each other.
3. The researcher's `/dashboard` shows live connection state for both participants and can push the same conditions the simulated demo already models (disable video, blur, grayscale, reduced frame rate, hide self-view) to a specific participant in real time.
4. Both participants can run the same common-ground card task the demo already implements (`src/lib/demo/cards.ts` has the deck — reuse it), with real per-participant input instead of a scripted partner.
5. Every event (join, condition change, card selection, agreement, completion) is persisted server-side, not just held in browser memory, and can be exported the same way the demo's CSV/JSON export already works (`src/lib/demo/export.ts` — mirror this format server-side so both paths produce identical schemas).

The demo path on the homepage must keep working exactly as-is throughout this work — it's the primary deliverable and doesn't depend on anything below.

## Proposed architecture

```
Participant A ─┐
               ├── WebRTC (peer-to-peer audio/video)
Participant B ─┘          │
                          ▼
                 Next.js client (/session)
                          │
                 WebSocket (signaling + live condition pushes)
                          │
                          ▼
                    FastAPI backend
                    │             │
                    ▼             ▼
              Session data    Media metadata
                 (SQLite)      (secure storage)
```

- **WebRTC**: peer-to-peer for the actual audio/video (don't proxy media through the server). Use a standard signaling flow (offer/answer/ICE candidates) over the WebSocket connection described below. For NAT traversal beyond a local network, you'll need at least a STUN server (a free public one is fine to start) and eventually a TURN server if restrictive networks are in scope — call this out to the user as a possible cost/infra decision rather than assuming it silently.
- **Signaling + researcher control channel**: a WebSocket server. FastAPI's native WebSocket support is sufficient — one connection per session participant (including the researcher's dashboard), keyed by session code. Messages: WebRTC signaling payloads, condition-change pushes from researcher → participant, and event notifications for the dashboard's live connection-state display.
- **Backend**: FastAPI, matching the tech-stack line already on the homepage (`Built with React, TypeScript, WebRTC, FastAPI, and SQLite`). Keep it a single deployable service — no need to split signaling and REST into separate processes.
- **Persistence**: SQLite is fine for this project's scale (single lab, one session at a time or a handful concurrently). Model the event table to match `DemoEvent` in `src/lib/demo/types.ts` (`timestamp`/`elapsed`, `actor`, `type`, `value`) plus a `session_id` foreign key, so the export format the frontend already knows how to render doesn't have to change shape between simulated and real data.
- **Deployment**: Vercel hosts the Next.js frontend, but Vercel's serverless functions cannot hold a long-lived WebSocket connection. The FastAPI service needs to run somewhere that supports persistent connections — Render, Fly.io, Railway, or a small VM are all reasonable; pick based on what's free/cheap for a student project. Set the backend URL via an environment variable (e.g. `NEXT_PUBLIC_SIGNALING_URL`) rather than hardcoding it, so the same frontend build works against local dev and the deployed backend.

## Concrete task breakdown

1. **Backend skeleton**: FastAPI app with a `/health` endpoint, SQLite connection (via `sqlite3` or SQLAlchemy — either is fine, don't over-engineer an ORM layer for one table), and a session model: `sessions(id, code, created_at, status)`, `events(id, session_id, elapsed_ms, actor, type, value, created_at)`.
2. **Session creation API**: `POST /sessions` → returns a session code and two participant join URLs. This is what `/dashboard`'s "Create Session" action calls.
3. **WebSocket endpoint**: `/ws/{session_code}?role=participant|researcher`. Handle: participant join/leave (broadcast to researcher), WebRTC signaling relay between the two participants, researcher → participant condition-change messages, and card-task events from participants.
4. **`/session` page**: camera/mic acquisition (`getUserMedia`), `RTCPeerConnection` setup, join the WebSocket, render the same participant-tile visuals already built for the demo (`src/components/demo/ParticipantTile.tsx` — reuse or adapt directly) driven by real `MediaStream`s and real condition messages from the researcher instead of local state.
5. **`/dashboard` page**: session creation form, live connection-state display, the same `ControlPanel` UI already built (`src/components/demo/ControlPanel.tsx`) but dispatching over the WebSocket instead of a local reducer, and a "download session data" action hitting a new `GET /sessions/{code}/events.csv` (or `.json`) endpoint instead of the client-side export used by the demo.
6. **Video condition enforcement**: conditions like blur/grayscale/reduced-frame-rate should be applied on the **participant's own client** (CSS filter / canvas frame-drop on their local preview and on what they send), not assumed to be enforced by the peer — document this clearly if you implement it as a local-only visual effect versus something that actually degrades the outstream, since a research paper reviewer will ask.
7. **Automated tests**: at minimum, a browser test (Playwright) that drives two headless browser contexts through a full session — join, one condition change, one card-task completion — and a couple of backend unit tests for the session/event API. This is what the "Reliability" architecture card on the homepage refers to; it should be true by the time this phase ships.
8. **Data export parity**: confirm a CSV exported from a real session and a CSV exported from the homepage demo have identical column headers, so any downstream analysis script the lab writes works on both.

## Things intentionally left as follow-ups, not blockers

- TURN server / NAT traversal hardening — note it, don't build it unless real cross-network testing surfaces a need.
- Authentication for the researcher dashboard — fine to leave unauthenticated for a prototype used only within the lab; flag it explicitly if this ever moves toward real participant data.
- Recording/storing actual audio-video streams to disk — the posting mentions this as a goal, but it's a significant scope increase (storage, consent, retention policy) and should be scoped as its own follow-up with the user rather than assumed here.
- Anything in `DESIGN.md` §9's "research prototype" list (retention windows, missing-data detection, etc.) that isn't purely a UI concern — these are backend/data-model decisions and should be designed alongside the event schema in step 1 above, not bolted on later.

## Repo orientation

- `src/lib/demo/` — the data model and logic to mirror on the backend (types, reducer, card deck, export format). Treat this as the source of truth for event shape.
- `src/components/demo/` — the UI to reuse/adapt for the real `/dashboard` and `/session` pages.
- `src/app/session/page.tsx`, `src/app/dashboard/page.tsx` — replace these placeholder scaffolds.
- `DESIGN.md` — product intent and why the simulated demo is designed the way it is; read before changing any of its behavior.

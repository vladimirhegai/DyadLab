# DyadLab — Design Document

Status: living document. Everything here is a starting point, not a contract — change anything that stops serving the goal below.

## 1. Purpose

DyadLab is being built as an application to the Work Study posting **"162480 — Programmer for projects focused on virtual interactions"** (QuAD Lab, Queen's University Department of Psychology, Dr. Effie Pereira). The deliverable is **not** a finished research platform — it is a **single-page product case study** that proves, in under a minute of scrolling and one click, that the applicant can design and build the thing the posting describes:

- a browser-based, Zoom-like two-person interaction platform
- researcher-side control over video conditions (disable, blur, grayscale, frame-rate)
- a collaborative participant task
- timestamped, structured event/data collection with export

The site's only job is to make Dr. Pereira understand the project, and the applicant's fit for it, before she finishes scrolling.

## 2. Audience & the five-second message

Single visitor persona: a cognitive neuroscience PI skimming a work-study application, on a laptop, with maybe 60–90 seconds of attention before she either keeps reading or moves to the next applicant.

First screen must answer, without scrolling:
1. **What is this?** A virtual-interaction research platform.
2. **Who is it for?** Researchers studying two-person online interactions.
3. **What can it do?** Manipulate video conditions and collect structured behavioral data.
4. **What did you build?** The platform, researcher controls, data collection, and testing — as a working prototype, not a mockup.

## 3. Experience strategy

No accounts, no two-browser setup, no WebRTC permission prompts as the primary path. The primary artifact is a **fully client-side simulated demo** embedded directly in the page:

- Two participant tiles use looping placeholder video (or a clean avatar/waveform placeholder if no video asset is supplied — see §8).
- A researcher control panel sits beside/below them with real, working buttons: disable video, blur, grayscale, reduce frame rate, hide self-view, start/stop task.
- Every control mutates a shared demo state (React context + reducer) and appends a row to a live **event timeline** with a real timestamp, mirroring exactly the kind of event log the real platform would persist.
- A simplified **common-ground card task** runs alongside: two participants each hold a partially-overlapping hand of abstract cards; selecting a card logs an event and the demo auto-advances a scripted "partner" so the visitor sees agreement/correctness detection resolve without needing a second person.
- A **Reset Demo** button restores initial state, so nothing the visitor does can strand the demo in a broken state.
- A **Download sample data** button exports the current event log as CSV or JSON — proving the data model, not just the UI.

A secondary, clearly-labeled path ("Launch real two-browser session") points at the actual WebRTC implementation once the backend engineer has built it. It is not required for the case study to succeed and must never block or clutter the primary path.

### The 60-second journey this is designed around
- 0–5s: Hero states what this is and shows the interface.
- 5–15s: Visitor clicks a demo control (e.g. "Apply Blur").
- 15–25s: Visitor sees the timeline log the action.
- 25–40s: Visitor skims architecture + sample data export.
- 40–60s: Visitor opens GitHub or scrolls to the closing summary.

## 4. Information architecture (single page)

Minimal nav, anchor-linked, sticky, never taller than ~64px:

`DyadLab` · `Overview` · `Demo` · `Architecture` · `GitHub`

Sections in scroll order:

1. **Hero** — one-sentence positioning + annotated browser-window mockup of the full interface (static illustration, not the live demo) + CTA buttons (`Try the interactive demo`, `View source code`) + tech-stack line.
2. **How an experiment works** — 3-step horizontal workflow: Configure → Interact → Analyze.
3. **Interactive demo** — the embedded simulated researcher dashboard described in §3. This is the centerpiece.
4. **What the platform records** — sample data table + CSV/JSON download, framed around data structure, accuracy, and QC (this directly answers the posting's emphasis on data storage/structures/QC).
5. **Engineering** — architecture diagram + four decision cards (real-time communication, researcher control, structured data, reliability).
6. **Designed as a research prototype** — maturity section: pseudonymous IDs, explicit recording state, configurable retention, missing-data detection, session-completion checks, no automated psychological conclusions, ethics-review disclaimer.
7. **Closing summary** — "What I built" statement + `Open Demo` / `View GitHub` / `Read Documentation` buttons.
8. **Footer** — minimal, name/contact, link back to job posting context optional.

No section may run long-form paragraphs; prefer short statements, labeled diagrams, and real interactive elements over prose.

## 5. Visual design system

Aesthetic target: **academic research software**, closer to a lab's internal tool or a paper's supplementary site than a startup landing page. Inspiration: quadlab.ca (generous whitespace, neutral background, restrained sans-serif type, understated color, full-width imagery breaks between sections, no decorative flourishes).

### Palette

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#FAFAF8` | page background (warm off-white, not pure white) |
| `--color-surface` | `#FFFFFF` | cards, panels |
| `--color-border` | `#E4E1DA` | hairline borders |
| `--color-ink` | `#12203B` | primary text (dark navy, not black) |
| `--color-ink-muted` | `#54607A` | secondary text |
| `--color-accent` | `#1F6F78` | muted teal — links, primary buttons, active states |
| `--color-accent-strong` | `#154F56` | hover/pressed teal |
| `--color-accent-soft` | `#E4F0EF` | teal tint backgrounds (badges, highlighted rows) |
| `--color-warn` | `#A6192E` | recording indicator / destructive actions only (a quiet nod to Queen's tricolour red — used sparingly) |
| `--color-warn-soft` | `#F8E9EB` | warning tint background |

No gradients, no glassmorphism, no particle/animated backgrounds. Shadows are single, soft, and shallow (`0 1px 2px rgba(18,32,59,0.06)`), used only to lift cards a few px off the page — never decorative glow.

### Typography

- Font: **Inter** (via `next/font/google`), variable weight.
- One typeface for the whole site. Numeric/timestamp/code elements use `ui-monospace` stack for tabular alignment (event timeline, data table).
- Scale: display 40–56px/tight tracking for the hero headline only; section headings 28–32px; body 16–17px/1.6 line-height; captions/labels 13px uppercase-tracked for eyebrows ("Researcher-controlled conditions" style callouts).

### Spacing & structure

- Max content width ~1120px, generous side padding.
- Section vertical rhythm: 96–128px desktop, 64px mobile.
- Cards: 1px hairline border + 8–10px radius + minimal shadow, never both a heavy shadow and a heavy border.
- Every section title is short (3–6 words); supporting copy is one sentence, not a paragraph, wherever the brief allows.

### Motion

Purposeful only: state transitions in the demo (blur applying, tile disabling, timeline row appearing) use a quick 150–200ms ease. No scroll-triggered parallax, no auto-playing marketing animation, no confetti. The one thing allowed to loop continuously is the placeholder participant video itself.

## 6. The interactive demo — functional spec

Implemented as isolated client components under `src/components/demo/`, driven by a single reducer (`src/components/demo/demo-state.ts`) so behavior is easy to hand off and unit test.

**State shape (conceptual):**
```
participants: { A: ParticipantState, B: ParticipantState }
ParticipantState: {
  connected: boolean
  videoCondition: 'normal' | 'disabled' | 'blurred' | 'grayscale' | 'reducedFrameRate'
  selfViewHidden: boolean
  hand: Card[]            // this participant's dealt cards
  selectedCardId: string | null
}
task: {
  status: 'idle' | 'active' | 'completed'
  sharedCardIds: string[]        // ground truth overlap
  agreedCardIds: string[]        // cards both participants have selected
  startedAt: number | null
  completedAt: number | null
}
events: DemoEvent[]   // append-only log, newest last
```

**Controls exposed in the panel (map 1:1 to posting bullet points):**
- Toggle Participant A / B video on/off ("disabling video")
- Apply Blur / Grayscale / Reduce Frame Rate / Normal (mutually exclusive per participant, "adding filters")
- Hide/Show Self-View
- Start / Stop collaborative task
- Reset Demo

**Every control dispatch appends an event:** `{ timestamp, actor: 'researcher' | 'P01' | 'P02' | 'session', type, value }`, rendered live in a monospace timeline, auto-scrolling, capped at a readable count with newest at the bottom.

**Card task:** ~8 abstract cards per participant (simple SVG shapes/patterns, generated, no external assets needed) with a deliberate overlap (e.g. 4 of 8 shared). Clicking a card for participant A logs `card_selected`; a short scripted delay simulates participant B independently converging on shared cards, logging `card_selected` / `card_deselected` / `agreement_reached` and finally `task_completed` with an elapsed time and correctness score (found-shared / actual-shared). This demonstrates exactly the accuracy/completion-time/agreement metrics the real task must record.

**Export:** "Download sample data" serializes the current `events` array to CSV and JSON (client-side `Blob` download, no backend needed for the demo).

## 7. Route map

```
/                current single-page case study (primary deliverable)
/studio          private-ish recording tool for the applicant (not linked in nav; noindex)
/session         placeholder scaffold for the real two-browser WebRTC session (backend phase)
/dashboard       placeholder scaffold for the real, backend-connected researcher dashboard (backend phase)
```

`/session` and `/dashboard` exist as thin, clearly-labeled "under construction — see HANDOFF.md" scaffolds so the repository structure already matches where real functionality lands; they are not part of the case-study narrative and are not linked from the hero as a primary action.

## 8. Assets the applicant may want to record (`/studio`)

The hero mockup and demo tiles work with **zero recorded video** — placeholders (looping CSS/SVG avatar tiles with a subtle "breathing" animation and simulated waveform) are the default and ship looking intentional, not empty. If real placeholder loops are desired for extra polish, `/studio` is a minimal page that:

- requests camera/mic permission only when the user opens it
- shows a live preview
- records via `MediaRecorder` in-browser
- lets the user trim start/end with simple scrubbers
- downloads the result as a `.webm` clip to drop into `public/media/`

This is optional. Nothing in the main page depends on it being done.

## 9. What ships in this phase vs. the handoff

**This phase (frontend/design, this repo state):** entire case-study page, fully functional simulated demo, sample data export, architecture/content sections, `/studio` recording tool, all docs.

**Handoff phase (see `HANDOFF.md`):** real WebRTC signaling + media pipeline for `/session`, FastAPI (or Node) backend + persistent storage for `/dashboard`, real participant join flow with session codes, real data pipeline replacing the client-only demo export, automated tests, deployment hardening.

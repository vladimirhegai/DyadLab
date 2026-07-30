# DyadLab — Design Document

Status: living document. Everything here is a starting point, not a contract — change anything that stops serving the goal below.

## 0. Direction contract (2026-07-29 redesign)

**THESIS.** DyadLab wears the QuAD Lab's own visual language — a warm, saturated, wavy psychology-research identity — instead of generic SaaS/dev-portfolio chrome (dark mode + one neon accent, or safe neutral "enterprise dashboard" gray). The category default for a programmer's case study is a muted, technical-looking site; DyadLab refuses that default so a QuAD Lab reviewer recognizes it as "one of ours" before reading a word.

**OWN-WORLD.** Deep-plum-to-magenta radial gradient fields with a hand-drawn wavy SVG edge separating color bands from white content bands (quadlab.ca's own hero-and-wave grammar, adapted, not cloned pixel-for-hex). A bold, warm display serif (Fraunces) carries headlines over a clean sans body; saturated violet-purple is the primary interactive color, hot magenta is the secondary highlight color used inline on key phrases; buttons and badges are full pill radius; cards float on soft blush-tinted grounds with organic blurred "blob" accents standing in for illustration, since no photography or illustrated-character assets exist for this project.

**STORY.** A reviewer lands, instantly recognizes the aesthetic register of a psychology attention-research lab, reads in one glance that this is a working two-person virtual-interaction platform built specifically for the LATTE posting's requirements, and believes the applicant can both speak the lab's visual language and ship the underlying WebRTC/data engineering. They act by clicking straight into the permission-free simulated demo.

**FIRST VIEWPORT.** Full-bleed plum→magenta→violet radial-gradient hero with a wavy bottom edge (matching quadlab.ca's hero silhouette). A bold Fraunces headline states the platform's purpose in one line, a one-sentence subhead, two pill CTAs ("Try the interactive demo" primary, "View source" secondary), and a tech-stack caption — all above the fold, wave-transitioning into the white "How an experiment works" band.

**FORM.** quadlab.ca's own institutional-lab-website grammar: gradient-hero-with-wave → alternating white/deep-color content bands → pink-highlighted inline phrases → purple/magenta multi-block footer grid. This direction is **brief-pinned by the user** (explicit reference to quadlab.ca), not selected from an open concept roll — every route in this project inherits it, with Operate-mode surfaces (`/dashboard`, `/session`, `/studio`) applying it at restrained intensity (neutrals + the one accent family, no full-bleed gradients) so task legibility is never sacrificed for expression.

## 1. Purpose

DyadLab is being built as an application to the Work Study posting **"162480 — Programmer for projects focused on virtual interactions"** (QuAD Lab, Queen's University Department of Psychology, Dr. Effie Pereira). The deliverable is **not** a finished research platform — it is a concise product case study plus dedicated demo and live-session experiences that prove, in under a minute of scrolling and one click, that the applicant can design and build the thing the posting describes:

- a browser-based, Zoom-like two-person interaction platform
- researcher-side control over video conditions (disable, blur, grayscale, frame-rate)
- a collaborative participant task
- timestamped, structured event/data collection with export

The site's only job is to make Dr. Pereira understand the project, and the applicant's fit for it, before she finishes scrolling.

## 2. Audience & the five-second message

Single visitor persona: a cognitive neuroscience PI skimming a work-study application, on a laptop, with maybe 60–90 seconds of attention before she either keeps reading or moves to the next applicant. She already knows what her own lab's website looks like — this site should feel visually kindred to it, not like a stranger's dev portfolio.

First screen must answer, without scrolling:
1. **What is this?** A virtual-interaction research platform.
2. **Who is it for?** Researchers studying two-person online interactions.
3. **What can it do?** Manipulate video conditions and collect structured behavioral data.
4. **What did you build?** The platform, researcher controls, data collection, and testing — as a working prototype, not a mockup.

## 3. Experience strategy

No accounts, no two-browser setup, no WebRTC permission prompts as the primary path. The primary artifact is a **fully client-side simulated demo** on its own focused route:

- Two participant tiles use a generated avatar/waveform placeholder (no recorded video required).
- A researcher control panel sits beside/below them with real, working buttons: disable video, blur, grayscale, reduce frame rate, hide self-view, start/stop task.
- Every control mutates a shared demo state (React reducer) and appends a row to a live **event timeline** with a real timestamp, mirroring exactly the kind of event log the real platform would persist.
- **Signal Sync** runs alongside: each participant holds one private clue (shape or color), says it aloud, and both choose the signal that satisfies the pair. In the public demo, a bot supplies the second clue and responds after the visitor; the real session stays fully participant-led.
- A **Reset Demo** button restores initial state, so nothing the visitor does can strand the demo in a broken state.
- A **Download sample data** button exports the current event log as CSV or JSON — proving the data model, not just the UI.

A secondary, clearly-labeled path ("Launch real two-browser session") points at the actual WebRTC implementation, which is real and working (FastAPI + WebSockets signaling, SQLite persistence, browser WebRTC, Playwright-verified). It is not required for the case study to succeed and must never block or clutter the primary path.

### The 60-second journey this is designed around
- 0–5s: Hero states what this is and shows the interface, in a visual register the reviewer already trusts.
- 5–15s: Visitor clicks a demo control (e.g. "Apply Blur").
- 15–25s: Visitor sees the timeline log the action.
- 25–40s: Visitor skims architecture + sample data export.
- 40–60s: Visitor opens GitHub or scrolls to the closing summary.

## 4. Information architecture

Minimal nav, sticky, never taller than ~64px:

`DyadLab` · `Play the game` · `How it works` · `Research`

The public experience is intentionally split so the explanation and the task can each breathe:

1. **Homepage (`/`)** — a concise case-study path: full-bleed hero with the real game preview, a three-step Configure → Interact → Analyze explanation, the research basis, and a short closing choice between the demo and live-session workflow.
2. **Demo and replay (`/spotlight-sync`)** — a focused task page with a compact introduction, the full simulated two-player game, event timeline, and replay. No marketing sections interrupt play.
3. **Researcher dashboard (`/dashboard`)** — the existing live-session workflow, visually connected through the shared Operate header.
4. **Participant and studio routes (`/session`, `/studio`)** — supporting operational experiences, not part of the public one-page narrative.

No section may run long-form paragraphs; prefer short statements, labeled diagrams, and real interactive elements over prose. Key phrases get the quadlab-style inline magenta highlight treatment (`<mark>`-equivalent styled span) instead of bold text, used sparingly (1–2 per section, never a whole sentence).

## 5. Visual design system

Aesthetic target: **the QuAD Lab's own institutional identity** — warm, confident, a little playful, unmistakably a psychology-research lab rather than a startup landing page or an engineering dashboard. Direct reference: quadlab.ca (radial magenta/purple gradient hero with a wavy silhouette, bold display-serif headline, alternating white/saturated content bands, hot-pink inline highlights, rounded pill UI, multi-block colored footer grid). Adapted, not pixel-cloned: DyadLab uses its own two-overlapping-circles "dyad" mark and a close-but-distinct palette rather than quadlab's literal hex values or brain-ribbon logo.

### Palette

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#FFFFFF` | page background, white content bands |
| `--color-bg-soft` | `#FBF2F8` | blush-tinted alternating bands, operate-mode page backgrounds |
| `--color-surface` | `#FFFFFF` | cards, panels |
| `--color-border` | `#EAD9E6` | hairline borders (warm plum-tinted, not neutral gray) |
| `--color-ink` | `#241A2C` | primary text (deep plum-black, not navy or pure black) |
| `--color-ink-muted` | `#6E5D77` | secondary text |
| `--color-accent` | `#7A0F8C` | primary interactive color — links, primary buttons, active states |
| `--color-accent-strong` | `#5A0C66` | hover/pressed accent |
| `--color-accent-soft` | `#F3E1F4` | accent tint backgrounds (badges, highlighted rows) |
| `--color-magenta` | `#D31C77` | secondary accent — inline highlights, gradient partner, secondary emphasis |
| `--color-magenta-soft` | `#FCE3EF` | magenta tint backgrounds |
| `--color-plum-deep` | `#3A0E52` | gradient dark anchor, footer/deep-band background |
| `--color-warn` | `#C81E4B` | recording indicator / destructive actions only |
| `--color-warn-soft` | `#FBE7EC` | warning tint background |

Gradient recipe for hero and deep-color bands: a radial blend from `--color-plum-deep` at the edges through `--color-accent` to `--color-magenta` glowing from lower-center — approximating quadlab's own hero glow. No glassmorphism, no particle backgrounds. Shadows stay soft and shallow (`0 2px 8px rgba(58,14,82,0.08)`) — cards lift a few px off the page, never a decorative glow.

### Typography

- Display: **Fraunces** (variable, `next/font/google`) for H1/H2 and any large numerals — a warm, slightly quirky serif that carries the same "confident display face" role quadlab's stencil-serif headline plays, without literally licensing that typeface.
- Body/UI: **Inter** (existing) — a workhorse sans for everything else, kept for density and legibility on Operate surfaces.
- Data/code: **JetBrains Mono** (existing) — timestamps, event log, session codes.
- Scale: hero display 44–64px/tight tracking; section headings (Fraunces) 30–40px; body 16–17px/1.6 line-height; captions/labels 13px uppercase-tracked eyebrows.
- Inline emphasis: key phrases get a `.highlight` span — `color: var(--color-magenta); font-weight: 600` — used the way quadlab colors 2–4 words per paragraph, never a full sentence.

### Spacing & structure

- Max content width ~1120px, generous side padding.
- Section vertical rhythm: 96–140px desktop, 64–88px mobile (deep-color bands get extra padding to breathe like quadlab's mid-page block).
- Cards: no border, soft shadow, **1.25rem (`rounded-2xl`) radius** — noticeably softer/rounder than a typical dev-tool card, matching the lab's warm register.
- Buttons and badges: **full pill radius** (`rounded-full`).
- Every section title is short (3–6 words); supporting copy is one sentence, not a paragraph, wherever the brief allows.

### Motifs

- **Wave dividers**: a reusable SVG wave component (`WaveDivider`) sits at the seam between a gradient/deep-color band and a white band, in both directions (wave-down and wave-up), directly reproducing quadlab's signature silhouette.
- **Blobs**: soft, blurred, low-opacity radial shapes in `--color-accent-soft` / `--color-magenta-soft` placed behind cards on white sections, standing in for illustration since no artist assets exist for this project — organic and warm rather than a geometric SaaS blob-grid.
- **Dyad mark**: the site's own two-overlapping-circle glyph (in the nav and footer) replaces quadlab's brain-and-ribbon logo — same "identity mark beside a serif wordmark" grammar, DyadLab's own content.
- **Headline glow**: `.headline-glow` — a soft, layered magenta/white text-shadow on the hero H1 — is the adapted echo of quadlab's own glowing outlined display title, reached without a licensed stencil typeface.

### Motion

Purposeful only: state transitions in the demo (blur applying, tile disabling, timeline row appearing) use a quick 150–200ms ease. The hero gradient may include one slow, continuous ambient drift (position/opacity of the glow, 12–18s ease-in-out loop, respecting `prefers-reduced-motion`) — the one "always-on" motion permitted, echoing quadlab's own animated hero. No scroll-triggered parallax, no confetti. Placeholder participant "video" tiles keep their breathing/pulse loop.

### Mode-specific application

- **Landing page (`/`) — Persuade.** Full commitment: gradient hero, wave dividers, alternating deep-color/white bands, blobs, inline highlights. This is where the world lives at full intensity.
- **`/dashboard`, `/session`, `/studio` — Operate.** Restrained strategy: white/blush backgrounds, no full-bleed gradients or wave dividers around functional panels, but the same accent palette, Fraunces page titles, pill buttons/badges, and rounded-2xl cards, so the whole product reads as one system. A shared `OperateHeader` (dyad mark + wordmark linking home, a 4px gradient strip beneath it, and a route label) replaces `SiteNav` on these routes — the one "world" cue carried into Operate pages. Pre-task empty states (create-session, join-session) pair the primary action card with a short "what happens next" list rather than leaving the rest of the viewport blank.

## 6. The interactive demo — functional spec

The game view lives under `src/components/game/` and is shared by the simulated and live participant experiences. The homepage uses a reducer; the live path receives the same state shape from the server.

**State shape (conceptual):**
```
participants: { A: ParticipantState, B: ParticipantState }
ParticipantState: {
  connected: boolean
  videoCondition: 'normal' | 'disabled' | 'blurred' | 'grayscale' | 'reducedFrameRate'
  selfViewHidden: boolean
}
task: {
  status: 'idle' | 'active' | 'completed'
  phase: 'idle' | 'playing' | 'feedback' | 'completed'
  currentRound: SignalRoundView
  selections: { P01: string | null, P02: string | null }
  stats: { hits, misses, streak, bestStreak, syncTotalMs, syncSamples }
  feedbackMode: 'warm' | 'neutral'
  startedAt: number | null
}
events: DemoEvent[]   // append-only log, newest last
```

**Controls exposed in the panel (map 1:1 to posting bullet points):**
- Toggle Participant A / B video on/off ("disabling video")
- Apply Blur / Grayscale / Reduce Frame Rate / Normal (mutually exclusive per participant, "adding filters")
- Hide/Show Self-View
- Choose Warm / Neutral social feedback
- Start / Stop collaborative task
- Reset Demo

**Every control dispatch appends an event:** `{ timestamp, actor: 'researcher' | 'P01' | 'P02' | 'session', type, value }`, rendered live in a monospace timeline, auto-scrolling, capped at a readable count with newest at the bottom.

**Signal Sync:** four short rounds. One participant sees a shape clue and the other sees a color clue; both say their clue and choose the one matching SVG signal. Events record `round_started`, each `signal_selected`, `joint_target_found` / `joint_target_missed`, response gap, reaction time, and `task_completed`. The demo bot selects after P01; the live server owns scoring, progression, privacy redaction, and replay.

**Export:** "Download sample data" serializes the current `events` array to CSV and JSON (client-side `Blob` download, no backend needed for the demo).

## 7. Route map

```
/                current single-page case study (primary deliverable) — Persuade, full visual world
/spotlight-sync  permission-free game and replay with simulated partner — Operate
/studio          private-ish recording tool for the applicant (not linked in nav; noindex) — Operate
/session         real two-browser WebRTC participant session — Operate
/dashboard       real, backend-connected researcher dashboard — Operate
```

`/spotlight-sync` is the permission-free primary experience. `/session` and `/dashboard` implement the secondary real-session path, verified end-to-end (backend Pytest + Playwright three-context e2e both pass). The homepage explains the work and sends visitors to either path without embedding the full game.

## 8. Assets

No real photos, video, or illustrated-character assets exist or will be supplied for this project (confirmed decision). Every visual element ships as generated CSS/SVG: gradient fields, wave dividers, blurred blob shapes, the dyad mark, and the existing breathing-avatar / waveform participant placeholders. `/studio` remains available as an optional, unlinked tool for the applicant to record real placeholder clips later — nothing in the main page depends on it.

## 9. What ships in this phase vs. the handoff

**This phase (visual redesign, this repo state):** new palette/typography/motif system applied across all four routes; wave-divider and blob primitives; restyled Hero/nav/footer/every landing section; restyled dashboard/session/studio to the same restrained system; no functional or data-model changes.

**Prior phase (verified working, unchanged by this redesign):** entire case-study page content and interactive demo logic, real WebRTC signaling + processed media pipeline for `/session`, FastAPI + SQLite persistence for `/dashboard`, participant join links, server-backed CSV/JSON exports, and an automated two-browser interaction test (`npm run test:backend && npm run test:e2e`, both verified passing 2026-07-29). TURN infrastructure, researcher authentication, and media recording remain separate production-hardening decisions.

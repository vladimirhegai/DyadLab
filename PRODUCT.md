# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Single confirmed persona: **Dr. Effie Pereira** (or a delegate reviewing on her behalf) at the QuAD Lab, Department of Psychology, Queen's University — screening a Work Study application for job posting FW26Q027 ("Programmer for projects focused on virtual interactions," the LATTE project). She is evaluating candidate fit on a laptop, with limited attention (60–90 seconds), against these stated qualifications: strong programming background, interest in experimental research, self-motivation, and ability to build a Zoom-like audio/video research platform with researcher-side controls and structured data collection.

Secondary audience: the applicant (site owner) uses the same repo/site as a live portfolio artifact, and may demo it in person or link it from a resume/cover letter.

## Product Purpose

DyadLab is a **case-study application artifact**, not a commercial product: it proves the applicant can design and build the specific system the QuAD Lab's LATTE posting describes — a browser-based two-person virtual-interaction platform with researcher-controlled video conditions and structured, exportable behavioral data. Success = the reviewer understands what was built and why it maps to the posting within one skim, then can click into a working demo that proves it isn't a mockup.

## Positioning

Unlike a generic Zoom-clone demo or a static portfolio slide, DyadLab ships **two real, working experiences** built specifically around the posting's own bullet points:

1. A permission-free, fully client-side simulated dashboard (`/`) that lets a reviewer manipulate researcher controls and play Signal Sync with a bot partner while a real event timeline responds instantly — no signup, no camera prompt, no second person required.
2. A real, working two-browser system (`/dashboard` creates a session, `/session` runs an actual peer-to-peer WebRTC call) with a FastAPI + SQLite backend persisting every researcher action and task event, and CSV/JSON export of analysis-ready data — i.e., the same researcher-control + data-structure work the posting asks the hire to do, already functioning end to end.

A neighboring "I can build a video chat app" portfolio project could not truthfully claim the researcher-control layer, the structured event/data model, or the deliberate parity between the simulated demo and the real session (verified by an automated three-context Playwright test).

## Operating Context

- Reviewed cold, without walkthrough, by a non-developer academic (the PI) — the primary landing page must be self-explanatory without a manual.
- The applicant may also demo it live or walk a technical collaborator (grad/undergrad researcher) through `/dashboard` → `/session` for a real two-browser run.
- `/studio` is a local, unlinked utility for the applicant to record optional placeholder video loops; not part of the reviewer-facing narrative.
- Deployment target: frontend and backend deploy independently (frontend static/edge-friendly, backend containerized with persistent storage and long-lived WebSocket support); TLS required for camera/mic access outside localhost.
- Application deadline context: materials due to Dr. Pereira by August 2–16, 2026, so the site needs to be link-ready, not iterated indefinitely.

## Capabilities and Constraints

Confirmed working (per README/tests, to be re-verified during this engagement):
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 frontend.
- Simulated demo (`/`): reducer-driven state, researcher controls, four-round Signal Sync game with a bot partner, live monospace event timeline, CSV/JSON export — entirely client-side, no backend dependency.
- Real live path: FastAPI + WebSockets backend (`backend/app`) for signaling, presence, researcher-issued conditions, and task events; SQLite for session + append-only event persistence; browser WebRTC for peer-to-peer audio/video; `/dashboard` creates sessions and participant links, `/session` joins them.
- Testing: Pytest for backend, Playwright for a full three-context (researcher + 2 participants) end-to-end run that also checks CSV header parity between the simulated and real data exports.
- Explicitly out of scope / not implemented: TURN relay (STUN only — may fail on restrictive networks), researcher authentication, server-side media recording/storage. These are named limitations, not silent gaps, and should stay visible in any "engineering/maturity" content rather than being hidden.
- Game scope: the same Signal Sync protocol runs in the simulated demo and live two-browser path; the live backend is server-authoritative and redacts the other participant's private clue.
- Imagery constraint (per user decision): **no real photos/video/screenshots will be supplied**; continue using generated/illustrated/CSS placeholders (avatars, waveforms, mockups) for anything imagery-shaped.
- Verification constraint (per user decision): before relying on the "fully working" backend/session claims in README/HANDOFF, this engagement must confirm the stack still actually runs end-to-end rather than trusting the docs at face value.

## Brand Commitments

- Name: **DyadLab** (a "dyad" = a two-person research interaction; keep this naming — it is the product's own name, not the lab's).
- Explicit binding visual reference volunteered by the user: **quadlab.ca** (the QuAD Lab's real website) — the redesign should adopt a kindred psychology-research aesthetic (warm, wavy/organic, soft pink/purple) rather than the current neutral teal/navy "academic software" look. Full palette/typography/motif decisions are made in the design-system (new-work) phase, not here.
- Tone: professional-but-warm academic research tool — not a generic SaaS/startup landing page, not a corporate enterprise dashboard.

## Evidence on Hand

- Existing `DESIGN.md` (pre-redesign): documents current IA, palette, typography, and demo functional spec in detail — treated as an anti-reference for visuals but accurate for product/functional facts, most of which are carried into this file.
- `README.md`: stack, run/test instructions, backend API table, deployment notes, project structure — all treated as current source of truth pending live verification.
- Full source present for both the simulated demo (`src/components/demo/*`, `src/lib/demo/*`) and the real live path (`src/components/live/*`, `src/lib/live/*`, `backend/app/*`), plus Playwright e2e coverage (`tests/e2e`).
- No real screenshots, recordings, or photography exist or will be supplied — future work must not fabricate or assume any.
- `HANDOFF.md` is referenced by README/DESIGN.md as the original backend engineering brief but is not currently present in the working tree — treat any claims sourced only from it as unverified until confirmed against actual running code.

## Product Principles

1. **Map visibly to the job posting.** Every major section should let a reviewer draw a straight line to a specific posting bullet point (researcher control, data structures/QC, testing/debugging, dissemination) without inference.
2. **Prove, don't just describe.** Prefer a working interaction (a real control that logs a real event, a real export, a real second browser session) over a paragraph claiming the capability exists.
3. **Zero-friction first path.** The primary demo must be usable with one click, no permissions, no setup, no second person — the real two-browser path is a secondary, clearly-labeled proof point, not the entry point.
4. **Say less, show more.** No walls of text; short statements, labeled diagrams, and real interactive elements carry the explanation.
5. **Coherence over decoration.** The new visual system (warm, wavy, psychology-lab-inspired) must read as one deliberate world across every route touched, not a skin applied only to the landing page.

## Accessibility & Inclusion

No project-specific accessibility requirement has been established beyond general good practice (keyboard operability of demo controls, sufficient contrast, no motion-only signaling). Confirm and tighten this during the redesign if the new palette/motion introduces contrast or motion-sensitivity risk.

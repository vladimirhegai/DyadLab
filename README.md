# DyadLab

**A single-page product case study for a controlled two-person virtual-interaction research platform.**

Built as an application project for *Programmer for projects focused on virtual interactions* (QuAD Lab, Queen's University Department of Psychology). DyadLab demonstrates, in one scroll and one click, a browser-based platform where two participants complete a collaborative task over video while a researcher manipulates conditions in real time and the system logs timestamped behavioral data.

**Live demo:** _add Vercel URL here once deployed_
**Job posting reference:** Work Study FW26Q027

## What this is (and isn't)

This repo currently contains a **fully working, entirely client-side simulated demo** wrapped in a product case-study page — not a production research tool. Every control in the demo (disable video, blur, grayscale, reduce frame rate, hide self-view, run the card task) is real, working React state, and every action is logged to a real event timeline that can be exported as CSV/JSON. No camera permissions, no second participant, and no backend are required to experience it.

Real two-person WebRTC sessions and a persistent backend are the next phase — see [`HANDOFF.md`](./HANDOFF.md).

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **React 19**, client-side state via `useReducer` (no external state library needed for the demo)
- Deployed on **Vercel**

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other routes:
- `/studio` — a small internal tool for recording placeholder participant video clips with your webcam (optional; see [`DESIGN.md`](./DESIGN.md#8-assets-the-applicant-may-want-to-record-studio)). Not linked from the main nav.
- `/session`, `/dashboard` — scaffolds reserved for the real WebRTC session and backend-connected researcher dashboard described in `HANDOFF.md`.

## Project structure

```
src/
  app/
    page.tsx              # the case study (single page)
    layout.tsx
    globals.css            # design tokens + Tailwind v4 theme
    studio/page.tsx         # recording tool
    session/page.tsx        # backend-phase scaffold
    dashboard/page.tsx       # backend-phase scaffold
  components/
    nav/                    # sticky site nav
    hero/                   # hero + annotated mockup
    workflow/               # Configure / Interact / Analyze steps
    demo/                   # the interactive simulated demo (see below)
    data/                   # sample data table + export section
    architecture/           # architecture diagram + decision cards
    research/               # "designed as a research prototype" section
    closing/                # final summary + CTAs
    ui/                     # shared button/badge/card primitives
  lib/
    demo/
      types.ts              # DemoState, DemoEvent, Card, etc.
      reducer.ts             # the demo's state machine
      cards.ts                # generated abstract card deck + overlap logic
      export.ts               # CSV/JSON serialization
DESIGN.md                    # product + visual design spec
HANDOFF.md                    # brief for the engineer building the real backend
```

## Documentation

- [`DESIGN.md`](./DESIGN.md) — why the site is shaped this way, the visual design system, and the full functional spec for the interactive demo.
- [`HANDOFF.md`](./HANDOFF.md) — what's built, what isn't, and the concrete next steps for wiring up real WebRTC sessions and a persistent backend.

## Scripts

```bash
npm run dev      # local dev server
npm run build    # production build
npm run start    # run production build locally
npm run lint     # eslint
```

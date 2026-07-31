# DyadLab

A working portfolio prototype for studying how two people communicate, search, and coordinate in a virtual environment.

DyadLab was built by Vladimir Hegai for Queen's University Work Study posting **FW26Q027 / 162480 — Programmer for projects focused on virtual interactions** with the QuAD Lab. It turns the LATTE project brief into a browser experience with researcher controls, real peer-to-peer audio/video, a collaborative attention task, and structured research-data export.

Live site: [dyad-lab.vercel.app](https://dyad-lab.vercel.app/)

## What is included

- **Homepage (`/`)** — concise case study, architecture, research basis, and data-quality decisions.
- **Bot demo (`/spotlight-sync`)** — permission-free Spotlight Sync with a simulated partner and path replay.
- **Researcher dashboard (`/dashboard`)** — creates expiring sessions and role-specific private invitations.
- **Participant session (`/session`)** — real WebRTC audio/video, researcher-controlled video conditions, and live Spotlight Sync.
- **FastAPI service (`backend/`)** — authenticated signaling, server-authoritative task state, SQLite persistence, and CSV/JSON export.

The bot never displays its private clue. In both the demo and live task, each participant receives only their own clue; the target and both clues are available only to the authenticated researcher view.

## Local development

Requirements: Node.js 20+, Python 3.13+, and Chromium for the end-to-end test.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.lock
npm install
Copy-Item .env.example .env.local
```

Start the backend:

```powershell
python -m uvicorn backend.app.main:app --reload --port 8000
```

Start Next.js in another terminal:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```powershell
npm run lint
npm run build
npm run test:backend
npx playwright install chromium
npm run test:e2e
```

The browser test uses three isolated contexts: one researcher and two participants. It establishes WebRTC, applies every video condition, completes all six rounds, checks participant clue privacy, verifies authenticated export, and tests joining without camera or microphone.

## Data and security model

- Session creation returns separate random credentials for the researcher, P01, and P02; only hashes are stored.
- REST snapshots and exports require the matching credential. Participant snapshots are redacted server-side.
- WebSockets validate credentials and browser origins, reject duplicate participant claims, rate-limit messages, and cap message size.
- Session events use schema version 2 with per-session sequence numbers, monotonic elapsed milliseconds, UTC timestamps, round numbers, actors, and structured JSON payloads.
- Spotlight positions are persisted at 10 Hz while a round is active. Audio and video remain peer-to-peer and are never recorded.
- Sessions expire after 24 hours by default and can be deleted immediately from the researcher dashboard.

See [SECURITY.md](SECURITY.md) and [DEPLOYMENT.md](DEPLOYMENT.md) before publishing.

## Research scope

This is a research-software prototype, not a validated study platform. A real study still requires institutional security and privacy review, research ethics approval, validated task parameters, consent language, accessibility review with target participants, and an approved recording/storage policy.

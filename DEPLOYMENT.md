# Deployment

DyadLab uses two services:

- Next.js frontend on Vercel or another HTTPS Node host.
- FastAPI/WebSocket backend from `backend/Dockerfile` with a persistent `/data` disk.

## 1. Deploy the backend

`render.yaml` is a Render Blueprint for the API. During setup, provide:

- `DYADLAB_ALLOWED_ORIGINS=https://dyad-lab.vercel.app`
- `DYADLAB_DATABASE_PATH=/data/dyadlab.db`
- `DYADLAB_SESSION_TTL_HOURS=24`
- `DYADLAB_CREATE_RATE_LIMIT=12`

Use exactly one Uvicorn worker. Live session state is held in the process while durable events are stored in SQLite; multiple workers would split connected participants across isolated runtimes. A future multi-instance deployment should move presence/task state and pub/sub to a shared service.

Verify:

```text
GET https://YOUR-API.example/health
{"status":"ok","version":"2"}
```

## 2. Configure TURN

Public STUN is included for ordinary networks. Reliable cross-network WebRTC requires a TURN relay.

Set these frontend build variables:

- `NEXT_PUBLIC_TURN_URLS=turn:turn.example:3478,turns:turn.example:5349`
- `NEXT_PUBLIC_TURN_USERNAME=...`
- `NEXT_PUBLIC_TURN_CREDENTIAL=...`

Use provider-issued time-limited credentials and rotate them. These values are delivered to browsers by design; they are relay authorization, not server secrets.

## 3. Deploy the frontend

Set:

- `NEXT_PUBLIC_SIGNALING_URL=https://YOUR-API.example`
- `NEXT_PUBLIC_GITHUB_REPO_URL=https://github.com/vladimirhegai/DyadLab`
- the three TURN variables above

The signaling URL is incorporated into the production Content Security Policy at build time, so rebuild after changing it.

## 4. Release gate

Run from the repository root:

```powershell
npm ci
pip install -r backend/requirements.lock
npm run lint
npm run build
npm run test:backend
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

Then perform a two-device call on separate networks. Confirm camera/microphone fallback, every video condition, all six rounds, researcher export, manual deletion, and an expired invitation.

## Operational notes

- Keep the backend database on the persistent disk and back it up only under an approved research-data policy.
- Restrict backend CORS/Origin values to exact production frontend origins.
- Do not log query strings at the edge or application proxy because invitation credentials are in URLs.
- Cold starts are handled in the dashboard with a 45-second timeout and an explanatory status.
- The site is a prototype until the institutional and research approvals in `SECURITY.md` are complete.

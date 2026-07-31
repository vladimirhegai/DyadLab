# Security

## Implemented controls

- Researcher, P01, and P02 receive separate 256-bit URL-safe credentials; only SHA-256 hashes are stored.
- REST snapshots require both a credential and an explicit role. Participant snapshots are redacted before serialization.
- Event lists, exports, and deletion require the researcher credential.
- WebSockets validate the credential, role, participant, and browser `Origin`.
- Duplicate participant-role connections are rejected.
- Session creation and WebSocket messages are rate-limited; messages larger than 64 KiB are rejected.
- Frontend and backend responses set no-referrer, no-sniff, frame-denial, and no-store protections. The frontend also sets a restrictive CSP and camera/microphone permissions policy.
- Sessions expire after 24 hours by default and can be deleted immediately by the researcher.
- Audio/video stays peer-to-peer and is not recorded or stored.

Credentials are carried in invitation URLs because browsers cannot attach an authorization header to a native WebSocket handshake. Production must use HTTPS/WSS. `Referrer-Policy: no-referrer` limits accidental URL disclosure, but invitation links should still be treated as secrets and shared only with their intended recipient.

## Dependency review

As of 2026-07-31:

- `npm audit --omit=dev` reports **0 vulnerabilities**.
- The pinned PostCSS and Sharp overrides remove the production advisories inherited through Next.js 16.2.12 while the application waits for a patched Next.js release.
- A full `npm audit` still reports nine development-only findings through ESLint's `minimatch` tree. The vulnerable behavior is not bundled into or reachable from the deployed application. Forcing ESLint 10 is intentionally deferred until `eslint-config-next` supports that upgrade without a compatibility regression.
- Python production and test dependencies are exact-pinned in `backend/requirements.lock`.

Re-run both audits before each release:

```powershell
npm audit --omit=dev
npm audit
.\.venv\Scripts\python.exe -m pip check
```

## Study deployment checklist

Before collecting real participant data, complete an institutional threat/privacy review, ethics approval, retention-policy approval, accessibility review, and TURN credential-abuse review. This repository deliberately contains no participant identity fields, consent workflow, or media recorder.

Report security concerns privately to the repository owner rather than opening a public issue with credentials or participant data.

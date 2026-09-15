# SPEC-M63 · Page 3 — Data, offline, security

## §1 Offline model (outbox, not sync engine)

Chosen because the failure modes are simple and bounded: scans and decisions
happen in short bursts; the server stays the only writer.

- **Outbox** (IndexedDB): every mutating action is appended with
  `{ id, kind, payload, idempotencyKey, createdAt, attempts, state }`.
  `kind` is a closed set: `scan.action`, `decision.approve`,
  `decision.reject`, `label.request`, `chat.message` (chat is online-only;
  queued chat shows "waiting for network").
- **Replay**: on `online` + app foreground, drain in FIFO order with
  exponential backoff; server idempotency keys (M41 pattern) make replays
  safe. Conflict responses (M61 drift/expiry/rights) surface on the card —
  never silently dropped.
- **Entity cache**: codes → `{ type, code, label, minimal fields, updatedAt }`
  (LRU, 7 days, ≤5 MB). Resolution is cache-first, network-second, then
  queued-query. This is what makes scanning work in the far godown.
- **Shell cache**: service worker precaches the app shell + icons; API
  GETs are network-first with cache fallback for the small allowlist
  (home counters, WIP board, pending decisions).
- **No local writes to business data outside the outbox.** No shadow database.

## §2 Conflict rules (explicit, per kind)

| Kind | Conflict | Resolution |
|---|---|---|
| scan.action (start/finish) | Another operator finished the bundle first | Reject the finish, show "BND-431 was finished by Ravi at 10:42", offer start-next |
| scan.action (issue/consume) | Roll balance moved (over-consume) | Reject, show current balance, re-plan |
| decision.approve | Plan drifted / expired / decided elsewhere (M61) | Show the fresh plan or the decided-by card; require a new tap |
| decision.reject | Already expired | Inform; no-op |
| label.request | Printer offline | Keep in queue, show attempt count, allow cancel |

Every resolution is user-visible. There is no "last write wins" on the floor.

## §3 Auth & session

- Same `fo_session` cookie; PWA install keeps the cookie jar, so login
  persists. 7-day TTL (existing) + "trust this device 30 days" (new: a
  rotating signed cookie bound to the device id; revocation via the existing
  sign-out-all + tokenVersion bump).
- **PIN mode details**: `Device` row `{ id, name, userId, pinHash,
  lastSeenAt, active }`; PIN = 4–6 digits hashed with the same scrypt stack as
  passwords; 5 fails/15 min locks that device (M60 arithmetic); switching user
  requires the new user's PIN; the session token is still the real auth — PIN
  is a convenience unlock, not a second auth system.
- Step-up (re-enter password or biometric) for: money-class approvals, user
  admin, label reprint of cartons (anti-fraud), permission changes.

## §4 Permissions (no second system)

- The M61 E-10 model is the single authority: tool/manifest narrowing,
  dispatch re-check, approve re-check. Mobile screens call the same APIs and
  render the same denials ("Your role doesn't include …").
- Home tiles, panels, and scan actions derive from effective permissions; the
  mobile client never decides access locally (it may *hide* for UX, but the
  server enforces).
- Owner decision needed (Page 4 §7): does the floor get a stripped
  "operator" role (scan + own entries only) in wave 1?

## §5 PII & data safety

- Cached entity data excludes PII by default (no employee salary, no
  customer contacts in the cache). Employee **names** appear on scan panels
  only where the job needs them (supervisor view) and are rights-gated.
- Aadhaar/payslip fields never render on mobile screens.
- Device loss: admin clears the device row (invalidates trust cookie); PIN
  hash is useless without the session.
- No secrets in IndexedDB; label payloads carry codes only (M62 §3.2).

## §6 Push & background

- Web Push subscription stored per user+device; server sends on: approval
  assigned, plan expiring soon (M61), WIP aging alert, low-stock, gate event.
- Android: full support including background. iOS: only when installed to
  home screen; the app must not depend on push for correctness (in-app inbox
  is the source of truth).
- Background Sync where available triggers the outbox drain; otherwise drain
  on foreground + a 60s interval while open.

## §7 Telemetry

- Client events: scan success/failure (decoder used, lighting guess),
  time-to-first-scan, outbox depth, replay failures, screen latency; batched
  to `/api/telemetry` (new, session-guarded, append-only small rows).
- This is the mobile half of M61 E-9: the team should be able to answer
  "scans are failing on Redmi 9A at the dyeing gate" from data.

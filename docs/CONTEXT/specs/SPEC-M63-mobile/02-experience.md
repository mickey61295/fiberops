# SPEC-M63 · Page 2 — Experience (screen by screen)

Notation: **R** = reuse existing component/API as-is; **A** = adapt
(responsive variant); **N** = new screen.

## §1 Login & device trust (N, reuses M60 auth)

- Email + password (existing `/login` API), then optional "trust this device"
  (30 days) so floor users do not re-type passwords every shift.
- **PIN mode** (shared devices): first login sets a 4–6 digit device PIN bound
  to that user on that device; subsequent use = PIN only. PIN attempts are
  rate-limited (5/15 min → lock, M60 arithmetic reused). "Switch user" always
  visible; auto-lock 60s idle; one active user per device session.
- Sessions list + sign-out-all (M60/M57) on the profile screen.

## §2 Home (N shell, A tiles)

Role-driven, four zones:

1. **Scan button** (full-width, bottom-thumb reach) — the primary action.
2. **My work today** — role-specific counters from existing reads: cutting
   master (bundles to print, rolls to issue), supervisor (WIP at my line,
   aging alerts), storekeeper (pending GRN/putaway/transfers), merchandiser
   (orders awaiting approval, buyer answers), accountant/owner (money
   approvals pending).
3. **Waiting for you** — the M61 pending-decisions count, tappable.
4. **Quick tiles** — role-filtered shortcuts: WIP board, labels, stock,
   approvals, chat, registers, print.

Home is the PWA start URL; cold start ≤ 2s on a mid-range Android with shell
cached.

## §3 Scan (N — the M62 `/scan` surface, mobile-first)

- Full-screen camera, torch toggle, scan-line, haptic + chime on success
  (Web Audio), code shown large with the entity name.
- Resolves offline from the entity cache; unknown/offline-unknown shows
  "queued for check" and files a query event.
- Routed panels (M62 §8): **bundle** (stage trail, start/finish, operator),
  **roll** (balance, movements, used-in orders, issue/consume), **carton**
  (contents, pack/despatch), **location** (what's here, putaway/pick),
  **doc** (view + gate closure).
- Actions are permission-checked (M61 E-10) and plan-first where they write:
  the panel shows the same approve/reject card language as the web panel.

## §4 Work — WIP & operations (A of the existing tracker)

- Mobile WIP board: per stage bundle counts, aging colors (>2× expected),
  and one-tap drill into stuck bundles.
- Operator loop: scan → start → scan/finish (or single-button "Finish" with
  the current timer) → next. Piece counts and timers come from the scan
  events (M62), not manual entry.
- Supervisor actions: reassign bundle, flag quality, mark machine down
  (writes an event; downtime reason list from existing masters).

## §5 Agent chat (A — the existing panel, mobile shell)

- Same SSE loop and M61 decision lifecycle; chat opens as a full-screen route,
  keyboard-safe, voice input (ta-IN/en-IN, M24), attachments (camera → upload
  API), markdown rendering reused.
- The "Waiting for you" stack from M61 renders above the composer; typing
  approvals obey the M61 phrase guard.
- Photo-first entry: camera → attach → "ingest this" — the mobile twin of the
  paperclip flow.

## §6 Approvals (N stack, reuses M61 APIs/copy)

- A vertical card stack: amount/impact line, warnings, "Approve & Commit" /
  "Reject" with reason; bulk packets show "Approve all N".
- Offline: decisions queue (approve/reject with idempotency keys); on sync the
  server's drift/expiry checks still apply and the card updates honestly.
- Push-notification tap opens directly on the card (Android; iOS best-effort).
- Biometric re-auth (WebAuthn platform authenticator) for money-class
  approvals — optional, wave 3; fallback is password re-entry.

## §7 Print (N, reuses M62 label APIs)

- Label jobs: pick entity (bundle manifest, roll tag, carton, location),
  preview, choose printer target: **server queue** (LAN printer via a future
  print agent) or **share sheet** (PDF/SVG to a printer app) in wave 2.
- Reprints are logged (who reprinted what) — label duplication is a real
  fraud/error vector.
- A4 sticker sheets as the no-hardware pilot path (M62 §4).

## §8 Notifications (N surface, L push)

- In-app inbox first (no dependency on push): approvals pending, aging WIP,
  low stock, expiring plans, gate events.
- Web Push (Android full; iOS only when installed) with a per-user switch;
  the copy is action-shaped ("7 bundles waiting at side-seam"), never noisy.
- Digest surface (existing M13) gains a mobile card layout.

## §9 Profile & account (A of M57)

- Name/phone, password change, sessions (M60), PIN management, language/voice,
  notification preferences, "my permissions" card (M61/accounts-roles).

## §10 Admin lite (A, wave 3)

- User lookup + deactivate + password reset (M60 admin doors),
  pending-approvals view by user, label reprint log. Full admin stays desktop.

## §11 Screen inventory & reuse map

| # | Screen | Type | Reuses |
|---|---|---|---|
| 1 | Login / PIN | N | M60 APIs |
| 2 | Home | N | existing read tools/APIs |
| 3 | Scan | N | M62 APIs |
| 4 | Bundle panel | N | M62, post_production_entry |
| 5 | Roll panel | N | M62 |
| 6 | Carton panel | N | M62 |
| 7 | Location panel | N | M62 |
| 8 | WIP board | A | live tracker services |
| 9 | Chat | A | /api/agent SSE, M61 |
| 10 | Approvals stack | N | M61 APIs/copy |
| 11 | Print | N | M62 label APIs |
| 12 | Notifications | N | M13 digest + new events |
| 13 | Profile | A | M57 |
| 14 | Admin lite | A | M60 admin APIs |

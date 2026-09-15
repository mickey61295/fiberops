# SPEC-M63 · Page 4 — Delivery

## §1 Waves

| Wave | Ships | Depends on | Exit criteria |
|---|---|---|---|
| **M1 — Scan & Print on the phone** | Login/PIN, Home (scan + tiles), Scan + bundle/roll panels, Print (A4 + server queue request), installable manifest + shell cache | M62 Q1 (bundle labels/scan APIs) | A supervisor can scan a bundle, start/finish it, and print a label order — on a mid-range Android, over factory Wi-Fi |
| **M2 — Approvals & notifications** | Waiting-for-you stack, approve/reject (online + queued), step-up re-auth, in-app inbox, Web Push (Android) | M61 H1–H3 | A plan created on desktop is approved from a phone; a decision made offline syncs once and is audited |
| **M3 — WIP board & chat** | Mobile WIP board with aging, chat full-screen with voice/photo, notifications for aging WIP | M62 Q1 Q2 | Supervisor runs the floor day from the phone; chat works with camera attachments |
| **M4 — Offline hardening & admin lite** | Full outbox for scans/decisions, conflict UIs, device admin, PIN fleet, telemetry dashboard, optional biometric step-up | M1–M3, M60 | Two hours offline at the gate loses zero data; conflicts explain themselves |

Native shell (Expo) is a named candidate only if M4 telemetry shows BLE
printing or iOS push as a hard requirement.

## §2 Test matrix

| Layer | What | Where |
|---|---|---|
| Unit | outbox state machine (enqueue/replay/backoff/conflict), PIN hashing + lockout, payload routing | `tests/unit/mobile-outbox.test.ts`, `mobile-pin.test.ts` |
| Pipeline | scan → start/finish → projection; queued approve replay idempotency; drift-on-replay surfaces; rights denial | `tests/pipeline/mobile-flows.test.ts` |
| E2E | Playwright mobile viewport (Pixel 5): login, PIN switch, scan by manual code, approve, offline simulate (route abort) then replay | `tests/e2e/10-mobile.spec.ts` |
| Device manual | Real devices: Redmi-class Android, OnePlus, iPhone (Safari, installed), shared tablet; checklist per screen | `docs/MANUAL-TESTING.md` mobile section |
| Performance | Cold start ≤2s (cached), scan-to-panel ≤600ms cached / ≤1.5s online, outbox drain 50 items ≤10s | Lighthouse + manual |

## §3 Gates

- vitest full + tsc 0 + context_check counters (new routes/models).
- PWA audit: manifest, install prompt, offline shell (Lighthouse PWA ≥90 on
  the pilot build).
- `/api/telemetry` route smoke; no PII in logged payloads (test asserts).
- Manual device checklist green on Android + iOS for M2.
- Route smoke for new mobile routes.

## §4 Rollout

1. **Pilot group**: owner + one merchandiser + one storekeeper + one line
   supervisor (the M62 BPL pilot line). Two weeks, daily check-in.
2. **Cutting room first** (labels + rolls), then **store** (locations/gate),
   then **supervisors** (WIP), then **merchandisers/owner** (approvals).
3. Install via QR from the login page (a QR that opens the app URL); printed
   3-step card in Tamil + English at each station.
4. Feedback loop: in-app "Report a problem" writes a support row with device +
   screen + last action; weekly triage into fixes.

## §5 Metrics

Product: scans/day, first-scan success %, WIP aging incidents acted on,
approval time-to-decision, offline replay failures, label reprints per 100
labels, crash-free sessions (proxy: unhandled error events).

Business: WIP days, pieces per operator per day (existing), time from
despatch scan to invoice, dispute count on piece-rate.

## §6 Reuse checklist (build discipline)

- No new auth, no new permissions, no new print engine, no new QR encoder.
- Every mobile screen maps to an existing API first; new endpoints only for
  mobile-specific needs (telemetry, device/PIN).
- Copy comes from the M61 copy module; no mobile-only strings outside it.

## §7 Open decisions (owner)

1. **Operator role**: create a stripped mobile role (scan + own entries) in M1,
   or let existing roles use their full rights on mobile?
2. **PIN in wave 1** or wave 4? (Recommended wave 1 for the pilot cutting
   table, since shared-device discipline is the main failure risk.)
3. **Bluetooth printing**: buy one BLE printer for the pilot to test the
   share-sheet path, or server queue only (postpone hardware)?
4. **iOS priority**: are owners on iPhones the wave-2 approval users (needs
   install-to-home-screen guidance), or Android-first only?
5. **Biometric step-up**: web (WebAuthn platform authenticator) or defer?
6. **Telemetry server**: small `/api/telemetry` in-app table, or reuse the
   M61 structured logs only?

## §8 Deferred (named)

- Expo/React Native shell (trigger: BLE printing mandatory, iOS background
  sync, or app-store distribution).
- Offline chat (queued messages) — chat stays online-first by design.
- Photo attachments on scan events (defect evidence) — wave 3 candidate.
- Gesture/voice-only operator mode.
- Multi-tenant/branch scoping.

---

## §9 Revision 2 — self-audit gaps closed

**R2-1. Service worker lifecycle.** Versioned cache names; on activate, purge
old caches; on new SW found, show "Update ready — reload" (never force-reload
mid-entry); a build stamp (`NEXT_PUBLIC_BUILD`) rendered in Profile so support
can ask "what version?". Offline users stay on the old shell until reconnect;
the outbox format carries a `schemaVersion` so an old shell cannot replay into
a newer API incompatibly (mismatch → park the item + visible "needs update").

**R2-2. Camera permission & platform decoder matrix.** Explicit states:
prompt-needed, granted, denied (with "open settings" instructions per OS),
no-camera (scan-gun/manual only). Platform table: Android Chrome =
BarcodeDetector → jsQR → ZXing; Android WebView/other = jsQR → ZXing; iOS
Safari 17+ = jsQR (getUserMedia) → manual; requires HTTPS (dev exception
localhost). Torch only where `track.getCapabilities().torch` exists.

**R2-3. PIN offline semantics.** PIN unlock is verified **locally** against
the stored hash (so it works offline) with a local attempt counter; server
lockout (M60) is re-checked on the next online sync and can revoke the device
trust cookie. Local fail threshold = 5 with exponential delay; a wrong PIN
never destroys the session (only unlocks are blocked). Device wipe/reinstall
clears the PIN (re-login required) — accepted.

**R2-4. Outbox limits & expiry.** Cap 500 items / 5 MB (oldest-first evict
with a report row). Per-kind max age: scans 48h, decisions 24h (mirror M61
expiry), label requests 24h, chat never queued. Backoff 2s→5m cap; after 10
attempts park + notify. Every drop is a visible "Not synced" list, never
silent.

**R2-5. Push infrastructure.** Own it end-to-end: VAPID keypair generated at
setup; `PushSubscription { userId, endpoint, keys, deviceId, createdAt }`;
the existing cron door (`/api/cron/digest`) sends pushes for pending
approvals/aging WIP; payload copy from the M61 copy module; every push has an
in-app twin (inbox is the source of truth). Not config-dependent — code.

**R2-6. Deep-link routing table.** `scan?c=…`→Scan panel, `/approvals/:turnId`
→card, `/chat`→composer, `/wip`→board, `/print/:kind`→print hub, `/notify`→
inbox. Notifications carry `route` + `turnId`; taps that lack a session land
on login and resume the route after auth (`next=`).

**R2-7. Kiosk reality.** A PWA cannot lock a device. Named options: (a)
auto-lock 60s + "Switch user" (default), (b) Android **dedicated device /
screen pinning** configuration for shared tablets (documented per device),
(c) later MDM. The app never claims kiosk security it doesn't have.

**R2-8. Accessibility baseline.** WCAG 2.2 AA target: text scaling to 200%
without loss, contrast ≥4.5:1, TalkBack/VoiceOver labels on scan results and
approval cards, no color-only status (aging badges pair color + text), 48px
targets, one-handed reach for primary actions. A screen-reader pass is part
of the M2 exit criteria.

**R2-9. Client error capture.** `window.onerror` + unhandled rejection hook
sends `{message, screen, build, device, lastAction}` to `/api/telemetry`
(no PII); telemetry rows are sampled 100% errors / 10% events; Profile shows
"Report a problem" prefilled with the last action.

**R2-10. Print UX (aligned with M62 R2-7).** Printer picker lists LAN targets
from the `PrintJob` queue plus "Save/Share PDF"; each job shows
queued/sent/failed with retry; reprints require step-up for cartons. M63 wave
2 consumes M62's PrintJob contract — one design, no duplication.

**R2-11. Home tile configuration source.** Tiles derive from the menu registry
(role → permitted items) plus a small `mobileTiles` override list per role in
code; no new admin config surface in wave 1 (owner decision 7).

**R2-12. Data budgets & low-network behavior.** Budgets: first load ≤ 300 KB
JS gzip for the mobile shell (route-level code splitting), scan panel ≤ 20 KB
payload, WIP board ≤ 50 KB. On 2G/slow: skeleton states, no images, cache-first
entity resolution, paged lists (50). Lighthouse mobile budget test in the gate.

**R2-13. Release management.** Distinguish three versions: SW shell build,
API schema (`schemaVersion`), and copy module. Compatibility rule: shell may
lag the server by one minor release; the OTA update prompt appears when the
server advertises a newer build. No forced updates; no silent API breaks
(server keeps `deprecated` fields for one release).


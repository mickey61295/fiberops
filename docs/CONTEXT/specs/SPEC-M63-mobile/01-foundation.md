# SPEC-M63 · Page 1 — Foundation

## §1 Vision

The floor is the interface. In Tirupur, the cutting master, line supervisor,
and storekeeper carry Android phones, not laptops. Today FiberOps is usable
on their phones but not designed for them: the chat is the only mobile-shaped
surface; registers are wide tables; there is no scanner; approvals depend on
a tab staying open.

Target: **the three-second loop** — scan a bundle/roll/carton, see the entity
panel, act (start/finish/issue/receive/approve), done. The agent stays the
brains; mobile is the hands.

Personas and their primary jobs:

| Persona | Device reality | Mobile jobs |
|---|---|---|
| Cutting master | Android phone, shared | print/attach bundle labels, issue fabric rolls, cut entry |
| Line supervisor | Android phone, own | WIP board, scan operations, reassign, alerts |
| Storekeeper | Android phone + maybe a shared tablet | stock scans, location putaway/pick, gate, GRN |
| Merchandiser | iPhone/Android, own | approvals, order status, agent chat, buyer answers |
| Accountant | iPhone/Android | approvals (money), ledger lookups |
| Owner | iPhone | approvals, alerts, trust summary |

## §2 Product principles

1. **Scan-first, not chat-first.** Home is a scanner + role tiles; chat is one
   tap away (M61 decisions surface).
2. **Never block the floor on network.** Scans and decisions queue offline and
   sync; every queued write carries an idempotency key (M41 pattern).
3. **One-handed, glove-friendly.** Bottom-anchored primary actions, ≥48px
   targets, high contrast, big numerals; no hover-only affordances.
4. **The phone is also the printer's remote.** Label print requests from the
   phone; the printer may be Bluetooth (wave 2) or a server-side print queue.
5. **Nothing new to learn.** Same terms, same cards, same approvals as the
   web panel (`§2.6` copy deck of M61).

## §3 Tech decision — PWA now, native later (evidence)

| Factor | PWA (chosen) | React Native (deferred) |
|---|---|---|
| Camera QR scanning | Works on Android Chrome + iOS Safari (simple scan case is explicitly browser-safe) | Better control, but not required for QR |
| Offline | Service worker + IndexedDB + outbox — sufficient for scan/approve queues | SQLite/WatermelonDB stronger for heavy offline, not needed at this volume |
| Push | Android full; iOS only after "Add to Home Screen" (documented limitation) | Full on both |
| Bluetooth printing | Android Chrome can do BLE; iOS limited → wave-2 design uses a server print queue instead | Full |
| Distribution | URL/home-screen; no store review; instant updates | Two stores, reviews, signing |
| Team fit | The entire team is Next.js/React; zero new toolchain | New toolchain, native module maintenance |
| Verdict | **Wave 1–3** | **Only if** Bluetooth printing becomes mandatory on iOS or true background sync is needed |

Research basis: manufacturing PWA precedents (offline IndexedDB + replay queue
for Odoo shop floor), PWA-vs-RN decision literature 2026 (PWA when mobile is
an access channel; RN when the device itself is the product), iOS PWA
limitations as the known risk. **Android-first**: shop-floor devices are
Android; iOS is supported but treated as "good-enough" (approvals, chat,
scan), not the kiosk.

## §4 Architecture

```
┌─────────────────────── phone (installable PWA) ───────────────────────┐
│  App shell (Next.js, same repo, mobile routes/screens)                │
│   ├─ Scan engine (BarcodeDetector → jsQR → ZXing, manual fallback)     │
│   ├─ IndexedDB: entity cache (codes), outbox queue, preferences        │
│   ├─ Service worker: shell cache, background sync trigger              │
│   └─ Screens (Page 2)                                                  │
└──────────────┬─────────────────────────────────────────────────────────┘
               │ HTTPS (session cookie; PIN unlock for shared devices)
┌──────────────▼─────────────────────────────────────────────────────────┐
│  Existing Next.js server                                              │
│   ├─ M62 scan/labels APIs (resolve, scan, labels, trace)              │
│   ├─ M61 decisions APIs (pending, approve, reject)                    │
│   ├─ Agent SSE (/api/agent) — unchanged                               │
│   └─ Print queue: label jobs for LAN/Bluetooth-dispatched printers    │
└────────────────────────────────────────────────────────────────────────┘
```

- No separate backend, no sync server. The outbox replays the **same**
  authenticated REST calls the web app makes; the server stays the only writer.
- Mobile routes share components with desktop where honest (cards, tables →
  responsive list variants) and use dedicated mobile screens where layout
  demands it (Scan, WIP board, approval stack).
- `manifest.webmanifest` + icons + `display: standalone`; installed from the
  login page ("Add to Home screen" prompt with 3-step graphic, en/ta).

## §5 Device & environment constraints

| Constraint | Design response |
|---|---|
| Mixed Android versions (₹8–15k phones) | Test on a Redmi-class device; decode stack falls back automatically; no WebGL dependencies |
| Flaky factory Wi-Fi | Outbox + cache-first resolution; scans never wait on network |
| Shared devices (cutting table, gate) | PIN fast-switch (Page 3 §4); one active session per user; auto-lock 60s |
| Gloves, dust, bright light | Big targets, high contrast, scan-line guidance, torch toggle |
| No email infrastructure | Account recovery stays admin-driven (M60 password admin) |
| Language | English first; voice ta-IN exists; copy module (M61) keeps strings swap-ready |

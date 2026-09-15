# SPEC-M63 — Mobile App (multi-page)

Date: 2026-09-14 · Status: DRAFT (owner review) · Milestone M63
Depends: SPEC-M62 (QR/traceability — the Scan page's data layer), SPEC-M61
(agent harness — approvals/decisions API), M60 (sessions/lockout), M24
(voice en-IN/ta-IN), existing print system.

This spec is deliberately **multi-page** because the mobile surface touches
every subsystem of a complex ERP. Read in order:

| Page | File | Contains |
|---|---|---|
| 1 | `01-foundation.md` | Vision, tech decision (PWA now), architecture, devices |
| 2 | `02-experience.md` | Every screen, role by role, with reuse map |
| 3 | `03-data-offline-security.md` | Offline queue, conflicts, auth/PIN, permissions, PII |
| 4 | `04-delivery.md` | Waves, test matrix, gates, rollout, metrics, decisions |
| — | `00-INDEX.md` | This file |

## Why mobile, in one paragraph

The ERP's daily users are not at desks: the cutting master, line supervisor,
storekeeper, and merchandiser move between machines, godowns, and the office.
The web app works on a phone browser today, but three workflows are broken on
a phone: scanning (no `/scan` surface yet — M62 builds it), approving (the
chat panel is desktop-width and decisions die with the tab — M61 fixes the
data, this app surfaces it), and photo/voice-first entry. A mobile app makes
the existing agent-first design actually usable on the floor: scan → the
agent proposes → approve on the phone → done.

## The one-sentence architecture

A **Next.js PWA** (same codebase, same APIs, installable from the browser)
with an **offline outbox**, the **M62 scan layer**, the **M61 decisions API**,
and a **PIN fast-switch** mode for shared shop-floor devices — with a native
shell (Expo) explicitly deferred until a proven need (Bluetooth printing,
background sync, iOS push) justifies it.

## What this is NOT

- Not a rewrite of the ERP or the agent harness.
- Not an app-store product for customers (internal staff tool).
- Not a native app in wave 1 (decision evidence in Page 1 §3).
- Not a second authorization system: it reuses M61 E-10 permissions.

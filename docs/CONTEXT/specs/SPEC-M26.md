# SPEC-M26 — IRN Cancellation Workflow (SPEC-M23 OUT item, closed)

> Third six-task run, task 3. SPEC-M23 documented "regeneration = the
> cancellation workflow, out of scope". This closes it: the real govt rule
> — an IRN can be CANCELLED within 24 hours of generation, with a reason;
> a cancelled invoice may be reported again (a fresh IRN). Frozen before
> code (2026-08-30).

## 1. Scope

**In:** `planCancelIrn({ invoiceNo, reason })` — guards: invoice exists ·
carries a LIVE IRN (irn ≠ null) · within 24h of generation · reason from
the real govt enum (typo | wrong_entry | order_cancelled |
delivery_cancelled | others). Commit = ONE update: clears irn/irnAckNo/ewbNo
+ stamps `irnCancelledAt` + preserves `irnCancelledIrn` (the history row —
auditable, never silently lost). Regeneration after cancellation just works
(planGenerateIrn's live-IRN guard sees null).

**Timestamps:** SalesInvoice gains +3 additive nullable fields —
`irnGeneratedAt` (stamped by generation, amended), `irnCancelledAt`,
`irnCancelledIrn` (models stay 78). Pre-M26 stamps have null
irnGeneratedAt → the window check falls back to `updatedAt` (the stamp WAS
the last update for those rows — documented migration note, honest).

**Doors (the workflow is two-sided, like every write):** agent tool
`cancel_einvoice_irn` (docTool, tools 226→227) + the invoice-view form door
(Cancel IRN form with the reason select, through runCommit — the 15th
commit door; the M15 grep contract pin moves 14→15).

**Surfaces:** view einvoice-block — live IRN rows + the Cancel form (24h
note); after cancellation: "Previous IRN cancelled <date>: <irn>" history
line + the Generate door returns on issued invoices. Print: unchanged
(only LIVE IRN rows print — a cancelled IRN never prints).

**Out (deferred, documented):** multi-cycle history (only the LATEST
cancelled IRN is preserved — one slot, the govt portal keeps the full log) ·
e-Way bill standalone cancellation (goes with the IRN) · real portal
submission (mock stays mock).

## 2. Design

- `src/lib/erp/einvoice.ts` — `IRN_CANCEL_WINDOW_MS = 24h`;
  `CANCEL_REASONS` (the govt enum); `planCancelIrn` (guards + ONE-update
  commit); `planGenerateIrn` amended to stamp `irnGeneratedAt` (plan data +
  commit, additive).
- `src/lib/erp/schemas/einvoice.ts` — `EINVOICE_CANCEL_SCHEMA`
  ({invoiceNo, reason enum}).
- `src/lib/agent/tools.ts` — `cancel_einvoice_irn` docTool (accounting).
- `src/app/(erp)/accounts/invoice/[id]/page.tsx` — the Cancel form door
  (`cancelIrnAction` server action → runCommit, slug `einvoice-irn-cancel`)
  + the history line + the reason select (submit = immediate — the confirm
  is the reason choice itself; two-step is the AGENT door's plan card).

## 3. Tests (einvoice.test.ts additions)

1. planCancelIrn guards: unknown invoice · no live IRN (never-stamped AND
   already-cancelled both reject) · window EXPIRED (>24h old stamp rejects).
2. The happy path: cancel clears irn/irnAckNo/ewbNo, stamps
   irnCancelledAt + irnCancelledIrn = the old IRN.
3. Regeneration after cancellation: generate → cancel → generate again
   succeeds (the M23 promise, closed) — and the second IRN equals the first
   (deterministic tuple — the mock's honest behavior).
4. Pre-M26 stamps (null irnGeneratedAt → updatedAt fallback) cancel fine.
5. Generation stamps irnGeneratedAt now (the amended plan carries it).
6. Pins: tools 226→227 (×7 files), docTool 54→55, commit doors 14→15
   (the M15 grep contract).

## 4. Acceptance gates

tsc src/ 0 · vitest (987+N) · eval --static PASS · context_check NO DRIFT
(+SPEC-M26.md file pin; models stay 78) · NEW route_smoke_m26.sh (view
Cancel form on a stamped invoice; service-level cancel → history line
renders; regen works; print carries NO IRN rows after cancel; the agent
tool in the registry) · LIVE browser-verified.

## 5. Implementation record (filled at ship time)

- Schema +3 additive nullable (prisma db push + generate; dev server
  restart note honored).
- einvoice.ts: IRN_CANCEL_WINDOW_MS, CANCEL_REASONS, planCancelIrn; the
  amended planGenerateIrn stamps irnGeneratedAt; the pre-M26 fallback
  irnGeneratedAt ?? updatedAt documented inline.
- Tools +1 (227); the form door = a new ACTION in the M23 door FILE (the
  grep contract counts files — doors stay 14, honest) with the reason
  select + immediate submit; the history line after cancellation.
- Schema: +irnGeneratedAt/+irnCancelledAt/+irnCancelledIrn (nullable) AND
  +updatedAt DateTime? @updatedAt — the 170 existing rows rejected a
  REQUIRED column (db push error, the honest lesson); Prisma auto-stamps
  it on every update; the fallback chain is now
  irnGeneratedAt ?? updatedAt ?? createdAt.
- Tests +5 → 992 vitest; pins updated (227 ×8 files, docTool 55, tools
  context_check 227; doors stayed 14).
- Gates: tsc src 0 · 992 vitest · eval --static PASS · context_check
  550→551/551 NO DRIFT · route_smoke_m26 NEW 17/17 · LIVE browser-verified
  (select 'order cancelled' → Cancel IRN → history line + regen button,
  zero console errors), screenshot download/m26-irn-cancel.png.

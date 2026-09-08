# SPEC-M56 — Money Batch 7: the cheque/PDC lifecycle (PAY-08, decision §17-3 resolved)

Status: committed spec (implementation target). Precedes the M56 feat commit.
Module: money integrity (remediation spec §7 Batch 4, the PAY-08 row that
M41 explicitly parked per §17-3). The owner's standing "continue" directive
(2026-09-08, after the four open decisions were surfaced in the queue report)
delegates the recommended default — ADR-020 records it: **full lifecycle now**.
Depends on: M40 (PAY-01/02 allocation truth + PAY-06 the CN- contra cancel
machinery), M51 (DE-01 bankAccountId + the GL cash-leg doctrine), M18 (§2-A2
the print Bank Details & Remittance strip), M52/M53 (the GL/export doctrine).
Three additive nullable columns on `Payment`; ZERO new models (92 stays 92).

## 0. Problem

Deep-dive §2.9 (P1): "no cheque date, PDC, clearing/bounced status, no
`bankAccountId` link. The BankAccount master is read by one list tool and
nothing else; the invoice print remit-to block reads static AppOptions
instead." M51 fixed the `bankAccountId` half (payments link the master + the
GL leg). What remains, exactly as the remediation spec §7 PAY-08 row pins it:

1. **The cheque is a mode, not a lifecycle.** A cheque-mode payment posts the
   bank GL leg at voucher time (the M51 doctrine — correct: the voucher IS
   the money-document), but the physical cheque's journey is untracked: no
   post date, no issued→cleared/bounced stamp, no register of cheques still
   out in the field. A PDC (post-dated cheque) is indistinguishable from a
   cleared one on sight.
2. **A bounced cheque has no honest door.** The money never arrived, yet the
   payment stands, allocations hold, the invoice reads settled. The M40
   cancel machinery (CN- contra + allocation reversal + status re-derivation)
   is EXACTLY the reversal — but nothing routes a bounce to it, and nothing
   records WHY.
3. **The remit-to strip still reads static AppOptions.** PAY-08's acceptance
   text: "BankAccount linked (the master stops being dead data; invoice
   remit-to reads it)". The master now feeds GL legs; the print strip
   (`getPrintHeader`) still prefers `print.bank*` AppOptions.

## 1. THE DECISION — ADR-020 (§17-3: full lifecycle now)

Recorded in 02-DECISIONS.md alongside this commit. The shape:

- **`chequeStatus` is a PHYSICAL layer, never a GL layer.** Values
  `null | 'issued' | 'cleared' | 'bounced'`, ONLY on `mode='cheque'`
  payments (other modes stay null — honest: only cheques journey). The bank
  GL leg posts at voucher time exactly as today (M51 doctrine unchanged);
  **clearing is a confirmation stamp** (no journal — the money moved once,
  at the voucher); **bouncing is the M40 cancel** (the CN- contra IS the
  reversal, allocations reverse, statuses re-derive) plus the stamp.
  `Payment.status` (active|cancelled) keeps its PAY-06 meaning —
  `chequeStatus` rides beside it, never overloads it.
- **The PDC register is a VIEW of issued cheques**, not a new document
  family: `mode='cheque'` AND `chequeStatus='issued'` AND `status='active'`.
  A PDC badge marks `chequeDate > payDate` (post-dated at creation). Aging
  runs off `chequeDate` (due today / overdue N d / due in N d).
- **No silent transitions**: clear/bounce doors guard loudly — non-cheque
  modes, already-cleared, already-bounced, cancelled payments, unknown
  vouchers all refuse with named guidance. A bounced cheque refuses a second
  bounce ("already reversed via CN-#### — see the cancel door").
- **Remit-to prefers the master**: `getPrintHeader` reads the first ACTIVE
  `BankAccount` (Bank joined for the name) before the `print.bank*`
  AppOptions; the AppOptions stay the fallback (zero master rows = the
  current behavior, byte-compatible).

## 2. FRs

- **PDC-01 schema** — `Payment.chequeDate DateTime?` + `Payment.chequeStatus
  String?` + `Payment.clearedAt DateTime?` (additive, nullable, no
  backfill — pre-M56 cheque rows read as null = "journey unknown, pre-M56",
  honestly absent from the register). db push + WAL checkpoint + dev-server
  restart (PITFALLS #50). Models 92→92.

- **PDC-02 the issued stamp** — `PAYMENT_SCHEMA` + `chequeDate` (ISO date,
  meaningful with `mode=cheque`; a date on a non-cheque mode is NAMED as
  ignored in the plan side effects — the honest-nag pattern, never a
  refusal). `planPayment` stamps `chequeStatus: 'issued'` on every
  cheque-mode voucher (plan `creates` + commit, byte-identical for
  non-cheque modes), the plan text carries `· cheque {reference} issued` +
  `· POST-DATED (due {chequeDate})` when the date is future, and the side
  effects name the register row ("appears in the PDC register until cleared
  or bounced").

- **PDC-03 the clear door** — `planChequeClear({voucherNo, clearedOn?,
  notes?})` (posting/cheque.ts NEW). Guards: voucher exists; `mode='cheque'`;
  `chequeStatus='issued'`; `status='active'` (a cancelled payment's cheque
  is moot — the refusal names the cancel door + the contra). Effect:
  `chequeStatus='cleared'`, `clearedAt`. NO journal, NO allocation change —
  the plan card says it in plain text ("physical confirmation only — the GL
  leg posted at voucher time"). creates: [] + updates: [payment].

- **PDC-04 the bounce door** — `planChequeBounce({voucherNo, reason?})`.
  Same guards (+ a cleared cheque refuses loudly: "money confirmed on
  {clearedAt} — reverse via cancel_payment if entered wrongly"). Effect: the
  M40 cancel machinery — `CN-{voucherNo}` contra (legs + FKs swapped from
  the companion journal), allocations `reversedAt`, invoice/bill statuses
  re-derived from Σ active allocations — PLUS `chequeStatus='bounced'`, all
  in ONE transaction. Implementation: `planCancelPayment` refactors its body
  into a shared `buildPaymentCancelPlan(pay, args, {chequeBounce})` — the
  plain cancel path stays byte-identical (the M40 pins hold); the bounce
  path adds the stamp to `updates` + the commit's `payment.update` + a side
  effect + the summary `· CHEQUE BOUNCED` tag + the narration
  `— cheque bounced{reason}`.

- **PDC-05 the PDC register** — `/accounts/pdc` (menu id `pdc-register`,
  accounts group, after Payments & Receipts; arch RG, phase M56). Grain: one
  row per issued cheque. Columns: Voucher No (RCP-/PMT-), Dir (in/out),
  Party, Amount (₹), Cheque No (reference), Cheque Date, Due (due in N d /
  DUE TODAY / OVERDUE N d), Type (PDC / cheque). Filters: q (party
  code/name), direction, from/to (chequeDate window). Totals: cheques, Σ
  amount, Σ overdue. CSV (the shared route). Service
  `registers/pdc.ts` (queryPdc) + `register-configs/pdc.ts` + the page +
  the menu entries ×2 (LIVE_ROUTES + ITEMS).

- **PDC-06 remit-to from the master** — `getPrintHeader` prefers the first
  ACTIVE BankAccount (orderBy accountNo, Bank joined for name) over
  `print.bank*` AppOptions; AppOptions remain the fallback; both absent =
  today's hidden-strip behavior. The strip's label gains "(remit-to)" on
  money docs — no other print-sheet change.

- **PDC-07 agent doors + prompt** — docTools `post_cheque_clear` +
  `post_cheque_bounce` (accounting domain; schemas in schemas/cancel.ts —
  the cancel family, no new schema file) + read tool `get_pdc_register`
  (delegates to queryPdc — the same read path as the screen). Prompt
  §Accounting gains the lifecycle sentence + §Money flow gains the PDC
  rule; PROMPT_VERSION → `m56-2026-09-08`.

## 3. Tests (tests/pipeline/pay-pdc.test.ts NEW)

The M40 harness pattern (party/style fixtures, commit(plan) helper):
issued stamp (cheque vs non-cheque vs post-dated badge) ×3 · clear door
(cleared + clearedAt; refusals: non-cheque, cleared-again, cancelled,
unknown) ×4 · bounce door (contra written with swapped legs/FKs, allocations
reversedAt, invoice re-derives to issued, payment cancelled + bounced, CN-
narration; refusals: cleared cheque, bounced-again, non-cheque) ×4 · the
register (rows + aging math + direction filter + PDC badge + the settled
cheque leaves it) ×3 · remit-to (master preferred / AppOptions fallback /
both absent) ×3 · wiring (tools registered, config + service + menu + route,
schema mirrors) ×3. ~20 cases; the M40 pay-batch4 pins untouched (the cancel
path is byte-identical).

## 4. Counters (pin sweep, m56_pin_sweep.py audit trail)

tools 271→274 · docTool delegates 73→75 · menu items 148→149 · live routes
184→185 · register configs 36→37 · register services 48→49 · posting service
files 44→45 · models 92 (unchanged) · schema files 45 (unchanged —
schemas/cancel.ts hosts the two new zod schemas) · PROMPT_VERSION m56 ·
eval registry 263→266 · route_smoke_m56 27/27 (the M55 26 + /accounts/pdc).

## 5. Docs round

ADR-020 (§17-3 resolved: full lifecycle now, delegated) · ADR-021 (§17-4
resolved: Tally STAYS JSON — no in-repo Tally instance can verify an XML
claim; the honest-claims rule forbids shipping unverifiable import formats;
the door re-opens on owner demand with a verification plan) · ADR-022
(§17-2 ERRATUM: resolved since M39 — SPEC-M39 JWL-08 "DECISION (per §17-2):
WIRE G3" shipped; the §17 queue lists that kept naming it were stale prose)
· §17-1 stays OPEN (an off-box backup destination is owner infrastructure —
it cannot be delegated or invented; the M37 mechanism awaits a target) ·
MANUAL-TESTING v1.10 (PD-05..08) · STATE #61.

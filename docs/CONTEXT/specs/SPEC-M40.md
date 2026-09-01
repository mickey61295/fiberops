# SPEC-M40 — Phase-6B Batch 4: Money Integrity (PAY-01..07)

Source: docs/PRD/PHASE-6B-REMEDIATION-SPEC.md §7 (Batch 4). Evidence layer: deep dive 2
(docs/ANALYSIS/2026-08-30-deep-dive-2-remaining-gaps.md). Dependencies: OPS-05 (docNo
uniqueness, M37) — shipped; every cited line re-verified on the M39.1 line (2026-09-01):
`payment.ts:21,27,33` direction-blind lookup + all-or-nothing settle; `chain-money-reports.ts:254-278`
iteration-order AP guesswork; tolerance engine dead except `checkProcessLoss` (M39);
`planCancelInvoice` guard-free; bill-pass = Approval row only, no bill document.

Seams closed: **#3 partial payments** + **#4 supplier bill → payment** (spec §15 tests #3/#4).

## §1 Scope — 7 FRs + 1 deferral

| FR | Ship |
|---|---|
| PAY-01 | `PaymentAllocation` {paymentId, invoiceId?, billId?, amount, reversedAt?}; `planPayment` allocates FIFO across the party's open invoices (in) / open bills (out); invoice status `partial` at 0 < allocated < billAmount, `paid` at full (legacy vocabulary kept — see §2.1); outstanding = billAmount − Σ active allocations; unallocated remainder = labeled on-account party credit |
| PAY-02 | In-payments attach SalesInvoice (invoiceNo); out-payments attach SupplierBill (billNo); an out-payment tagged with a sales invoiceNo is REJECTED with guidance; an in-payment tagged with an SB billNo is rejected with guidance |
| PAY-03 | `SupplierBill` + `SupplierBillLine` models; SB-#### doc via the doc-config engine (billNo, billDate, amount, tax split, dueDate, status; lines linked to GRN lines); `create_supplier_bill` docTool captures real bill data; `create_bill_pass` becomes the real gate (draft→passed, verdicts stored, approval row on the SB) |
| PAY-04 | SB creation runs `threeWayMatch` (PO vs GRN vs bill) + `checkGrnVsPo` + `checkEntryDate` + `tds_default_percent` default; verdicts stored on the bill (matchStatus, variance, verdicts JSON); `create_bill_pass` REFUSES on block severity — the ~10 admin flags are enforced or honestly marked (flags now wired: bill_bcheck(+dev), grn_bal/dev/alladd via the SB gate, entrydatedev, tds_default_percent, dyeing/knittinggamtper [M39]; still unwired → recorded: po_bud*, i_scheck/i_sdev — owning batches 5/6) |
| PAY-05 | supplier-pending gains a received-not-billed aggregate (GRN value with no open SB); AP payable in chain-money derives from open SupplierBills − Σ active bill allocations (the GRN-iteration guesswork RETIRED); received-not-billed shown as a separate memo (not owed until billed) |
| PAY-06 | CANCEL_PLAN extends to {payment, journal, debit-note, expense, budget} with contra legs (audit-preserving: no row deletes — allocations flip reversedAt, journals get a mirrored contra voucher); `planCancelInvoice` gains guards (live IRN → block; active allocations → block with reason); +5 agent cancel tools (ADR-001 parity) |
| PAY-07 | SalesInvoice + dueDate/creditDays; planInvoice accepts both (dueDate default = invoiceDate + creditDays); AR aging buckets 0-30/31-60/61-90/90+ anchored on dueDate (fallback invoiceDate); on-account credit visible per party (AR onAccount column) |
| PAY-08 | **DEFERRED per §17-3** (owner decision open: cheque/PDC lifecycle + PDC register) — recorded here + STATE; no dead columns added |

## §2 Design decisions

1. **`paid` stays, `partial` joins** (spec wording says "settled"): 'paid' has ~15
   consumers (registers, chain-money, pins, prints); renaming buys no semantics. The
   status fleet becomes `draft | issued | partial | paid | cancelled` — every state has
   a writer (partial ← allocation commit; paid ← full allocation). Honesty rule §3-T2.
2. **Allocation rows are the one truth for settlement**: status flips are DERIVED inside
   the payment commit transaction (recompute from Σ active allocations after insert);
   the legacy `amount >= billAmount - 0.01` single-shot flip is retired. Cancel marks
   `reversedAt` (never deletes) and recomputes statuses — the audit trail survives.
3. **Exactly-one target per allocation row** (invoiceId XOR billId) is enforced in the
   service layer, not the schema (SQLite cannot express it) — the dual-FK shape covers
   AR (in) and AP (out) with one table, matching PAY-05's bill-side derivation.
4. **SB creation is informational, the PASS is the gate**: `planSupplierBill` surfaces
   tolerance verdicts on the plan card (warn/block chips) and stores them at commit;
   `create_bill_pass` refuses block verdicts and is the only door to status 'passed'
   (with the find-or-create Approval row — CHAT-06 deterministic re-plan preserved).
   Only passed/partial bills are payable (AP + out-payment allocation source).
5. **One open SB per GRN** (guard, not schema): a second SB for a GRN with a
   non-cancelled bill is refused — the GRN is the receipt evidence; re-billing means
   cancelling the first bill.
6. **Contra vouchers get their own number space** (`CN-<voucherNo>` on Journal.voucherNo,
   unique): payment cancel writes `CN-RCP-####` mirroring the original journal legs
   swapped; journal cancel writes its own mirror + flips status. Companion journals
   (`JV-RCP/PMT-*`) refuse direct cancel — guidance points at the payment door.
7. **Direction guard is guidance-first**: the error names the found document and the
   correct door (out + INV-#### → "attach an SB-#### bill; for buyer refunds use a
   debit note") — mirrors the legacy FrmPayment direction fields.
8. **Aging anchor = dueDate ?? invoiceDate** (spec fallback rule); the HFX-05
   on-account FIFO application stays (b3→b0 order) — only the bucket anchor moves.
   AR rows gain `onAccount` (receipts beyond outstanding — the advance the party holds).

## §3 Files

- schema: prisma/schema.prisma — NEW PaymentAllocation, SupplierBill, SupplierBillLine;
  Payment + status/cancelledAt; SalesInvoice + dueDate/creditDays; Journal + status;
  Budget + status — `db:push` + WAL CHECKPOINT (PITFALLS: global-setup copies custom.db
  without the -wal sidecar) + `prisma generate`
- posting: **supplier-bill.ts** (NEW — plan + gate commit), payment.ts (allocation
  rewrite + direction guard), cancel.ts (+5 cancels + invoice guards), invoice.ts
  (dueDate/creditDays)
- schemas: **supplier-bill.ts** (NEW), payment.ts (billNo + direction docs), invoice.ts,
  cancel.ts (new cancel inputs)
- agent: tools.ts (create_supplier_bill docTool, create_bill_pass REAL gate,
  +cancel_{payment,journal,debit_note,expense,budget}, record_payment description),
  tool-labels.ts, prompt.ts (§money: SB flow + allocation + cancel verbs; PROMPT_VERSION
  m40-2026-09-01)
- registers: supplier-bills.ts (REWRITTEN — SB rows, not GRN rows), supplier-pending.ts
  (received-not-billed aggregate), reports/chain-money-reports.ts (AP from open SBs +
  AR dueDate anchor + onAccount column)
- register-configs: supplier-bills.ts (columns/filters rewritten), wave-b.ts
  (supplier-pending totals line)
- views: **/accounts/bill/[id]** (NEW — SB view: lines vs GRN, verdicts, TDS, status
  timeline), /accounts/bill-pass (SB-based queue), invoice doc-config (+dueDate,
  +creditDays), payment doc-config (+status), cancel-action.ts + doc-view-actions.tsx
  (CANCEL_PLAN keyset +5)
- enums.ts (INVOICE_STATUS +partial, PAYMENT_STATUS, SUPPLIER_BILL_STATUS,
  JOURNAL_STATUS, EXPENSE_STATUS, BUDGET_STATUS), menu-registry/LIVE_ROUTES/new-routes
  (bill view + bill new door)
- tests: **tests/pipeline/pay-batch4.test.ts** (NEW — loop-closure #4 + #3 + per-FR
  pins), chat-batch2 (232→238 tools, version m40), qol1-reconcile (registry pin),
  hfx-batch0 (AR anchor pin), doc-parity/invoice pins
- gates: context_check pins (models 80→83, tools 232→238, docTools 56→57, posting
  37→38, routes/menu per additions), eval --static (probe + version refresh)

## §4 Acceptance — loop-closure tests #3 + #4 (spec §15)

**#4 Invoice → payment**: invoice ₹1,000 → receipts ₹400 + ₹600 (both doors: planPayment
service + record_payment tool delegate): status partial after ₹400, paid via allocations
after ₹600; outstanding 0; chain-money AR shows paid + onAccount 0. Overpayment variant:
receipt ₹1,200 → invoice paid + onAccount ₹200 labeled. Out-payment tagged INV-#### →
rejected with guidance. SB variant: GRN → SB → pass → out-payment ₹partial+balance →
bill paid; AP outstanding = Σ open SBs − Σ active allocations.

**#3 Wages**: production entry ₹1,000 (qty × rate, operator employee party) → pay_wages
₹600 → the operator's party-balance row shows ₹400 owed (earned − paid).

Both doors share the same service (ADR-001 parity by construction); all four gates
green (vitest / tsc / eval --static / context_check NO DRIFT).

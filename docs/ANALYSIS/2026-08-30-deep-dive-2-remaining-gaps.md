# Deep Dive 2 — The Remaining Gaps: Money, People, Loops, Stock & Ops

Date: 2026-08-30 · Status: Evidence audit (read-only, no code changed) · Trigger: owner —
*"What other gaps are there? Do another deep dive."*

Precedes: `2026-08-30-order-program-forms-vs-legacy.md` (order/program/costing depth) and
Task 50-c (production/quality/planning). **This dive covers everything they didn't**:
the accounts/money chain, HR & payroll, procurement, the jobwork loop, dispatch/logistics,
inventory integrity, and data lifecycle/operations.

## 0. Method & Evidence Base

Four parallel code explorers (one per domain cluster) plus independent re-verification of the
19 highest-severity claims by the main agent (every file:line below was re-read or re-grepped;
all 19 verified verbatim). Exclusions — anything already covered was NOT re-reported:

- Phase-6 PRD modules A–J (auth, admin platform, personalization, planning/IE, maintenance/OEE,
  quality depth, GST payloads, print platform, notifications, PWA)
- Task 50-c (TNA/capacity/SAM/OEE/AQL/DHU/4-point absent; dormant PCS pipeline)
- Task 51 (costing is a snapshot; program GSM/LL orphaned; ProgBalance waterfall dormant;
  no BOM→program; no buyerPoRef/orderType/delivery-schedule)
- Shipped since the 08-29 audit: masters completion, attendance (M20), waste receipt,
  tally export (sales-side, M19-D), e-invoice mock IRN (M23), doc-view cancel/void/duplicate
  (M18C), material-wise stock registers (M19), reflex/print fixes (M17/M18).

## 1. TL;DR Verdict

Deep dive 1 found *depth* gaps — things legacy did better. This one found something worse:
**the commercial chain does not close its loops.** A document exists for every step, but truth
leaks at the six seams where two documents are supposed to meet:

| # | The loop | Where it leaks | One-line consequence |
|---|---|---|---|
| 1 | PO → GRN | `posting/grn.ts:34` `const line = po.lines[0]` | **Multi-line POs can never receive lines 2+**; pending math zeroes on the wrong line |
| 2 | Jobwork out → in | `posting/jobwork.ts:56` overwrites `totalQty` with received qty; JW- commit (`:42`) writes no stock despite sideEffects claiming it | Issued-vs-returned truth destroyed on first receipt; "ITC-04 line generated" never happens |
| 3 | Wage earned → wage paid | `party-ledger.ts:41` formula: employee-party journals and payments cancel to zero; wage bills post journals with no partyId | **"What do I still owe operator X?" is unanswerable** — the weekly Tirupur question |
| 4 | Invoice → payment | `posting/payment.ts:27` settles only when `amount >= billAmount − 0.01` | Partial payments never settle an invoice; no allocation table exists |
| 5 | DC → colour/size → print | `posting/despatch.ts:59` drops `colourName/sizeName` at commit | Every DC/courier/LAD line's colour & size columns are permanently null |
| 6 | Ledger → physical stock | No stock-take/cycle-count model, route, or tool anywhere (grep: 0 hits) | Stock ledger truth is unverifiable; ADJ- is the only correction door |

Plus one operational blind spot the app has carried since day one: **the production database has
no backup, and the server runs UTC while the factory runs IST** — night-shift postings between
00:00–05:29 IST land on the wrong business day (`new Date().toISOString().slice(0,10)` defaults).

Totals: **66 findings across 7 domains.** Thirteen are live correctness bugs fixable as
one-liners (no new models). Six are P0-class: four data-corruption bugs in daily-use flows
(loops 1–4), one missing safety net (backup), one systemic day-boundary error (UTC).
Only one finding contradicts the Phase-6 PRD itself: **FR-G2's "per-rate B2B items" acceptance
criterion is unbuildable against header-only invoices** (§3.4).

## 2. Accounts & Money Chain

### 2.1 Payment allocation does not exist (P0)
`posting/payment.ts:27` — `settlesInvoice = invoice && direction === 'in' && args.amount >= invoice.billAmount - 0.01`.
A 50% receipt leaves the invoice `issued` forever; two receipts that together cover the bill never
flip it. No `PaymentAllocation` table exists (grep "allocat" → only the invoice-number allocator).
Overpayment becomes unlabelled party credit; the only "on account" trace is print text
(`print/fetchers.ts:341`).

### 2.2 Supplier payments tagged `invoiceNo` resolve a SALES invoice (P1, correctness bug)
`posting/payment.ts:20` — `salesInvoice.findUnique` is direction-blind; `:33` stamps `invoiceId`
on out-payments too. Downstream, `registers/recon.ts:60` (`findMany({ where: { invoiceId } })`,
no direction filter) and `chain-money-reports.ts:201` both let an out-payment **reduce AR
outstanding** of that sales invoice.

### 2.3 No supplier-bill / purchase-invoice document (P0)
78 models, no SupplierBill/PurchaseInvoice. `create_bill_pass` (tools.ts:2405) captures only
`{grnNo, comments}` — no bill number, date, amount, tax split, or due date. The invoice→bill→
payment story is *GRN value − undifferentiated payments-out*. REQUIREMENTS.md module 10 promised
`PurchaseInvoice` + `BillAddded` — never landed.

### 2.4 The whole tolerance engine is dead code (P1)
`tolerance.ts` — `threeWayMatch`, `checkGrnVsPo`, `checkProcessLoss` (dyeing 5% / knitting 3%
loss flags), `checkEntryDate`, `checkIssueShortage`, `checkPoVsBudget`: **zero call sites outside
the module and its (nonexistent) tests.** The admin settings UI configures ~10 flags
(`grn_bal`, `grn_dev`, `dyeinggamtper`, `entrydatedev`, `notds`, `tds_default_percent`,
`doublebillpassreqd`, `gstenable`, `coy_state`, `gendcdays`) that nothing enforces.

### 2.5 Cancelled invoices still count as billed (P1, correctness bug)
`registers/party-ledger.ts:31` — `findMany({ where: { partyId } })`, no status filter; while
`outstanding-summary` (line 185) filters `status: { not: 'cancelled' }`. Two screens disagree
after any invoice cancel. The bills register has the same defect.

### 2.6 On-account receipts computed then ignored (P1, correctness bug)
`chain-money-reports.ts:230-231` — `partyReceipts` map built from direction-in payments with no
invoiceId, **never read again**. A buyer who pays on-account shows full AR outstanding.

### 2.7 Journals are direction-blind in the party ledger (P1, correctness bug)
`party-ledger.ts:38,75` — every party-tagged journal subtracts from the party balance whether
the party was debited or credited.

### 2.8 No money-voucher cancel/reversal (P1)
`cancel-action.ts:39` CANCEL_PLAN = `{order, purchase-order, invoice, program}` only. Payment,
Journal, DebitNote, Expense, Budget cannot be cancelled or reversed — no contra mechanism.
Bonus: `planCancelInvoice` (posting/cancel.ts:43) has no guards — an invoice with a live IRN or
receipts against it can be cancelled.

### 2.9 Cheque/PDC lifecycle absent; BankAccount master is dead data (P1)
`schema.prisma:786` mode comment promises cash|bank|cheque|rtgs|upi; the form offers 4 (no
RTGS/NEFT); no cheque date, PDC, clearing/bounced status, no `bankAccountId` link. The
BankAccount master is read by one list tool and nothing else; the invoice print remit-to block
reads static AppOptions instead.

### 2.10 Invoices are header-only (P0, structural) — and it contradicts the PRD
`SalesInvoice` (schema:558–592): no lines relation, one gstRate per invoice, no currency, no
fxRate, no dueDate. Verified: print *derives* HSN by qty-proportioning order lines
(`print/fetchers.ts:69-76`). Per-line HSN, per-rate GST, real e-invoice payloads, Tally item
detail are all blocked — and **PRD FR-G2's "b2b invoice-wise per-rate items" acceptance
criterion cannot be built against this model**. Needs `SalesInvoiceLine` before Module G starts.

### 2.11 FCY dies at the Order (P1)
Order carries `currency`/`fxRate`; SalesInvoice, Payment, Journal are currency-less bare numbers.
No realization date, no exchange gain/loss, no BRC. Legacy `frmFCRmaster` unported (mis-filed
under MASTER_FORMS in the parity map).

### 2.12 No chart of accounts, no final accounts (P1)
`schemas/journal.ts:7-8` — `debitAccount/creditAccount` are free strings, no validation, no
master. Hard-coded account names scattered across services ('Cash/Bank', 'Production Wages',
'Output GST'). No trial balance, P&L, balance sheet, day-book, cash-book among the 28 report
slugs; legacy `FrmPLReg` was "DECIDE" in the 08-29 audit — still undecided, and Phase-6 has no
final-accounts module. Journal sideEffects even claim "Cash/bank balance updated"
(`posting/journal.ts:33`) which the file header itself denies.

### 2.13 Tally export is sales-side only (P2)
`registers/tally.ts:44` — SalesInvoice + Payment + Journal. No purchase vouchers, no debit
notes, no expenses; single "Output GST" ledger (no CGST/SGST/IGST split); custom JSON shape,
not Tally XML.

### 2.14 Smaller money gaps
No due-date/credit-days/credit-limit anywhere (aging is invoice-date-based, non-standard
0-15/16-30/31-60/60+ buckets, `chain-money-reports.ts:173`); no party-statement print (23
print docTypes, none is a statement); AP "payable" is iteration-order GRN-value guesswork
(`chain-money-reports.ts:248`); debit notes can't offset a specific bill (`status` stuck at
'raised'); wage-payment picker filters `partyType='employee'` which the Party master's own
options can never produce (doc-configs/wage-payments.ts:23 vs master-configs/party.ts:21-26);
expense `category` is a 5-value free string with no head master (legacy FrmMasExpenses/
FrmExpenseGroup unported); expenses are excluded from budget-vs-actual math
(`registers/budget.ts:43`); digest has no money section; no `list_payments` agent tool.

## 3. HR & Payroll

### 3.1 Wage earned↔paid reconciliation is structurally zeroed (P0)
Wage bills post `Dr Production Wages / Cr Wage Payable` with **no partyId**
(`/hr/wages/page.tsx:53-59`); wage payments post a Payment row **and** a companion journal with
the employee-party's id (`posting/payment.ts:49`). In the party-ledger formula
(`party-ledger.ts:41`) these two cancel exactly: employee-party balance = openingBalance
forever. Earned (queryWages, per operator) and paid (PMT- per party) never meet in any
register, report, or tool. "How much do I still owe operator X?" — unanswerable; advance
over-payment undetectable.

### 3.2 `shiftWages` is a dead column corrupting live reports (P1)
Schema:505; the only writers would be `posting/production.ts:28,36,72,76` — none writes it
(grep-verified: read-side only). Readers: budget-vs-actual (`registers/budget.ts:39,108` —
under-counts wage cost), production-status, and **daily-unit-pnl** (`chain-money-reports.ts:348`)
where `margin = amount − shiftWages − expenses` — so the P&L's "Wages" and "Margin" columns are
structurally zero. Either write it (shift door on production entry) or switch readers to
`amount` — one line each, but pick one: today the P&L lies.

### 3.3 Piece-rate only — no payroll run, salary, or payslip (P1)
`Employee.dailyWage` is consumed by master display only — no attendance × dailyWage computation
exists, so the attendance `half` status has zero wage effect. No PayrollRun/Payslip models; the
wage-slip/piece-rate-confirmation print (GAP-ANALYSIS C1#7-8) still unshipped; SPEC-M20
explicitly deferred payroll "to a future milestone" — and no Phase-6 module owns it.

### 3.4 No statutory payroll (P1)
PF/ESI/PT/LWF/bonus/incentive: zero hits across schema + src. REQUIREMENTS.md:24 promised them.
For a ≥20-worker unit these are statutory.

### 3.5 Employee⇄Party dual master, no sync (P1)
Wage payments pay an employee-*type party*; nothing auto-creates or links one when an Employee
is created (master-service has no employee hook). Earnings live under EMP-####, payouts under
an arbitrary party code; nothing enforces the 1:1.

### 3.6 Attendance/shift thinness (P1–P2)
Cross-midnight shifts are impossible to record with times (`posting/attendance.ts:36-38`
rejects outTime ≤ inTime); no OT hours, no late logic; Shift master has no breaks/OT-rate/
weekly-off; `shiftWages` linkage deferred (ADR-019). No leave model beyond the attendance
status string. Employee master lacks joining date, designation, bank account/IFSC, UPI, phone,
UAN/aadhaar — the fields payouts and statutory registers need.

### 3.7 Wage views vs legacy (P2)
Our wages register groups by operator across the whole period; legacy had four lenses
(Frm_ProductionWages, _Dept, _Stage, FrmProdShiftWagesReg). Stage/shift wage lenses don't exist.

## 4. Procurement (PO → GRN)

### 4.1 GRN receives only the PO's first line (P0, correctness bug)
`posting/grn.ts:34` `const line = po.lines[0]`; `:67` increments only that line's `receivedQty`;
`:66` flips PO status on header totals. The UI happily creates 3-line POs (`PURCHASE_ORDER_SCHEMA`
`lines` min 1); doc-configs/grn.ts:3 admits "header-only (single qty against the PO's first
line)". Consequence: lines 2+ are permanently unreceivable; supplier-pending can zero while
line 2 was never delivered.

### 4.2 GRN has no PO-status guard (P1)
`grn.ts:26-35` checks only existence — receipts against cancelled/completed POs succeed, while
`planPoLifecycle`'s own sideEffects claim "No GRNs can be received against this PO" (false).

### 4.3 PO approval gate is annotation-only (P1)
Commit auto-creates an Approval row (`purchase-order.ts:68-70`); nothing reads it — planGrn
doesn't require approval; approve_pending only updates the Approval row.

### 4.4 No PO amendment / rate revision (P1)
`lifecycle.ts` has `planOrderAmend` for orders only; no `/procurement/po/amendments`; no
`update_purchase_order` tool (orders have `update_order`). A mis-keyed PO rate is unfixable
without a new PO. Multi-order/multi-style PO dormant: `POLine.orderId` exists, never written.
Also enum drift: lifecycle writes `status:'completed'` (lifecycle.ts:145,151) which PO_STATUS
(`enums.ts:77` — open/partial/received/cancelled) and the register filter don't know.

### 4.5 No purchase-return / GRN rejection (P1)
No rejectedQty at GRN; `reprocess` flag is annotation-only; no return-to-supplier service or
tool exists anywhere; no linked debit note from GRN rejection.

### 4.6 Smaller procurement gaps (P2)
supplier-order ≡ PO with `poType='general'` (a 6-line wrapper — inherits every PO gap);
rate-confirmation register confirms nothing (a POLine day-book with no confirmation state);
received-not-billed is tracked nowhere as an aggregate; MP-GRN and DC-return are form-only
(configs admit the ERRATUM in doc-configs/grn-variants.ts:78-112); no requisition/indent stage
(REQUIREMENTS module 3); supplier production-sequence/tech-pack data has no representation.

## 5. The Jobwork Loop (the core of the business)

| # | Step | Our surface | Balance actually tracked | Verdict |
|---|---|---|---|---|
| 1 | Contract allotment | `/jobwork/contract` (AL-), `allot_contract` | JobworkOrder `status='allotted'` | standalone — never linked to the JW DC; 'allotted' not in enum |
| 2 | Issue material → jobworker | `/dispatch/dc` (MDC-/PDC-), `create_dc` | StockLedger `process_delivery` OUT | **healthy leg** |
| 3 | Jobwork order proper | `/jobwork/order` (JW-), `create_jobwork_order` | JobworkOrder row only — **no item lines, no godown, no stock move** (commit at jobwork.ts:42 creates one row); sideEffects claim 'Material leaves main godown' + 'ITC-04 line generated' — neither happens; `itc04Line` column has zero writers | **broken** |
| 4 | Receipt — good | `receive_jobwork` AND `/dispatch/dc-return` (RTN-) | doc door: status flip + **totalQty overwritten with received qty** (jobwork.ts:56,59 — sent-vs-returned truth destroyed; no rejectedQty, no partial); stock door: `process_receipt` IN but free-text dcRef, no DC validation, DC stays 'sent' forever | **split brain** |
| 5 | Receipt — rejected | — | nothing | **missing** |
| 6 | Pcs return for rework | `/jobwork/pcs-return`, `return_jobwork_pcs` | pcs OUT of G2 | OK but unlinked to any JW DC |
| 7 | WIP at jobworker | register footer (page-scoped Σ sent) + per-DC recon card | qty-as-entered, no item/kgs grain; **G3 'Jobworker Yard' godown is seeded (seed.ts:59) and written by nothing** | weak |
| 8 | Fabric loss at jobworker | `checkProcessLoss` | dead code (§2.4) | dead |
| 9 | GAN acceptance | `/pieces/gan`, `accept_jobwork_pcs` | Approval row only; tool claims stock "posts after acceptance" — it never does | **false gate** |
| 10 | Bill jobworker | `/accounts/invoice/piece` (manual `billType='jobwork'`) | `status='billed'` is in the enum + register filter but **no code ever writes it** (grep-verified) | open loop |

The one healthy leg is the MDC/PDC despatch out; everything past it leaks. The loop is
derivable from `StockLedger.partyId` on `process_delivery/receipt` rows — but no register,
report, or tool computes a jobworker material statement (kgs out / kgs in / loss / aging per
item per party).

## 6. Dispatch & Logistics

- **Colour/size dropped on every DC line** (P1): form collects them, schema has
  `PcsDespatchLine.colourId/sizeId`, commit writes neither (`posting/despatch.ts:59` — only
  styleNo/qty/rate). View + print columns permanently empty. One-line fix; the GRN-variant
  id-map precedent exists.
- **No DC completion / delivered transition** (P1): `'delivered'` never written by any code;
  LAD challans stay `'loading'` forever (no LAD→DC conversion); legacy frmGeneralDCCompletion/
  frmPcsDelRecClose marked "MAP" in the 08-29 audit — only Cancel/Void/Duplicate shipped.
- **No despatch register, no aging; `gendcdays` flag orphaned** (P1): no DC day-book register;
  the flag's described digest aging section doesn't exist; non-return DC fires only on the
  manual `returnable:false` at creation.
- **Gate pass/entry not linked to documents** (P2): `refDocNo` free text, unvalidated; no
  logged→cleared transition tool; no DC-without-gate-pass reconciliation.
- **Courier/loading lack logistics data** (P2): no LR/AWB, transporter, freight, cartons, gross
  weight, manifest grouping; export docs (ShippingBill/Container) absent.
- **DC→invoice fully manual** (P2): no despatchId on invoice; the only bridge is the read-side
  "despatched not yet invoiced" recon card. frmDelCumInv still a "DECIDE".

## 7. Inventory Integrity

- **No stock take / cycle count** (P0): zero models/routes/tools (grep-verified 0 hits). Not a
  parity regression (legacy had none either) — a *new* gap. The only ledger→stock correction
  door is a free-form ADJ- with a reason string. PRD FR-B8 ships locks but nothing to lock
  *around*. Fix sketch: `StockTake`+`StockTakeLine` (system qty snapshot, counted qty, variance
  → auto-drafted ADJ- referencing ST-####), count-sheet print.
- **Three contradictory valuations** (P1): closing-stock = qty × **last** ledger rate per
  (item,godown) (`closing-stock.ts:63`); current-stock register + dashboard = qty ×
  `CurrentStock.rate` which is **frozen at bucket creation** (`posting/ledger.ts:48-56` never
  updates rate on the update branch); dashboard additionally sums across uoms before × rate
  (`dashboard.ts:222` `(st.kgs + st.mtrs + st.pcs) * st.rate` — dimensionally wrong; same in
  stock-register.ts:43). Two screens, two stock values, both questionable. No WAC/FIFO/COGS
  anywhere. Fix: WAC in `bumpStock` + one shared `valueBucket()`.
- **`take:5000` truncates period-end statements** (P1): closing-stock.ts:31 and itemwise-stock
  run a cumulative scan capped at 5000 ledger rows — past 5k rows the statement silently drops
  the oldest rows (including OPN- openings) and understates stock. The perf test seeds 10k rows
  and passes while the register reads 5k.
- **Negative stock unguarded** (P1): postLedger/bumpStock increment blindly; the ⚠ exists in
  exactly one live flow (line-issue sideEffects); rejection/shortage/transfer/despatch post
  unchecked. Detection is next-morning digest/dashboard only.
- **Waste is not a stock identity** (P1): waste receipt rides `stock_adjustment_add` — waste
  kgs re-enter **good stock at the good-item rate** unless the operator self-disciplines a waste
  item/godown; no scrap rate; no waste-% report (the core knitting KPI) — derivable from WST-
  prefix ledger rows, nothing computes it.
- **Ledger↔CurrentStock reconciliation absent** (P2): the cache is stored, the ledger is
  append-only, nothing compares them; drift vectors include `db:push --accept-data-loss`.
- **Opening stock ungated** (P2): OPN- is a mid-October-postable wrapper with a frozen
  "Opening stock" reason; nothing ties it to FY start.
- **Ledger-family docNos non-unique** (P2): ADJ/OPN/WST/GT/PT/RTC/RSP minted at plan time via
  scan-for-gap, no unique constraint (five service files carry the "docNo is NOT unique"
  comment). Concurrent plans can mint duplicates.
- **Lot is a bare label** (P2): `Lot {lotNo, partyId}` — no item/date/qty/shade/expiry; rolls ≡
  lots; roll-split is the one well-guarded flow but captures only mtrs. PRD-H builds genealogy
  on this thin base.

## 8. Data Lifecycle & Ops

- **No backup of the production DB** (P0): repo-wide grep for backup/VACUUM INTO/litestream/
  .backup/restic/rclone → 0 hits; crontab empty; no systemd timers. The de-facto backup is
  ad-hoc `git commit db/custom.db` — hours-to-days of loss, non-atomic live-file copy (no WAL),
  business data in a private GitHub repo, no restore test. Prior disk-full incident
  (worklog.md:37) already risked corruption; no `PRAGMA integrity_check` anywhere.
  `recovery_drill.sh:40` even runs `prisma db push --accept-data-loss` — the data-destroyer
  flag — inside the *recovery* path. Fix sketch: nightly `VACUUM INTO` + 7/30-day rotation +
  off-box copy + weekly integrity_check + monthly restore-verify; enable WAL.
- **UTC server vs IST factory** (P1): box runs UTC; every `new Date().toISOString().slice(0,10)`
  default (production entry `prodDate`, attendance day, tools `today`, digest) puts 00:00–05:29
  IST postings on **yesterday** — wrong day-book, wrong wage grouping, wrong daily P&L for a
  night-shift knitting unit. Register end-of-day filters use server-local setHours (UTC).
  Fix: `TZ=Asia/Kolkata` + one `istToday()` helper replacing ~30 sites.
- **Unit tests run against the production DB** (P1): vitest.config.ts has no DATABASE_URL
  override; tests import `@/lib/db` → `.env` → `file:custom.db` (verified). One leaky cleanup
  corrupts live data. Fix: 10-line vitest setup pinning a throwaway DB (Playwright already does
  this for e2e).
- **No server-side duplicate-submit guard** (P1): commitDocAction re-runs plan+commit; the agent
  approve route re-executes the tool on every POST; double-click Approve = double posting.
  Client-side busy-flag only. Fix: idempotency token + docNo uniqueness re-check inside the
  commit transaction.
- **No archival/retention** (P2): StockLedger/AuditLog/AgentTurn grow forever (AuditLog carries
  full after-image JSON per commit). PRD B does FY-close but not archival.
- **Attachments are extraction-only** (P2): upload route = agent paperclip → text extraction;
  no attach-to-document feature (legacy Frm_WF_DocumentStore); upload dir is gitignored,
  unbacked-up, no quota/cleanup.
- **Performance budgets thin** (P2): 3 assertions (<300ms at 10k ledger rows); hot register
  filters (itemType/itemId/godownId) ride full scans (StockLedger indexed on createdAt/docDate
  only); current-stock register fetches the entire table and groups in memory.
- **Multi-company**: still dormant (admin/company: "deferred to M6") — open decision #1 stands.

## 9. Where Ours Is Deliberately Better (keep, don't regress)

- Ledger-is-truth + review-before-commit: the runCommit choke point is exactly where payment
  allocation, tolerance checks, idempotency, and FY gates should land (PRD B already plans
  before-images/controls there — this analysis adds more reasons).
- Two-doors-one-service: every fix below is one service change, not two UIs.
- Roll-split availability guards; attendance upsert-correctness; versioned cost sheets;
  approval queue + audit on every commit; the honest-docstring culture (most gaps above are
  *admitted in comments* — the codebase tells on itself, which made this audit cheap).

## 10. Scorecard

| Domain | Parity skeleton | Loop closure | Data integrity | New-capability depth | Worst item |
|---|---|---|---|---|---|
| Accounts/money | ✓ docs exist | ✗ allocation, bill, settlement | ✗ 4 live bugs (§2.2/2.5/2.6/2.7) | ✗ no CoA/final accounts/FCY | payment settlement (P0) |
| HR/payroll | ✓ attendance+wages | ✗ earned↔paid never meets | ✗ shiftWages lies in P&L | ✗ no payroll/statutory/leave | wage reconciliation (P0) |
| Procurement | ✓ PO/GRN docs | ✗ GRN first-line only | ✗ cancelled-PO receipts | ◐ no amend/return/indent | GRN line bug (P0) |
| Jobwork | ◐ MDC out healthy | ✗ split-brain receipt | ✗ sent-qty overwrite | ✗ no WIP view/billing/loss | JW loop (P0 ×3) |
| Dispatch | ✓ DC/gate/courier | ✗ DC→invoice manual | ✗ colour/size dropped | ◐ no completion/aging/manifest | attribute loss (P1) |
| Inventory | ✓ registers shipped | ✗ no stock take | ✗ 3 valuations, truncation | ◐ no WAC/COGS/reorder | stock take (P0) |
| Data ops | — | ✗ no backup | ✗ UTC boundary, prod-DB tests | ◐ no archival/attachments | backup (P0) |

## 11. Recommendations (batch mapping, ~10 batches total)

**Batch 0 — Hotfix (½ batch, no models, ships immediately).** The thirteen one-liners:
GRN lines-2+ guard + PO-status check (or full §11-B fix); DC colour/size persistence;
party-ledger/bills cancelled filter; recon + outstanding direction filter; consume or remove
`partyReceipts`; RTGS/NEFT mode options; wage-picker partyType fix; journal sideEffects text;
`'billed'` either written or removed from filters; PO enum drift; dashboard/stock-register
uom-mixing valuation; shiftWages readers → `amount` (or writer, §11-E); vitest DB pinning.

**Batch B1 — Jobwork loop repair (1 batch).** `JobworkOrder` gains `receivedQty` + material
lines; `planJobworkOut` posts `process_delivery` (delete the false sideEffects); `planJobworkIn`
writes received-not-overwrite + partial status; `planDcReturn` validates DC, guards qty, flips
status in-transaction; `bill_jobwork` aggregates received DCs → jobwork invoice → writes
'billed'; jobworker material-statement register from StockLedger partyId; wire G3 or delete it.

**Batch B2 — Money integrity (1 batch).** `PaymentAllocation` + FIFO allocation in planPayment +
`partial` invoice status; `SupplierBill` model (billNo/date/amount/tax split/dueDate via doc-config
engine) with `create_bill_pass` taking real bill data and finally calling `threeWayMatch`;
supplier-pending gains received-not-billed aggregate.

**Batch B3 — Ops foundation (½–1 batch).** Nightly VACUUM-INTO backup + WAL + integrity_check +
restore drill (without --accept-data-loss); `TZ=Asia/Kolkata` + `istToday()` migration;
commit-idempotency token + docNo uniqueness re-check; ledger-family docNo unique indexes.

**Batch B4 — Stock take + valuation unification (1 batch).** StockTake/StockTakeLine +
count-sheet print + variance→ADJ- draft; WAC in bumpStock + shared valueBucket(); replace
take-caps with groupBy; waste as a real stock identity + waste-% report.

**Batches beyond (propose as PRD amendments):** Module K (costing depth — from deep dive 1);
Module L (payroll: run/payslip/statutory/OT/leave + employee-party link — §3); Module M
(minimal final accounts: Account master + journal FK + trial balance/day-book/cash-book);
invoice line items **before Module G starts** (FR-G2 dependency — flag to owner); FCY
realization; GRN multi-line + purchase return; DC completion/aging/manifest.

Also recommend: add the §8 ops findings to the PRD §2.2 P0 defect queue (backup + UTC +
vitest-DB predate everything — they gate *trust* in every other number the app shows), and add
a "loop-closure" test family: for each of the six seams, an end-to-end test that walks the
loop and asserts the balance closes.

## 12. Caveats

Legacy reconstruction limits: `source-erp/` is gone; legacy jobwork/bills/FCR behavior is
inferred from form names in `docs/form-taxonomy.json`, REQUIREMENTS.md, and the parity map —
the *absence* claims (what legacy had) carry more confidence than the *behavior* claims (how
it worked). Everything claimed about OUR code was re-verified against source this session.

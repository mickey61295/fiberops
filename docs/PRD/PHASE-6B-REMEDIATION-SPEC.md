# FiberPro ERP — Phase 6B Remediation Spec: Trust, Loop Closure & Agent QoL

Date: 2026-08-31 · Status: **SPEC — requirements ready for implementation planning**

Relationship: amends `docs/PRD/PHASE-6.md` (modules A–J). Anything Phase-6 already owns is
referenced here, not re-planned. Everything the three deep dives found that Phase-6 does *not*
own — the loop-closure bugs, ops trust infrastructure, agent QoL beyond the P0 queue, payroll,
final accounts, stock take — is specified below as implementable requirements.

Evidence base (every claim code-verified; file:line quoted in each dive):

| Dive | Doc | Findings |
|---|---|---|
| 1 — Order/Program/Costing vs legacy | `docs/ANALYSIS/2026-08-30-order-program-forms-vs-legacy.md` | 8 gaps, 3 thinner |
| 2 — Money/HR/procurement/jobwork/dispatch/inventory/ops | `docs/ANALYSIS/2026-08-30-deep-dive-2-remaining-gaps.md` | 66 findings, 6 P0 |
| 3 — Agent/chatbot QoL | `docs/ANALYSIS/2026-08-31-agent-chatbot-qol-study.md` | ~30 new, 2 P0 |
| — Consolidated register (master index) | `docs/ANALYSIS/2026-08-31-consolidated-gap-register.md` | 11 P0s, 6 themes |

## 1. Purpose, Scope & Reading Guide

The audits found two different kinds of work. **Defects**: places where shipped code computes the
wrong truth — thirteen one-liner correctness bugs, four data-corruption flows in daily use, an
agent render stack that deletes every newline. **Missing structure**: loops the business runs on
that the data model cannot express — payment allocation, jobwork receipt, wage reconciliation,
stock take, payroll, chart of accounts. Phase-6 (A–J) hardens the platform; this spec repairs the
numbers the platform shows and closes the loops the factory runs on.

The program has three tiers:

1. **Trust tier (Batches 0–1)** — every displayed number correct and recoverable: the 13 hotfixes,
   the agent render stack, backup, timezone, test isolation, idempotency.
2. **Loop tier (Batches 2–6)** — the agent becomes conversational, and each of the six seams where
   two documents meet and truth leaks gets closed: GRN↔PO, jobwork out↔in, wage earned↔paid,
   invoice↔payment, DC colour/size, ledger↔physical stock.
3. **Depth tier (Batch 7 + Modules K/L/M)** — the capabilities legacy had that we ported thin or
   not at all: the costing calculator, payroll, final accounts, the knitting physics.

Reading guide: every requirement has a stable ID (usable in commits, tests, and the register), a
one-line statement, and acceptance criteria written as **observable behavior**. Evidence cites the
dive and file:line. Effort is in batches (1 batch ≈ one focused week of the established M1–M35
milestone rhythm). ~90 requirements across 11 batches.

## 2. Conventions & Severity

- **ID prefixes**: HFX- (hotfix), OPS- (ops), CHAT- (agent QoL), JWL- (jobwork), PAY- (money),
  PRC- (procurement/dispatch), INV- (inventory), PRG- (program flow), K-/L-/M- (depth modules).
- **Writes** follow ADR-001 two-doors-one-service: form server action and agent tool call the same
  posting service; every write flows through `runCommit` — the single audit choke point where
  idempotency, tolerance checks, and before-image capture belong.
- **Reads** ride the config-registry pattern (doc-configs / register-configs / master-configs /
  print registry) with bijection tests, URL-as-state filters, and CSV twins.
- **New Prisma models** stay lean: JSON columns over join tables for sparse data (precedent
  `LabTest.values`, `UserGroup.rights`); one model per concept.
- **Severity**: P0 = wrong truth in daily use or data-loss risk; P1 = correctness/completeness gap
  with workarounds; P2 = polish/depth.
- **Gates**: every milestone ships unit tests, route smoke, live browser verification, spec
  freeze, and context_check parity.

## 3. Batch 0 — Hotfix (½ batch, ships immediately)

**Problem.** Thirteen live correctness bugs — each a one-to-few-line fix, no migrations — plus the
agent render stack: four stacked defects that make every assistant message look broken (owner
issue 1). The transport layer deletes every newline (`/.{1,4}/g` at `route.ts:273` — `.` never
matches `\n`), the panel renders raw text (`agent-panel.tsx:467-469`), `remark-gfm` is not even a
dependency, and the system prompt has no formatting contract.

### 3.1 Correctness one-liners

| ID | Requirement | Acceptance criteria |
|---|---|---|
| HFX-01 | GRN guard: reject receipts that would corrupt multi-line POs; enforce PO status | `planGrn` refuses a GRN against a PO with >1 line until PRC-01 ships, with an error naming the limitation; GRN against `cancelled`/`completed` PO fails quoting that status (`posting/grn.ts:26-35`) |
| HFX-02 | Persist DC line colour & size | Commit writes `colourId`/`sizeId` on `PcsDespatchLine` (id-map precedent from GRN variants); DC view + courier/LAD print show colour & size for new docs (`posting/despatch.ts:59`) |
| HFX-03 | Cancelled docs excluded from party ledger + bills register | `party-ledger.ts:31` adds `status: { not: 'cancelled' }` (matches `outstanding-summary:185`); after cancelling an invoice, party ledger, bills register, and outstanding summary show identical balances |
| HFX-04 | Payment direction filters | `registers/recon.ts:60` and `chain-money-reports.ts:201` count only `direction:'in'` payments against a sales invoice's outstanding; an out-payment tagged with a sales invoiceNo no longer reduces AR |
| HFX-05 | On-account receipts consumed | The `partyReceipts` map (`chain-money-reports.ts:230-231`) is subtracted from party AR outstanding; a buyer paying on-account shows reduced outstanding on money reports |
| HFX-06 | Payment modes RTGS/NEFT | Mode select offers cash\|bank\|cheque\|rtgs\|neft\|upi (the schema comment's contract); new modes commit and print |
| HFX-07 | Wage-payment party picker fix | Picker lists parties the Party master can actually produce (align `doc-configs/wage-payments.ts:23` with `master-configs/party.ts:21-26`); employee parties selectable |
| HFX-08 | Journal sideEffects honest | `posting/journal.ts:33` drops "Cash/bank balance updated" (nothing updates it); sideEffects list contains only true claims; grep test pins the whitelist |
| HFX-09 | Kill the 'billed' ghost | Remove `'billed'` from the jobwork register filter (and the enum comment) until JWL-06 writes it; no filter can select a state nothing reaches |
| HFX-10 | PO status enum drift | `lifecycle.ts:145,151` writes `received` (existing `PO_STATUS` value) instead of `completed`; lifecycle transitions produce only enum values; enum test pins |
| HFX-11 | Valuation uom-mixing | `dashboard.ts:222` and `stock-register.ts:43` compute value as Σ per-uom (qty×rate) — never `(kgs+mtrs+pcs)×rate`; unit test with a mixed-uom bucket |
| HFX-12 | shiftWages readers → amount | `budget.ts:39,108`, `chain-money-reports.ts:348`, production-status read `amount` (the piece-rate wage actually posted) until L-06 resolves the column; daily-unit-pnl Wages & Margin are non-zero for any day with production |
| HFX-13 | Vitest pinned off the production DB | `vitest.config.ts` gains setupFiles setting `DATABASE_URL=file:./test.db` (+ reset); `npm test` never opens `custom.db` (asserted via `PRAGMA database_list`) |

### 3.2 Agent render stack (owner issue 1)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| HFX-14 | Real streaming, newline fidelity | Delete the `/.{1,4}/g` chunker (`route.ts:273`) and the `stream:false` fake-stream (`route.ts:255`); pass deltas through (or emit once); multi-line answers render with line breaks end-to-end; e2e asserts `\n` survives into the transcript |
| HFX-15 | Markdown + GFM rendering | Assistant text renders via react-markdown **+ remark-gfm (add the dependency)**: headings, bold, pipe tables, links, code blocks styled to the panel theme; no literal `##`/`**`/`\|` in output (`agent-panel.tsx:467-469`) |
| HFX-16 | Narration not overwritten | Text segments append per-step (buffer keyed by step id) instead of the `currentTextBuffer` replace (`agent-panel.tsx:247-260`); "Let me check stock…" persists after the tool call — in the UI and in the history sent next turn |
| HFX-17 | Auto-scroll works | Scroll ref attaches to the Radix ScrollArea Viewport (not the inner content div, `agent-panel.tsx:155/437` vs `ui/scroll-area.tsx:19-24`); long streams follow without manual dragging |
| HFX-18 | Non-OK responses surface inline | `res.ok` checked (`agent-panel.tsx:208-212`); 5xx/429 render an inline error chip with a Retry button — not a toast (the Toaster is still unmounted until PRD P0-1) |
| HFX-19 | One close control | Remove the duplicate X (`ui/sheet.tsx:75-78` vs panel `:431-433`); exactly one close affordance remains |

**Design notes.** All 19 are behavior-preserving small diffs. HFX-01 deliberately ships a *guard*
(fail loudly) rather than a partial fix — the real multi-line GRN is PRC-01. HFX-14+15 together
close owner issue 1; remark-gfm is a hard prerequisite because the model already emits pipe tables
(the ingestion prompt asks for one). The Toaster mount itself stays in the PRD P0 queue (item 1).

**Tests.** One regression test per HFX, each pinned to the cited file:line evidence. **Effort** ½
batch. **Dependencies** none.

## 4. Batch 1 — Ops Foundation (½–1 batch)

**Problem.** The production database has no backup — the de-facto backup is git-committing the
live SQLite file (hours-to-days loss window, non-atomic live copy, business data in a private
repo, no restore ever tested). The server runs UTC while the factory runs IST, so 00:00–05:29 IST
postings land on yesterday's business day (`toISOString().slice(0,10)` defaults) — wrong day-book,
wrong wage grouping, wrong daily P&L for a night-shift knitting unit. Unit tests run against the
production DB. Double-clicking Approve re-executes a write. These gate *trust in every number the
app shows*; they precede all feature work.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| OPS-01 | Nightly SQLite backup | `VACUUM INTO` snapshot on a cron/systemd timer; 7-day daily + 30-day weekly rotation; weekly `PRAGMA integrity_check`; monthly restore-verify to a temp DB; backups copied off-box (rclone/rsync target from an AppOption) |
| OPS-02 | WAL journal mode | `PRAGMA journal_mode=WAL` enabled at boot; backups use `VACUUM INTO` (consistent under WAL); the post-disk-full corruption class is eliminated |
| OPS-03 | IST day boundary | Process `TZ=Asia/Kolkata` + one `istToday()` helper in a shared date module; the ~30 `toISOString().slice(0,10)` default sites migrate (prodDate, attendance day, agent tools `today`, digest, register end-of-day filters); unit test pins 23:30 UTC = next-day IST |
| OPS-04 | Commit idempotency | `commitDocAction` and the agent approve route accept a client idempotency token; replays return the original result instead of re-posting; docNo uniqueness re-checked inside the commit transaction; double-click Approve posts exactly once |
| OPS-05 | Ledger docNos unique | Unique constraint on the StockLedger docNo family (ADJ/OPN/WST/GT/PT/RTC/RSP); existing duplicates migrated; a concurrent-plan test cannot mint two same-numbered rows |

**Design notes.** `scripts/recovery_drill.sh:40` currently runs `prisma db push
--accept-data-loss` *inside the recovery path* — the drill is rewritten to restore into a temp DB,
verify, then swap. Retention/archival of AuditLog/AgentTurn/StockLedger stays with Phase-6 FY-close
(FR-B); this batch only adds growth metrics to the digest. Vitest pinning was listed in dive 2's
batch 0 and the register's batch 1 — resolved here as **HFX-13 (Batch 0)** because it is a
10-line config change and tests corrupting live data is a daily risk.

**Tests.** Restore drill as a script + integration test; TZ boundary test; idempotency
double-submit test. **Effort** ½–1 batch. **Dependencies** none (parallel with Batch 0).

## 5. Batch 2 — Agent QoL & Screen-Awareness (1–1.5 batches)

**Problem (owner issues 2+3).** The agent is the product's differentiator — 230 tools,
plan-approve-commit, voice, upload — riding on a chat surface where the model never learns what
happened to its plans (prompt §4.2d demands seeing commit results the architecture never sends),
plans are client-only (approve re-executes the tool → TOCTOU drift; typed "approve it" mints a
duplicate plan), the post-commit result (doc number, links) is discarded, failed writes badge
"ok" (`tools.ts:1631` returns `{text: error}` with no error field), and the brain gets zero
dynamic context — no date, no user, no FY, no screen (`route.ts:231-239`). Meanwhile 76
pre-authored per-screen prompts sit unused in `menu-registry.ts`.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| CHAT-01 | Outcome events | Approve/reject/commit append a synthetic conversation event (`[Plan create_order APPROVED. Committed: SO-1042]` / `[... REJECTED. Reason: ...]`); on the next turn the model reports the commit result without hedging; prompt §4.2d/§6 become satisfiable |
| CHAT-02 | Dynamic context line | POST body gains `{screen:{pathname, docNo?}}`; the server prepends one dynamic system line — today (IST), user name+role, `activeFinYear()` (replacing the hardcoded '26-27' and G1–G3 prose at `prompt.ts:118-120`), current screen (menu title + docNo); "what's today?" and "yesterday's production" resolve correctly |
| CHAT-03 | Screen-aware suggestions | The panel reads `usePathname()` → `findItemByRoute()`; empty-state prompts = the screen's `agentPrompt` + up to 3 contextual chips (the 76 authored prompts become consumable); on `[id]` routes, doc-scoped prompts; the hardcoded defaults are fixed to real code formats (B-####, STY-####) |
| CHAT-04 | Post-answer follow-ups | After a read answer, 2–3 follow-up chips derived from the screen's `agentTools` domain; clicking seeds the composer |
| CHAT-05 | Plan cards show contents | creates/updates render as a compact table (field/value rows, ₹ en-IN formatting, resolved doc number e.g. SO-1042) — approving a ₹4-lakh order shows line items, not "Creates: 3 record(s)" (`agent-panel.tsx:550-581`) |
| CHAT-06 | Approve-by-id (kills TOCTOU) | Plans persist server-side (AgentTurn already stores plan JSON); Approve POSTs `{turnId}` and executes the *stored* plan; typed "approve it" resolves to the pending plan instead of re-running the tool; `updateMany` marks only that turn (today it marks ALL the user's pending turns, `approve/route.ts:35-38`); displayed plan == committed plan, asserted in test |
| CHAT-07 | Post-commit CTA row | After commit: View (opens the doc), Print (print route), Next-stage (from suggest_next_step) — all from data already in the response |
| CHAT-08 | Truthful outcome badges | `docTool` and master tools return an `error` field on failure (`tools.ts:1631`); the panel renders a red error chip; no failed write ever shows an emerald "ok" |
| CHAT-09 | Fuzzy lookup rescue | Lookup failures return top-3 candidates ("Did you mean 'LPP SA'?"); case-insensitive code+name matching at the buyer/party/style resolution seams (`posting/order.ts:13-14`) |
| CHAT-10 | Bounded master lists | The 12 `list_*` master tools accept `q` + `take` (default 20, cap 100) and report `total` + `truncated`; alphabetically-late masters remain reachable; the 8K tool-result slice reports truncation instead of silently dropping rows (`tools.ts:530-536`, `route.ts:380-385`) |
| CHAT-11 | Prompt formatting contract | Prompt §9 gains explicit rules (markdown allowed, headings ≤h3, tables for comparisons, ₹ en-IN, read answers ≤8 lines); PROMPT_VERSION bump + routing-eval rerun (≥90% gate) — the established process for prompt changes |
| CHAT-12 | Chat polish sweep | Composer autofocus; copy-message button; aborted tool chips → "stopped" state; dead SSE events (step-start/text-start/text-end/step-end/finish) consumed or removed; MAX_STEPS exhaustion surfaces a visible message; `list_orders.buyerId` filter honored; humanized tool-label map |

**Design notes.** CHAT-02+03 are one mechanism (screen context) — build once, fix both the
context-blindness P0 and the suggestions ask. CHAT-01 is ~20 lines and the single highest-leverage
change for owner issue 2. CHAT-06 properly subsumes PRD P0-5 (Approval Inbox buttons). Multi-turn
amnesia for tool results (history filtered to text only) is real but large; history trimming/cap
is logged as follow-up and deliberately not spec'd here.

**Tests.** A conversation e2e per requirement (approve → outcome event → model reports the result
without hedging); routing-eval gate for CHAT-11. **Effort** 1–1.5 batches. **Dependencies**:
HFX-14–19 land first (the render surface these build on).

## 6. Batch 3 — Jobwork Loop Repair (seam 2; 1 batch)

**Problem.** Jobwork is the core of the business and the loop leaks at every step past issue. The
JW- order is a header-only row whose sideEffects claim stock moves and ITC-04 lines that never
happen (`jobwork.ts:42` posts no stock; `itc04Line` has zero writers). Receipt *overwrites*
`totalQty` with the received quantity — sent-vs-returned truth is destroyed on first receipt
(`jobwork.ts:56`). Rejected receipts do not exist. The GAN acceptance gate is annotation-only (the
tool claims stock "posts after acceptance" — it never does). `'billed'` is a ghost status. The G3
'Jobworker Yard' godown is seeded and written by nothing. The one healthy leg (MDC/PDC despatch
out) has no matching validated return door.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| JWL-01 | JobworkOrder carries material lines + received/rejected | Model gains `lines[]` (item, qty, uom, rate) + per-line `receivedQty`/`rejectedQty`; JW- commit creates the lines; the register shows sent vs received per line |
| JWL-02 | JW commit posts stock, honest claims | JW- commit posts `process_delivery` OUT of the issuing godown (G1) with partyId; sideEffects text matches reality; `itc04Line` is written (ITC-04 register becomes real) or the claim is removed |
| JWL-03 | Receipt is cumulative, partial-aware | `planJobworkIn` does `receivedQty += qty` (never overwrite); status open→partial→completed; rejectedQty supported; send 100 / receive 60 / receive 40 → balance 0, status completed |
| JWL-04 | DC-return validated | `planDcReturn` resolves the DC (no free-text dcRef), guards qty ≤ sent − returned, flips the DC status in-transaction |
| JWL-05 | GAN is a real gate | `accept_jobwork_pcs` posts pcs INTO G2 on acceptance (today: approval row only); before acceptance, no stock moves |
| JWL-06 | bill_jobwork closes the loop | Aggregates received-not-billed per jobworker → jobwork invoice; writes `'billed'` (retires the HFX-09 ghost); the piece invoice links the JW docs |
| JWL-07 | Jobworker material statement | New register (config-registry) from StockLedger partyId on process_delivery/receipt: per item per party — kgs out, kgs in, loss %, WIP aging |
| JWL-08 | G3 wired or deleted | Either JW out writes G3 'Jobworker Yard' (WIP at jobworker becomes queryable stock) or the seed is removed — decide once (§17-2), implement once |
| JWL-09 | Contract linkage + process loss | The AL- allotment carries jobworkOrderId (contract → order → DC chain navigable); `checkProcessLoss` (dead code, dive 2 §2.4) is wired on receipt — over-tolerance loss flags and prompts a rejection entry |

**Tests.** Loop-closure test #2 (§15) through both doors. **Effort** 1 batch. **Dependencies**:
OPS-04/05 (idempotency + unique docNos before new posting paths).

## 7. Batch 4 — Money Integrity (seams 3+4; 1 batch)

**Problem.** Partial payments never settle an invoice — settlement requires `amount >= billAmount
- 0.01` and no allocation table exists (`payment.ts:27`); two receipts that together cover the
bill never flip it. Supplier payments tagged `invoiceNo` resolve a *sales* invoice and reduce AR
(`payment.ts:20,33` — direction-blind). There is no supplier-bill document at all — bill-pass
captures `{grnNo, comments}` (tools.ts:2405) — so the invoice→bill→payment story is "GRN value
minus undifferentiated payments-out". The entire tolerance engine (`threeWayMatch`,
`checkGrnVsPo`, 5%/3% process-loss checks) is dead code while the admin UI configures ~10 flags
nothing enforces. Money vouchers cannot be cancelled or reversed.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| PAY-01 | PaymentAllocation + FIFO settlement | Allocation rows {paymentId, invoiceId, amount}; `planPayment` allocates FIFO across open invoices; invoice status `partial` when 0 < allocated < billAmount, `settled` at full; outstanding = billAmount − Σ allocations; overpayment becomes labeled party credit |
| PAY-02 | Direction-correct invoice links | In-payments attach SalesInvoice; out-payments attach SupplierBill (post PAY-03); an out-payment tagged with a sales invoiceNo is rejected with guidance (`payment.ts:20,33`) |
| PAY-03 | SupplierBill document | SB-#### doc via the doc-config engine: billNo, billDate, amount, tax split, dueDate, status; lines linked to GRN; `create_bill_pass` captures real bill data; bill-pass approval becomes a real gate |
| PAY-04 | Wire the tolerance engine | SupplierBill commit calls `threeWayMatch` (PO vs GRN vs bill) + `checkGrnVsPo`; results stored (matchStatus, variance); the ~10 admin flags (grn_bal, grn_dev, dyeinggamtper, entrydatedev, tds_default_percent…) are enforced or removed from the admin UI (honest-claims rule) |
| PAY-05 | Received-not-billed + honest AP | supplier-pending gains a received-not-billed aggregate; AP payable derives from open SupplierBills (replacing the iteration-order GRN-value guesswork, `chain-money-reports.ts:248`) |
| PAY-06 | Money-voucher cancel/reversal | CANCEL_PLAN extends to {payment, journal, debit-note, expense, budget} with contra legs (audit-preserving); `planCancelInvoice` gains guards (live IRN, allocations exist → block with reason) |
| PAY-07 | Aging on due dates | dueDate/creditDays on SalesInvoice; aging buckets 0-30/31-60/61-90/90+ computed from dueDate (fallback invoice date); on-account credit visible per party |
| PAY-08 | Cheque/PDC lifecycle (decision-gated) | chequeNo/chequeDate/status issued→cleared→bounced on Payment; BankAccount linked (the master stops being dead data; invoice remit-to reads it); PDC register — or explicitly deferred per §17-3 |

**Tests.** Loop-closure #3 (wages) + #4 (partial payments). **Effort** 1 batch. **Dependencies**:
OPS-05 (docNo uniqueness) for allocation rows; PRC-01 (GRN lines) sharpens PAY-04.

## 8. Batch 5 — Procurement & Dispatch Closure (seams 1+5; ½–1 batch)

**Problem.** GRN receives only a PO's first line — `const line = po.lines[0]` (`grn.ts:34`) — so
multi-line POs are permanently unbalanceable and pending math zeroes on the wrong line. POs have
no amendment (a mis-keyed rate is unfixable without a new PO) and no purchase return. The DC
drops colour/size at commit (hotfixed as HFX-02; the structural fix lands here with the register
work) and has no `delivered` transition — LAD challans live forever in `'loading'`. Despatch has
no day-book register, no aging, and the `gendcdays` flag configures a digest section that doesn't
exist.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| PRC-01 | Multi-line GRN | GRN takes lines[] {poLineId, qty}; each PO line's receivedQty updates; PO status derives from all-lines math; a 3-line PO is fully received across 2 GRNs; loop-closure #1 green (retires the HFX-01 guard) |
| PRC-02 | PO amendment | `/procurement/po/amendments` + `planPoAmend` (rate/qty revision with version trail, like orders) + `update_purchase_order` tool; a mis-keyed rate is fixable with an audit trail |
| PRC-03 | Purchase return / GRN rejection | rejectedQty on the GRN line; PRN- return-to-supplier service (stock out; supplier pending unaffected); linked debit-note option (ties PAY-03) |
| PRC-04 | PO approval gate real | `planGrn` requires an approved PO when the flag is on (the Approval row is actually read); the gate's sideEffects text becomes true |
| PRC-05 | DC completion + LAD conversion | `'delivered'` transition + LAD→DC conversion (challans stop living in `'loading'` forever); despatch day-book register + aging |
| PRC-06 | gendcdays wired | DC aging from the flag feeds the digest non-return section; non-return detection by returnable-days (not only the manual `returnable:false` at creation) |
| PRC-07 | Gate pass ↔ document link | `refDocNo` validated against real docNos (suggest list); logged→cleared transition; DC-without-gate-pass recon card |
| PRC-08 | Logistics fields | LR/AWB, transporter, freight, cartons, gross weight on DC/courier + print |
| PRC-09 | DC→invoice bridge (decision-gated) | despatchId (or allocation rows) on SalesInvoice; cumulative invoice from selected DCs (legacy frmDelCumInv) — or parked per §17-6 |

**Tests.** Loop-closure #1 + #5. **Effort** ½–1 batch. **Dependencies**: HFX-01 already guards;
PAY-03 for return→debit-note.

## 9. Batch 6 — Stock Take & Valuation Unification (seam 6; 1 batch)

**Problem.** No stock-take or cycle-count exists anywhere in the codebase (grep-verified) — the
append-only ledger is unverifiable against physical reality, and a free-form ADJ- with a reason
string is the only correction door. Meanwhile three surfaces compute three different stock
values: closing-stock uses last-ledger-rate, the current-stock register and dashboard use a rate
frozen at bucket creation (`posting/ledger.ts:48-56` never updates rate on the update branch), and
the dashboard additionally sums across uoms before multiplying by rate. Period statements
silently truncate at 5,000 ledger rows (`closing-stock.ts:31`). Waste re-enters good stock at the
good-item rate, and waste-% — the core knitting KPI — is computable from no screen.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| INV-01 | Stock take cycle | StockTake (ST-####, godown, status open→counting→draft→committed) + lines {item, systemQty snapshot, countedQty, variance}; count-sheet print docType; committing the variance auto-drafts an ADJ- referencing ST-####; loop-closure #6 green |
| INV-02 | One valuation (WAC) | Moving weighted-average cost maintained in `bumpStock` in-branches; one shared `valueBucket()` consumed by closing-stock, current-stock register, and dashboard — all three surfaces show identical values; golden unit test |
| INV-03 | No silent truncation | The `take:5000` caps in closing-stock/itemwise-stock are replaced by groupBy/aggregate; a 10k+ row period statement is complete; the perf budget is preserved (indexes via INV-08) |
| INV-04 | Negative-stock guard | Configurable guard at `postLedger` (rejection/shortage/transfer/despatch paths pass it); an overdraft fails with an actionable error; flag-off preserves current behavior |
| INV-05 | Waste as an identity | Waste receipt posts to a waste item/godown identity at scrap rate (the WST- txnType already exists); waste-% report (WST- kgs ÷ production kgs per item/period) — the knitting KPI becomes computable |
| INV-06 | Ledger↔CurrentStock reconciliation | Scheduled compare of the cache against the append-only truth + a digest section; drift alerts with drift vectors identified |
| INV-07 | Opening stock gated | OPN- is postable only within the FY-start window (flag); ties into Phase-6 FY-close |
| INV-08 | Hot-path indexes | StockLedger indexes on (itemType,itemId), godownId, txnType via migration; register filters stop full-scanning; perf test re-run at 10k rows |

**Tests.** Loop-closure #6; valuation golden test; perf re-run. **Effort** 1 batch.
**Dependencies**: OPS-05; gates K-03/K-04 (the P&L material leg needs WAC).

## 10. Batch 7 — Program-Flow Revival (dive 1; 1 batch)

**Problem.** The program schema ported legacy's questions but the app can't ask them.
`ProgBalanceFabric` carries `colourId/designId/finDiaId/finGsm/ll` — the knitting specification —
with **zero writers** (legacy had a dedicated correction form). The nine-column balance waterfall
(req → po → dc → grn → progComp → trans/return/cancel/short → balance → finished) is 80% dormant:
`planProgram` writes only `reqKgs`, and `projectors.ts` is called only by the dormant posting
engine. Program requirements are hand-typed though `BomLine × order qty` could compute them. Order
lacks buyerPoRef/orderType/delivery schedule — the LPP ingestion put buyer PO "696GJ" in notes
free-text and split one buyer PO into five orders because of the single delivery date.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| PRG-01 | Order schema additions | `buyerPoRef`, `orderType` (export\|domestic\|trading), `OrderDelivery` lines {seq, qty, date} — migration + form + register filter + print; buyer POs are stored first-class; multi-shipment orders do not split |
| PRG-02 | Multi-style orders (flag-gated) | Form and `planOrder` accept per-line styles (the schema already allows it); flag off = current single-style behavior |
| PRG-03 | GSM/LL physics | The fabric program form writes colourId/designId/finDiaId/finGsm/ll; a correction variant with audit; the spec feeds 4-point grading later (Phase-6 F) |
| PRG-04 | Waterfall read model | The program-status register gains PO'd / DC'd / GRN'd / completed columns **derived from StockLedger txn types** (read model — no trigger writes, ADR-002 honored); projectors become a read service |
| PRG-05 | BOM→program pre-fill | "Propose from BOM" action on the program form + `propose_program_requirements` read tool (BomLine × order qty × wastage flag); one-click adopt into the required fields |

**Tests.** Walkthrough test: order → programs → PO/DC/GRN → waterfall columns close.
**Effort** 1 batch. **Dependencies** none hard; PRG-04 reads the existing ledger.

## 11. Module K — Costing Depth (1 batch)

**Problem.** The cost sheet is a snapshot, not a calculator: six hand-typed heads, a naive sum,
and `marginPct` stored-never-computed (its sideEffects text "Margin % recalculated" is
aspirational copy). Legacy had a component master (`FrmPreCostingCompMas`), multi-level costing
(`Frm_CostingInput`), an actuals rollup (`Frm_ProductionCost`), per-pc derivation, and
est-vs-actual. The raw ingredients for all of it already exist in our schema: `BomLine.rate`,
ProductionEntry amounts, wage journals, StockLedger consumption.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| K-01 | Component library | CostComponent master (~30-line master-config: name, unit, rate, category); cost-sheet heads quote from the library instead of re-typing every figure |
| K-02 | Computed cost sheet | Calculator mode: cost = Σ BOM × order qty at stored rates (+ manual overrides); per-pc derivation; marginPct computed = (selling − cost)/selling (the sideEffects text becomes true); versioning preserved |
| K-03 | Estimated vs actual | Actual rollup per order×cost-head (ProductionEntry amounts + wage journals + consumption at WAC); comparison view on the Order Hub with deltas |
| K-04 | Daily unit P&L material leg | daily-unit-pnl margin = amount − wages − expenses − material (at WAC); the P&L stops being wage-margin-only |

**Tests.** Golden costing case (known BOM → known per-pc cost → known margin); est-vs-actual
walkthrough. **Effort** 1 batch. **Dependencies**: INV-02 (WAC) for K-03/K-04.

## 12. Module L — Payroll (1–1.5 batches)

**Problem.** Wage earned↔paid never reconciles: wage bills post journals **without partyId**
while wage payments post a Payment + companion journal **with** the employee-party's id — so in
the party-ledger formula the two cancel exactly and the employee-party balance is openingBalance
forever. "How much do I still owe operator X?" — the weekly Tirupur question — is unanswerable.
Beyond that: piece-rate only (`dailyWage` is display data; attendance `half` has zero wage
effect), no PayrollRun/Payslip, no statutory PF/ESI/PT/LWF (zero hits; statutory for ≥20
workers), cross-midnight shifts are unrecordable (`outTime ≤ inTime` rejected), and the employee
master lacks the fields payouts and statutory registers need.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| L-01 | Wage reconciliation | Operator statement: earned (queryWages period) − paid (wage payments per employee-party) = owed; wage bills post with partyId; Employee create auto-creates/links the 1:1 employee-party; loop-closure #3 green |
| L-02 | PayrollRun + Payslip | Run per period (piece\|daily): lines per employee — piece earned, or attendance×dailyWage ('half' = 0.5), advances, net; payslip print docType; commit posts the wage journal with partyIds |
| L-03 | Statutory payroll | PF/ESI/PT/LWF configurable rates on the run; deductions computed; statutory registers + challan data export |
| L-04 | Attendance depth | Cross-midnight shifts (outTime ≤ inTime → +1 day), OT hours + rate, late logic, minimal leave model; Shift master gains breaks/weekly-off/OT-rate |
| L-05 | Employee master payout fields | joining date, designation, bank/IFSC, UPI, phone, UAN/aadhaar (masked); consumed by payslip and payouts; wage-slip + piece-rate-confirmation prints |
| L-06 | shiftWages resolved | The production-entry shift door writes `shiftWages` (ADR-019) — or the column is dropped; no dead-column state remains (HFX-12 was the interim) |

**Tests.** Loop-closure #3; payroll walkthrough (attendance × dailyWage → payslip → payment →
owed zero). **Effort** 1–1.5 batches. **Dependencies**: PAY-01 (allocation semantics) soft.

## 13. Module M — Final Accounts (1–2 batches)

**Problem.** Journals post against free strings — `debitAccount/creditAccount` with no validation
and no master (`schemas/journal.ts:7-8`) — while account names are hardcoded across services
('Cash/Bank', 'Production Wages', 'Output GST'). There is no chart of accounts, no trial balance,
no day-book, no cash-book, no P&L or balance sheet among the 28 report slugs, and the journal's
sideEffects even claim "Cash/bank balance updated", which the file header itself denies. Tally
export is sales-side only with a single 'Output GST' ledger.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| M-01 | Account master (CoA) | Account {code, name, type asset\|liability\|income\|expense\|equity, parent, active}; seeded standard tree; journal FKs (debitAccountId/creditAccountId) with backfill of existing free strings; a journal cannot save an unlinked account |
| M-02 | True double-entry posts | payment/debit-note/expense/budget commits post legs against CoA accounts (replacing hardcoded names); cash/bank resolved from mode + BankAccount; every money doc's sideEffects claims become true |
| M-03 | Final-accounts reports | Trial balance (debits == credits asserted), day-book, cash-book, minimal P&L + balance sheet — registry pattern + CSV + agent tools |
| M-04 | Tally both sides | SupplierBill/DebitNote/Expense vouchers in the export; CGST/SGST/IGST split ledgers; Tally XML option (decision §17-4) |
| M-05 | Expense heads | ExpenseHead master (legacy FrmMasExpenses port); expense category from the master; budget-vs-actual finally includes expenses |

**Tests.** TB balance test on seeded data; journal FK guard test. **Effort** 1–2 batches.
**Dependencies**: PAY-03 and L-02 improve M-02/M-03 completeness.

## 14. Schema Prerequisites & Phase-6 PRD Amendments

| # | Amendment | Rationale |
|---|---|---|
| AM-1 | **SalesInvoiceLine before Module G** — lines {styleId?, itemName, hsn, qty, uom, rate, discount, gstRate, amount}; header keeps totals and gains currency/fxRate/dueDate | FR-G2's own acceptance criterion ("per-rate B2B items") is unbuildable against the header-only invoice (schema:558–592; print derives HSN by qty-proportioning order lines, `print/fetchers.ts:69-76`). **Owner flag: Module G start is gated on this.** Per-line HSN, per-rate GST, real e-invoice payloads, and Tally item detail are all blocked by the same missing table |
| AM-2 | P0 queue expansion | Add: remark-gfm + real streaming (HFX-14/15 — the PRD P0 #2/#3 fix is incomplete without them); backup/TZ/vitest (OPS-01/03 + HFX-13 — they gate trust in every number); the 13 hotfixes (Batch 0) |
| AM-3 | FR-B3 (tool rights) unchanged | Dive 3 sharpened the evidence (any logged-in user can call all 230 tools, including `update_user_group`, `update_app_option`, `approve_pending`) — ships per the PRD Module B plan, no re-plan |
| AM-4 | FR-B8 sequencing note | B ships inventory locks but no stock take — INV-01 is what the locks are *for*; sequence B after Batch 6, or accept locks-without-take initially |
| AM-5 | Modules D/E/F untouched | Dive-1/2/3 items (K/L/M, PRG) do not overlap D (planning/IE), E (maintenance/OEE), F (AQL/DHU/4-point) — no re-plan needed |

## 15. The Loop-Closure Test Family (gate for Batches 3–6)

One end-to-end test per seam; each runs the full document chain through **both doors** (form
server action + agent tool — ADR-001 parity), against a pinned throwaway DB:

| # | Seam | Test walkthrough | Asserts |
|---|---|---|---|
| 1 | PO → GRN | 3-line PO → 2 GRNs covering all lines | per-line receivedQty correct; PO completed; pending 0 |
| 2 | Jobwork | JW 100 kg out → returns 60 + 40 → bill | sent 100 / received 100 / balance 0; stock round-trips; status billed |
| 3 | Wages | earn ₹1,000 (production) → pay ₹600 | operator statement shows ₹400 owed |
| 4 | Invoice → payment | invoice ₹1,000 → receipts ₹400 + ₹600 | status settled via allocations; outstanding 0 |
| 5 | DC | commit DC with colour/size → deliver | colour/size in view + print; delivered transition |
| 6 | Ledger ↔ physical | seed stock → take → count variance → commit ADJ | post-take ledger == counted; variance traceable to ST-#### |

Plus two standing guards: (a) every HFX gets a regression test pinned to its evidence line;
(b) an honest-claims sweep — a test asserting that every `sideEffects` string in doc-configs
matches a whitelist of implemented claims (HFX-08, JWL-02, K-02, M-02 retire the known liars, and
the test keeps future ones out).

## 16. Sequencing, Dependencies & Effort

| Batch | Name | Effort | Hard deps | Closes |
|---|---|---|---|---|
| 0 | Hotfix + render stack | ½ | — | 13 bugs + owner issue 1 |
| 1 | Ops foundation | ½–1 | — | trust: backup / TZ / idempotency |
| 2 | Agent QoL + screen-awareness | 1–1.5 | Batch 0 render | owner issues 2+3, context blindness |
| 3 | Jobwork loop | 1 | OPS-04/05 | seam 2 |
| 4 | Money integrity | 1 | OPS-05 | seams 3–4 |
| 5 | Procurement & dispatch | ½–1 | HFX-01 | seams 1, 5 |
| 6 | Stock take + valuation | 1 | OPS-05 | seam 6, valuation unity |
| 7 | Program-flow revival | 1 | — | dive-1 gaps |
| K | Costing depth | 1 | INV-02 | calculator costing |
| L | Payroll | 1–1.5 | PAY-01 (soft) | wage loop, statutory |
| M | Final accounts | 1–2 | PAY-03 (soft) | CoA, TB, Tally both sides |
| — | Phase-6 A–J (per PRD) | 19 | AM-1 gates G | platform hardening |

Total remediation: **~9–11 batches** on top of Phase-6's 19. Recommended interleaving: **0 → 1 → 2
immediately** (all small, user-visible, de-risking — the owner's three chatbot issues close inside
the first two weeks); **3–6 before or interleaved with A–J** (Module B first, since FR-B3 fixes
tool rights and FY-close pairs with OPS); **7 / K / L / M as amendments** once the loop tier is
green. **Minimal path if scope compresses**: Batches 0, 1, 2 + the six loop-closure tests — the
truth-telling core; everything else can wait a quarter.

## 17. Open Decisions for the Owner

1. **Backup off-box target** (OPS-01): rclone/rsync to where? Owner provides the destination.
2. **G3 'Jobworker Yard'** (JWL-08): wire as the WIP-at-jobworker godown, or delete the seed?
3. **Cheque/PDC lifecycle** (PAY-08): full lifecycle now, or defer?
4. **Tally export format** (M-04): stay JSON, or add Tally XML?
5. **Multi-style orders** (PRG-02): enable per-line styles, or keep single-style orders?
6. **Cumulative DC→invoice** (PRC-09, legacy frmDelCumInv): build or park?
7. **SalesInvoiceLine** (AM-1): land ahead of Module G as a prerequisite batch, or re-plan
   Module G around it? (FR-G2 is currently unbuildable — owner flag.)
8. **Final-accounts scope** (Module M): confirm the minimal set (CoA + TB + day-book/cash-book)
   is the target, matching the legacy FrmPLReg "DECIDE" disposition.

## 18. Traceability

~90 requirements: HFX 19 · OPS 5 · CHAT 12 · JWL 9 · PAY 8 · PRC 9 · INV 8 · PRG 5 · K 4 · L 6 ·
M 5. Every requirement traces to a dive finding (dive docs carry the file:line evidence); every
dive P0 maps to at least one requirement here; the consolidated register's six themes map: T1
loop closure → Batches 3–6; T2 honest claims → HFX-08/09, JWL-02, K-02, M-02, PAY-04; T3
orphaned substrate → CHAT-03, PRG-03/04/05, JWL-09, PAY-04; T4 context blindness → CHAT-02,
OPS-03; T5 trust infrastructure → Batch 1; T6 read-model poverty → CHAT-05, INV-02/03/05, PRG-04,
K-03.





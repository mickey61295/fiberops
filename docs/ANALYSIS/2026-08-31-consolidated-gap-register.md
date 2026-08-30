# Consolidated Gap Register — All Deep Dives Unified

Date: 2026-08-31 · Status: consolidated audit register (read-only) · Sources: three deep dives
+ the Phase-6 PRD, all code-verified against the M35 codebase.

## 1. Purpose & Sources

This register consolidates every finding from the three deep dives triggered by the owner,
cross-references them against the Phase-6 PRD (modules A–J, P0 queue), and proposes one unified
batch roadmap. Detail and file:line evidence live in the dive docs — this is the master index.

| # | Dive | Doc | Focus | Findings |
|---|---|---|---|---|
| 1 | Order/Program/Costing vs legacy | `2026-08-30-order-program-forms-vs-legacy.md` | depth vs legacy FiberPro | 8 gaps, 3 thinner, 9+ parity |
| 2 | Remaining domains | `2026-08-30-deep-dive-2-remaining-gaps.md` | money, HR, procurement, jobwork, dispatch, inventory, ops | 66 findings, 6 P0 |
| 3 | Agent/chatbot QoL | `2026-08-31-agent-chatbot-qol-study.md` | rendering, conversation flow, screen-awareness | ~30 new, 2 P0 + 4 PRD-P0 confirmed |

## 2. Executive Summary

The application has reached functional parity at the *document* level — every legacy form family
has a modern surface, and the agent reaches all of it. Three audits later, the residual risk
concentrates in five statements:

1. **The commercial chain doesn't close its loops.** Six seams where two documents meet and
   truth leaks: GRN receives only a PO's first line; jobwork out↔in is split-brain (sent qty
   overwritten, no stock move, 'billed' never written); wage earned↔paid never reconciles
   (employee party ledger nets to zero); partial payments never settle invoices; DC lines drop
   colour/size; and there is no stock take to verify the ledger against reality.
2. **The interface's claims outpace the physics.** SideEffects that lie (jobwork "ITC-04 line
   generated", journal "Cash/bank balance updated"), ghost states ('billed' filter with no
   writer), annotation-only gates (PO approval, GAN acceptance, rate confirmation), dead engines
   (tolerance.ts, 10+ admin flags, posting-engine), failed writes badged "ok" in the chat panel.
   The codebase admits most of this in comments — the honesty culture is real, but the user-facing
   claims must match.
3. **The agent is the differentiator and the liability.** Best-in-class substrate (230 tools,
   plan-approve-commit, voice, upload, chain guidance) rides on a chat surface that can't format
   a newline, a brain that never learns approval outcomes, and zero dynamic context (no date, no
   user, no screen). Screen-aware suggestions need no new content — 76 authored prompts sit unused.
4. **Trust infrastructure is missing.** No backup of the production DB (git-commit-as-backup),
   server runs UTC while the factory runs IST (night-shift postings land on yesterday), unit
   tests run against the production database, no duplicate-submit guard, no rights enforcement
   at tool dispatch.
5. **Depth debt is catalogued and batchable.** Costing is a snapshot not a calculator; program
   lost the knitting physics; payroll never closes; there is no chart of accounts or final
   accounts; invoices are header-only — which blocks the PRD's own FR-G2.

## 3. Cross-Cutting Themes (each theme spans multiple dives)

**T1 — Loop closure (dive 2, §1).** The six seams. P0s: GRN-first-line, jobwork split-brain,
wage reconciliation, payment allocation, stock take. Also: DC→invoice manual, PO amend absent,
received-not-billed untracked.

**T2 — Honest claims (dives 2+3).** Everything the UI says must be true: false sideEffects,
ghost 'billed' status, annotation-only approvals, dead flags configured in admin UI, chat error
badges, PRD's own FR-G2 contradiction (per-rate B2B items unbuildable on header-only invoices —
`SalesInvoiceLine` must precede Module G).

**T3 — Orphaned substrate (dives 1+2+3).** Built-but-unwired assets that make fixes cheap:
ProgBalance waterfall columns, GSM/LL columns, `tolerance.ts`, `activeFinYear()`, G3 godown,
`itc04Line`, `shiftWages`, 76 `agentPrompt`s, `findItemByRoute()`, jump.ts, register
`askPrompt+filtersAsText` pattern. Nearly every recommendation is "wire the existing asset,"
not "build new."

**T4 — Context blindness (dives 2+3).** The agent gets no date/user/screen; the server runs UTC
while dates default to `toISOString().slice(0,10)`; FY hardcoded '26-27' at ~15 sites and in the
prompt; finYear/valuation/aging all frozen. One `istToday()` + one dynamic system line + one
`screen` POST field fixes a whole theme.

**T5 — Trust infrastructure (dive 2 §8, dive 3 §2.5).** Backup/restore, WAL, integrity checks,
idempotency tokens, unique ledger docNos, vitest DB pinning, rights at tool dispatch (FR-B3).

**T6 — Read-model poverty (dives 1+2).** One "actual" where legacy showed a five-step waterfall;
plan cards show counts not contents; no aging/due dates/credit limits; three contradictory stock
valuations; take:5000 truncation; waste-% (the core knitting KPI) not computable from any screen.

## 4. The Unified P0 Table

| P0 | Dive | One-line | PRD status |
|---|---|---|---|
| GRN receives only PO line 1 (`grn.ts:34`) | 2 | multi-line POs unbalanceable; pending math lies | not covered |
| Jobwork loop split-brain (`jobwork.ts:42,56`; GAN false gate; 'billed' ghost) | 2 | core business loop leaks at every step past issue | not covered |
| Wage earned↔paid reconciliation structurally zeroed (`party-ledger.ts:41`) | 2 | "what do I owe operator X?" unanswerable | not covered |
| No payment allocation (`payment.ts:27`) + 4 AR/AP math bugs | 2 | partial payments never settle; outstanding wrong | not covered |
| No stock take / cycle count | 2 | stock ledger unverifiable | not covered (B8 locks ≠ take) |
| No backup / UTC day-boundary / vitest-on-prod-DB | 2 | trust in every number the app shows | not covered |
| Agent render stack (SSE newline regex, raw text) | 3 | owner issue 1 | **PRD P0 queue #2,#3** (+ remark-gfm, + 6 more layers found) |
| Agent outcome-blindness (`route.ts:231-239`, no approve events) | 3 | owner issue 2 root cause; prompt demands the impossible | not covered |
| Zero dynamic context (no date/user/screen) | 3 | model can't resolve "yesterday"; lies when masters change | not covered |
| Rights not enforced at tool dispatch | 3 | any user → all 230 tools | **PRD FR-B3** (evidence sharpened) |
| Header-only SalesInvoice | 2 | blocks FR-G2's own acceptance criteria | **contradicts PRD** — flag to owner |

## 5. PRD Coverage Map (A–J vs the dives)

**Covered by PRD (don't re-plan):** auth suite (A), admin platform/roles/audit-v2/number-series/
FY-close/controls/locks (B), personalization (C), planning-IE (D), maintenance/OEE (E), quality
depth AQL/DHU/4-point (F), GST payloads/e-way/TDS (G), print platform (H), notifications (I),
PWA (J), P0 queue items 1–5 (+profile, chat history).

**Not covered — needs PRD amendment or new modules (the consolidated proposal):**

| Proposal | Contents | Source |
|---|---|---|
| **Expand P0 queue** | +remark-gfm/streaming fix; +backup/TZ/vitest batch (ops P0s); +13 one-liner correctness hotfixes | dives 2+3 |
| **Module K — Costing depth** | BOM×qty per-pc calculator, computed margin, est-vs-actual, component library | dive 1 |
| **Module L — Payroll** | wage reconciliation (earned−paid), payroll run + payslip, statutory PF/ESI/PT, OT/leave, employee-party link | dive 2 |
| **Module M — Final accounts** | Account master, journal FKs, trial balance / day-book / cash-book, Tally purchase side | dive 2 |
| **Loop-closure batches B1–B2** | jobwork loop repair; money integrity (PaymentAllocation + SupplierBill + wire tolerance engine) | dive 2 |
| **Chat QoL batch** | outcome events, screen-awareness (76 prompts + ctx field), plan-card contents, post-commit CTAs, fuzzy matching | dive 3 |
| **Schema prerequisites** | SalesInvoiceLine before G; buyerPoRef/orderType/delivery-schedule; Program GSM/LL writers | dives 1+2 |

## 6. Unified Batch Roadmap (recommended sequence)

| Batch | Name | Effort | Contents | Closes |
|---|---|---|---|---|
| 0 | **Hotfix** | ½ | 13 one-liner correctness bugs (dive 2 §11) + render-stack layers 1–3 (real streaming, react-markdown+GFM, overwrite fix, auto-scroll, res.ok) | T2/T6 quick wins, owner issue 1 |
| 1 | **Ops foundation** | ½–1 | Backup (VACUUM INTO + WAL + integrity + restore drill), TZ=Asia/Kolkata + istToday(), vitest DB pin, idempotency tokens, unique ledger docNos | T5, T4 (date half) |
| 2 | **Chat QoL + Screen-awareness** | 1–1.5 | Outcome events, ctx injection + 76-prompt suggestions, plan cards, post-commit CTAs, error badges + fuzzy, master-list q/take, prompt formatting contract | owner issues 2+3, T4 |
| 3 | **Jobwork loop repair** | 1 | receivedQty + material lines, real stock moves, DC-return validation, bill_jobwork, jobworker statement, G3 wiring | T1 (seam 2) |
| 4 | **Money integrity** | 1 | PaymentAllocation + FIFO + partial status; SupplierBill + wire threeWayMatch; direction filters; received-not-billed | T1 (seams 3–4) |
| 5 | **GRN/PO repair + DC attributes** | ½–1 | multi-line GRN, PO-status guards, PO amend, purchase return, DC colour/size, DC completion/aging | T1 (seams 1, 5) |
| 6 | **Stock take + valuation** | 1 | StockTake/Line + count sheet + variance→ADJ; WAC + valueBucket(); take-cap→groupBy; waste identity + waste-% | T1 (seam 6), T6 |
| 7+ | **PRD Phase-6 as planned** | 19 | A–J (B first: roles/audit/number-series/FY — its FR-B3 fixes tool rights; FY-close pairs with batch 1) | platform |
| 8 | **Depth modules** | 3–4 | K costing (dive 1), L payroll, M final accounts, invoice-lines prerequisite for G | T6, FR-G2 fix |

Batches 0–2 are small, user-visible, and de-risk everything else (trust + the agent surface).
Batches 3–6 are the loop closures — each is one seam. Then Phase-6 A–J runs on a foundation
whose numbers can be believed, and K/L/M slot as amendments.

## 7. Honesty Notes

- Every claim in all three dives was code-verified (file:line quoted in each doc; 19 dive-2
  claims and all dive-3 P0/P1 claims independently re-read by the main agent).
- Legacy-behavior claims (dives 1–2) are reconstructions from form-taxonomy.json + REQUIREMENTS
  + parity map since `source-erp/` is gone — absence claims are firm, behavior claims are
  inferences.
- Dive 3 corrected its own explorers twice during verification: 76 (not ~100) authored
  agentPrompts; the prompt's "summary table" instruction exists but is ingestion-scoped (line
  83), so the general formatting contract is indeed absent. Rights-bypass was already planned
  as FR-B3 — recorded as evidence, not a new finding.

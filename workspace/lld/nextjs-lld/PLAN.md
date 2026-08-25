# PLAN — Joms/Next.js Rewrite: Master Build Plan

**For:** the software agent building this app · **Maintained by:** agent (update `PROGRESS.md`, not this file, during execution)
**Design source of truth:** docs `00`–`11` in this folder + the two analysis files at repo root (`FIBERPRO_DEEP_ANALYSIS.md`, `FIBERPRO_BUSINESS_ANALYSIS.md`). Code never contradicts these; if reality wins, update the doc in the same change.

## 1. Mission

Rebuild the Joms/Fiberpro Tirupur knitwear job-work ERP (322 legacy forms, ~440 SQL objects, ~330 reports, 189 flags) as a Next.js application with 1:1 feature parity, **plus** two added requirements: QR end-to-end tracking (08) and the AI harness (09). Finance and analysis are first-class: costing/P&L, commercial settlement, MIS, and value-aware tracking are core workstreams, not afterthoughts.

## 2. Non-negotiable build rules

1. **Legacy folder is read-only.** All new code lives in a fresh app directory (suggested `app/` repo `joms-web` created beside these docs). Only `.md` files may be created inside the analysis folder.
2. **One home per rule** (01 §2): posting math → PostingEngine; balances → Projectors; validation → zod + services; numbering → NumberingService. No business math in components or route handlers.
3. **Every document action is one DB transaction** (03 §3). No exceptions.
4. **Parity guardrails:** the dead-code register (11 §4) is *not ported*; the live-defect register (11 §3) is fixed-by-design unless a row says "sign-off needed"; legacy message strings are kept verbatim where user-visible.
5. **Flags are runtime config** (07): all 189 legacy names verbatim + Part-3 additions; never hard-code defaults from this customer's store.
6. **Docs move with code:** any behavior change updates the owning doc (02 routes / 03 matrix / 04 endpoints / 05 events / 06 screens / 07 flags-reports / 08-09 additions) in the same commit.
7. **AI never bypasses the engine** (09): drafts → review → same services, same rights.
8. **Tracking is a by-product of postings** (08 §5): no parallel data entry.

## 3. Finance & analysis provisions (explicit, per requirement)

| Capability | Where designed | Stage |
|---|---|---|
| Budget vs actual per order (yarn/fab/acc/process legs, tax toggle, grpref consolidation) | 03 §9, 02 §14 | S6 |
| Daily unit P&L (shift/contractor/jobwork at budget rates; overhead pro-rata) | 03 §9 (`Sp_DailyUnitPANDL` parity) | S6 |
| Quick-costing cube (4 expense levels → ST_Cost_*) | 03 §9, 02 §14 | S6 |
| Cumulative process-rate engine (cost/kg through the chain; values everything) | 03 §4.5 (verified vs root trigger) | S5 |
| Party outstanding **in value** at cumulative rate; unbilled accrual (to-be-value) | 03 §5, 04 §9 | S5 |
| Bills/bill-pass with TDS, GST (CGST/SGST/IGST by state), debit notes, payments | 02 §13, 04 §9 | S5 |
| Tally export hand-off; GST/TDS registers | 07 §1.2 | S5 |
| WBS/T&A with RAG + plan-vs-actual %; MIS dashboards & meeting packs | 02 §2/§4, 04 §3 | S6 |
| **Tracking × finance:** order river value columns (qty × cumulative rate per stage), cost-at-node genealogy, loss-in-money terms | 08 §6 (2026-08-15 addition) | S7 |
| AI narrator/digests on financial registers (Tamil) | 09 §3 skills 11-13 | S8 |

## 4. Stages, exit criteria, and gates

### Stage 0 — Environment & live-DB extraction (BLOCKING for S2+)
Exit: dev env runs; DB extract pack saved under `design/db-extract/` (read-only reference); blockers in 11 §6 closed.
- S0.1 Next.js + TS scaffold, lint/format/CI, env/secrets handling (no `sa` in code — 01 §5).
- S0.2 Live-DB extract: `sp_helptext Sp_currentstock` (+ `_RollDtl` diff), full proc/trigger/view catalog diff vs shipped folders, schema snapshot (DDL) of `Mas_/Trs_/ST_/WBS_/Pay_/Pro_/Prog_/Options` tables, sample rows (masked) for masters.
- S0.3 Decide + document repo layout, connection pooling, migration tooling for **new additive tables only** (Track*, ReportJob, AiActionLog…). Legacy schema untouched.

### Stage 1 — Foundation
Exit: login works (company→finyear→user), rights-driven menu renders, flags API serves all 189+ names, UI kit (DataTable/LineGrid/pickers/MasterCrud) demo-able.
- Session/rights (01 §3.1-3.2), `/api/config` + FlagsProvider, NumberingService, error contract, ERPShell/MobileShell, ui + data + pickers + document primitives (02 §21).

### Stage 2 — Vertical slice: GRN 'Process' end-to-end ← **proves the core**
Exit: a fabric process GRN saved in one transaction posts CurrentStock (via extracted `Sp_currentstock` semantics), creates the dyed identity, fires ProgBalanceFabricProjector + sync flags, appears in stock register + order river (qty), prints GRN, reversal works via compensating posting.
- PostingEngine (fabric ledger first), projectors infra + outbox, GRN wizard + roll detail, report job runner (jobId), print layout with preprint overlay, `Sp_currentstock` parity tests vs extracted body.

### Stage 3 — Material loop breadth
Exit: all TrType/GrnType rows of matrix 03 §4.1 implemented + reversal; registers read correctly vs legacy views.
- DC family (all types incl. reprocess 'R', ready-to-cut 20, transfers 3/8/14/17), purchase POs+tolerances+approvals, stock registers/ledger/transfers/acks/adjustments/roll split, lot life, cutting ack (dept −7 pool).

### Stage 4 — Production, pieces & payroll capture
Exit: manual + barcode production paths produce identical ledgers as legacy on a golden set; scan station works offline.
- ProdEntry dispatcher parity (incl. `_2`/ReWrk path, Spl_Operation skip, header-per-size decision documented), panel/assembly, rejections, line in/out/tfr, piece DC/GRN (+LineStk, GAN rework path), barcode trio with corrected defects (11 §3 #4-#6,#8), ST_Production_Data projector (5 types), wages accrual hooks.

### Stage 5 — Commercial & finance core
Exit: bill→pass→TDS→payment chain, sales invoice with GST split, debit notes, party balances (abs/prog/value), cumulative rate engine verified against root trigger on sample orders (excl. hardcoded-test defect).
- 04 §9 endpoints; unbilled accrual; HSN/state logic; Tally export; e-way fields.

### Stage 6 — Analysis & finance intelligence
Exit: budget-vs-actual, daily P&L, quick-costing cube, WBS/T&A RAG, MIS dashboards + meeting packs reconcile with legacy outputs on the same DB (parallel-run comparison pack).
- 03 §9 pipelines as services + projectors; `Temp_*`→jobId staging throughout.

### Stage 7 — QR tracking (08 phases)
Exit (per phase): P1 labels+read-only river; P2 backfill of in-flight orders; P3 native event emission + reconciliation exceptions in daily pack; value columns live.
- TrackUnit/Edge/Event tables, signed codes (internal + GS1-DL external), label service, scan-anything, TraceProjector + quantity law, policy editor, migration jobs.

### Stage 8 — AI harness (09 risk-ascending)
Exit per step: read-only Q&A/digests → bill/GRN parsing with review → order-sheet parsing (gated on golden-set thresholds) → voice drafting → triage.
- Capture/perception/extraction layers, MasterMatch + aliases, ParseReviewScreen, eval harness + CI gates, cost governance, admin console.

### Stage 9 — Migration, parallel run & hardening
Exit: parallel-run report (legacy vs new) green for one finyear month; perf budgets met; security pass (secrets, rights matrix, AI kill switches); cutover runbook.

## 5. Standing gates (apply at every stage)

- **G1 Transaction test:** every new document action has a mid-failure test proving atomicity.
- **G2 Parity test:** golden input → compare ledger/balance rows vs legacy proc outputs (where legacy runnable) or vs matrix expectations.
- **G3 Reversal test:** every posting has a compensating delete that restores exact prior state.
- **G4 Docs sync:** owning doc updated in same PR (rule 6).
- **G5 Rights/flags:** new screens are rights-gated and flag-defaulted OFF if they're additions.

## 6. Risk register (top items)

| Risk | Mitigation |
|---|---|
| Live DB drift vs shipped SQL | S0.2 diff; per-module re-extract before build (11 §6.3) |
| `Sp_currentstock` semantics wrong | parity tests vs extracted body (S2) |
| Trigger-recompute subtleties (guards: pokgs, @Cnt, dept-8-or-grp) | Projector specs in 03 §5 carry them; unit tests per guard |
| Piece/bundle payroll double-count legacy defects | corrected counters (11 §3 #6); sign-off item |
| Report parameter sprawl | extract per-report from `.mrt` at implementation time; registry-generated |
| AI accuracy on vernacular docs | eval gates + shadow mode (09 §7); default-OFF flags |
| Solo-dev scope creep | TASKS.md is the only backlog; new ideas → backlog, not code |

## 7. Artifacts the user carries to the build

This folder **is** the artifact pack: analysis docs (2), LLD set (00–11), PLAN/TASKS/PROGRESS (this trio), `architecture/` and `reverse-engineering/output/` inventories, legacy SQL/report folders (read-only reference), and — after S0.2 — `design/db-extract/`.

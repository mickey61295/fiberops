# TASKS — Build Backlog (agent-executable)

**Rules for the agent:** work top-down within a stage; one task = one PR-sized change; tick the box and add a line to `PROGRESS.md` → Change log when done; if a task reveals a doc error, fix the owning doc first (G4). Sizes: S ≤半天 / M ≤2d / L ≤1w. Refs point at design docs.

## Stage 0 — Environment & live-DB extraction

- [ ] S0.1 (M) Scaffold Next.js App Router + TS app (`joms-web/` beside this folder); ESLint/Prettier; CI lint+build; env schema (DB conn, secrets) — PLAN §2.1
- [ ] S0.2 (L) **DB extract pack** → `design/db-extract/`: `Sp_currentstock` body + RollDtl diff; live proc/trigger/view catalog vs shipped folders (report of drift); DDL snapshot of all legacy tables; masked master samples — 11 §6, PLAN S0
- [ ] S0.3 (M) Migration tooling for **new tables only** (Track*, ReportJob( Rows), AiActionLog, MasterAlias, TrackLabelLog); document repo layout — PLAN §4 S0
- [ ] S0.4 (S) Read `Sp_ProductionEntryQty` (plain) vs `_1` divergence note → append to 11 §6 — 11 §6.2

## Stage 1 — Foundation

- [ ] S1.1 (M) Auth flow (company→finyear→user) against `Mas_User`; session cookie ctx — 02 §2, 04 §1
- [ ] S1.2 (M) Rights service + menu tree from rights tables; `<Can>` guard + button rights — 01 §3.2
- [ ] S1.3 (S) `/api/config` FlagsProvider; typed Flags with all 189 legacy names + Part-3 additions; `/admin/flags` editor — 07
- [ ] S1.4 (M) UI kit: ui primitives, DataTable (FlexGrid parity), LineGrid, TreeGrid — 02 §21
- [ ] S1.5 (M) Pickers pack (Order/Style/Party/Stock/Lot/Roll/Stage/Line/Godown/Acc/Shade/Mill/Count) — 02 §21
- [ ] S1.6 (M) Document primitives: DocumentShell, DocumentNumberBox+NumberingService, PostingPreview, ReversalButton, ToleranceBanner — 02 §21, 03 §7
- [ ] S1.7 (S) Error contract + legacy message constants (verbatim strings) — 01 §3.6
- [ ] S1.8 (M) ERPShell + MobileShell + SSE events endpoint skeleton — 02 §1, 04 §11

## Stage 2 — Vertical slice: GRN 'Process'

- [ ] S2.1 (L) PostingEngine v1 (FABRIC ledger) with extracted `Sp_currentstock` semantics + parity tests — 03 §3
- [ ] S2.2 (M) Outbox + ProjectorRunner infra; ProgBalanceFabricProjector (guards: dept8-or-grp color, dept10 design, ProgFrm_Issue|11, ProcessType R bucket, pokgs row rules) — 03 §5
- [ ] S2.3 (L) GrnService + GrnWizard UI (type panel, identity panel grey→dyed, lines+roll grid, tolerance banner) + zod DTO — 04 §5, 02 §6
- [ ] S2.4 (M) Reversal (compensating) + G1/G3 tests — PLAN §5
- [ ] S2.5 (M) Report job runner (jobId staging) + stock register page reading Vue_StkLedger semantics — 05 §7, 02 §8
- [ ] S2.6 (S) PrintLayout with preprint overlay port (`PrePrint/298` geometry) + GRN print — 07 §1.1
- [ ] S2.7 (S) Sync-flag stamps (UpdateFlg) + `/api/sync/pull|ack` skeleton — 05 §3

## Stage 3 — Material loop breadth

- [ ] S3.1 (L) DcService fabric/gen (all TrType rows; Del3 knitting pre-program; RateConfirmGuard; GST/e-way panel) + DcWizard UI — 03 §4.1, 02 §7
- [ ] S3.2 (M) ProgBalanceYarnProjector + DELKNIT pre-issue leg — 03 §5
- [ ] S3.3 (L) PO family (yarn/fab/acc/multi-style) + BudgetDeviationBanner + approval submit (po_approval_reqd) — 02 §5, 04 §4
- [ ] S3.4 (M) Purchase GRN + waste receipt + opening stock — 02 §6
- [ ] S3.5 (M) Returns (TrType 4/6/13), 'Process Return' GRN, RTC 20 (+return) with equalize rule — 03 §4.1
- [ ] S3.6 (M) Transfers 3/8/14/17 + godown/unit ack procs parity — 02 §8
- [ ] S3.7 (M) Stock registers family + stock view + ledger + roll split + adjustments — 02 §8
- [ ] S3.8 (S) Lot life (approval/register/separate/wise) with lot flags — 02 §6
- [ ] S3.9 (M) Cutting ack (Trs_CutApr → dept −7 pool, CutACKStockPost parity) — 03 §4.1
- [ ] S3.10 (S) Ready-to-cut + cutting registers + fab rejection — 02 §9

## Stage 4 — Production, pieces, payroll capture

- [ ] S4.1 (L) ProductionService dispatcher parity (Spl_Operation skip; `_1` LineOut hardcode; `_2` ReWrk path incl. LineID-not-SrcLineID + disabled 'F' branches; update/delete variant procs; Rework=2 normal) — 03 §4.2 (verified), 11 §2.4
- [ ] S4.2 (M) Panel ledger + assembly (deduction-only Asm + separate add path; no EmpID; PcsType Piece|Panel) — 03 §4.2
- [ ] S4.3 (M) Rejection entries (Trs_PcsRej 'G' line → 'M' stage) — 03 §4.2
- [ ] S4.4 (M) Line input/output/transfer per corrected live behavior (dead legs not ported) — 03 §4.2
- [ ] S4.5 (L) Piece DC/GRN (+_LineStk deduct-leg-only switch; ProcessType G/M both legs; despatch FinishedStageID −3/Sales; GAN RewrkStk path; GRN RewrkStk/RejStk columns; multi-stage & cutting-GRN cases) — 03 §4.3
- [ ] S4.6 (L) Barcode chain: bundle/piece/rejection check APIs (verbatim messages; validations incl. contractor/route/final/rework; cross-db via configured conn) + posting batch (one tx, group-scoped flags, corrected defects 11 §3 #4-6,#8) — 05 §6, 11
- [ ] S4.7 (M) ScanConsole + offline queue (IndexedDB replay, idempotency keys) desktop + `/m/scan` — 02 §10
- [ ] S4.8 (M) ST_Production_Data projector (5 trans types; PartyId keying rules; zeroing rule) — 03 §5
- [ ] S4.9 (S) Wages accrual hooks (Pay flag, Trs_ProdWages entry UI) — 02 §15
- [ ] S4.10 (M) Production/panels/pieces registers + status/track pages — 02 §10-11

## Stage 5 — Commercial & finance core

- [ ] S5.1 (M) Rate-confirm flow (pending/approve) + guards (need_rate_conf_for_dc etc.) — 04 §4
- [ ] S5.2 (L) Bills register variants (yarn/fab/acc/cm/prd) + bill-pass (TDS, doublebillpassreqd) + add/ded heads — 04 §9
- [ ] S5.3 (L) Sales invoice family (DC attach, GST split by state, HSN else Trs_Del4, prefixes) + domestic/commercial/local/piece variants + packing lists — 04 §9
- [ ] S5.4 (M) Debit notes (yarn/fab/acc, FCY conversion at PO rate) + registers — 04 §9
- [ ] S5.5 (M) Payments (+wages) + registers + order-transfer of wage cost — 04 §9
- [ ] S5.6 (L) Cumulative-rate engine service (root-trigger parity; knit/YTwist/FTY branches; NO hardcoded ordid=2028 filter) + CumulativeRateCard — 03 §4.5, 11 §3 #1
- [ ] S5.7 (M) Party balances (abs/prog) + PartyOutQry value outstanding + to-be-value accrual — 04 §9
- [ ] S5.8 (S) Tally export + GST/TDS registers + HSN masters — 07 §1.2

## Stage 6 — Analysis & finance intelligence

- [ ] S6.1 (L) Budget-vs-actual service (all legs; tax toggle; grpref) + UI — 03 §9
- [ ] S6.2 (M) Daily unit P&L (overhead pro-rata; fixed/daily/style expenses) — 03 §9
- [ ] S6.3 (M) Quick-costing cube + input screens (4 expense levels) — 03 §9
- [ ] S6.4 (M) WBS/T&A (RAG, finish %, plan-date calc with holidays; datewise/supplier boards) — 02 §4
- [ ] S6.5 (M) MIS dashboards + meeting packs (Meet* datasets) + buyer P&L + status pipeline — 02 §2
- [ ] S6.6 (S) Expenses family + registers — 02 §14
- [ ] S6.7 (M) Parallel-run comparison pack (legacy vs new outputs on shared DB month) — PLAN S6 exit

## Stage 7 — QR tracking

- [ ] S7.1 (M) Track* tables + migrations + sync flags — 08 §2
- [ ] S7.2 (M) Code service (internal compact + GS1-DL external; HMAC; label log/void) + QrLabelSvg sizes — 08 §3
- [ ] S7.3 (L) PostingEngine hooks (unit creation points; owner/status; quantity law; reversal consistency) — 08 §5, 03 §10
- [ ] S7.4 (M) TraceProjector + reconciliation exceptions + party-dwell aging — 08 §1.5, 05 §2
- [ ] S7.5 (M) Order river (qty + **value columns × cumulative rate**) + genealogy graph + item passport — 08 §6
- [ ] S7.6 (S) Scan-anything console + `/m/track` — 08 §6
- [ ] S7.7 (S) Policy editor (per order/part/stage; bundle overrides) — 08 §7
- [ ] S7.8 (M) Label printing at cutting/GRN/packing/gate + offline validation window — 08 §3
- [ ] S7.9 (L) Backfill jobs + reprint campaign tooling — 08 §8
- [ ] S7.10 (S) Carton/gate scan-out closing loop to DESPATCH_DOC — 08 §5

## Stage 8 — AI harness

- [ ] S8.1 (M) AI infra: provider gateway, prompt registry (versioned), zod-schema-constrained decoding, AiActionLog, cost metering — 09 §6
- [ ] S8.2 (M) Capture (upload/photo/email watcher) + perception (OCR Tamil/English, classify) — 09 §2
- [ ] S8.3 (L) MasterMatch (embeddings + aliases + trade-shorthand dict) — 09 §6
- [ ] S8.4 (L) ParseReviewScreen (source⇄fields, confidence, numeric confirm, voice readback) + inbox — 09 §4
- [ ] S8.5 (L) Skill: supplier bill parse + 3-way match (PO/GRN/bill) — 09 §3 #2
- [ ] S8.6 (L) Skill: job-worker challan → GRN draft (roll detail, OurDCID match, loss %) — 09 §3 #3
- [ ] S8.7 (L) Skill: buyer PO → order-sheet draft (style/color/size grids) — gated on eval — 09 §3 #1
- [ ] S8.8 (M) Assistant (chat/voice; Indic STT + numeric loop; grounded reads; draft-open intents) + AiDock — 09 §5
- [ ] S8.9 (M) Digest + narrator + approval triage cards — 09 §3 #11-15
- [ ] S8.10 (M) Eval harness: golden-set builder, field-level scoring, CI gate, shadow mode — 09 §7
- [ ] S8.11 (S) `/admin/ai` console (providers/prompts/cost/kill switches) — 09 §8
- [ ] S8.12 (S) On-prem inference option + PII masking + retention — 09 §7

## Stage 9 — Migration & hardening

- [ ] S9.1 (L) Data-migration runbooks (masters, open orders, balances) + reconciliation reports
- [ ] S9.2 (M) Parallel-run month + fix log
- [ ] S9.3 (M) Perf budgets (scan station, registers, river) + indexes on Track* by finyear
- [ ] S9.4 (M) Security pass: secrets, rights matrix test, AI kill switches, label void audit
- [ ] S9.5 (S) Cutover + rollback runbook; training notes (Tamil) for floor screens

## Cross-cutting (any stage)

- [ ] X1 (S) Keep `10-REVIEW-REPORT` change log updated each pass
- [ ] X2 (M) Extract `.mrt` parameters per report at implementation; registry entries — 07 §1
- [ ] X3 (S) Sign-off sheet for 11 §3 defect deviations (esp. #6 rejection counter)
- [ ] X4 (S) Golden transaction test suite grows with every document type (G1-G3)

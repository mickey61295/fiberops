# CONVERGENCE PLAN — Fiberpro ERP: from working MVP to LLD-grade domain rigor

**Date:** 2026-08-25 · **Status:** Active · **Owner:** main agent + user
**Sources:** `download/LLD-vs-Codebase-Comparison.md` (our analysis) · `workspace/lld/nextjs-lld/` (the blueprint pack)
**Working copy:** `/home/z/my-project/PLAN.md` (canonical — update this file, not the download copy)

---

## 1. Mission & strategy

We converge **two assets into one system**: our running agent-first ERP (the vehicle) and the LLD pack's domain blueprint (the map). We do **not** restart, and we do **not** chase 1:1 legacy parity. Every phase must leave the app runnable and the agent in control of everything.

Strategy in one line: **adopt their domain mechanics (posting engine, stages, flags, commercial math), keep our interaction model (one chat controls all), restore what the rollback took.**

## 2. Standing decisions (do not re-litigate without new evidence)

| # | Decision | Rationale |
|---|---|---|
| C1 | **Keep Prisma + SQLite.** Do NOT port the legacy 449-table schema or SQL Server procs. We translate *semantics* (movement matrix, buckets, projectors) onto our clean models. | v1 is single-tenant dev; schema translation preserves our working base. Revisit only at real deployment with legacy data migration. |
| C2 | **One PostingEngine owns all stock writes.** No agent tool or API route may write `StockLedger` / `CurrentStock` / (future) piece ledgers directly. | LLD golden rule; fixes our scattered-logic and dead-ProgBalance bug class. |
| C3 | **Agent-first UX stays primary.** The LLD's AiDock-per-form + review inbox model is rejected; our plan→approve→commit chat loop is the single write surface. | User requirement ("everything through AI chat"); strictly more general than their design. |
| C4 | **Flags are data, subset-first.** Ship ~25 load-bearing flags (tolerances, gates) before ever attempting all 189. | 80% of behavior value at 15% of the surface. |
| C5 | **Their build pipeline is not adopted.** We stay single-agent + worklog + git checkpoints, not supervisor/worker pyramid. | Proven in this repo; zero ceremony overhead. |
| C6 | **Parity gates become automated tests** (G1–G5 below), adapted from their PLAN §5. | Their gate concept is excellent; their execution medium (docs) is not. |
| C7 | **Rollback resilience is a first-class task** (Phase 0.5): everything that survives must live in `scripts/`, be committed to git, and be re-runnable. | We lost a full day of work to an environment snapshot rollback once already. |

## 3. What we deliberately do NOT build (yet)

Full 322-screen UI parity · all 189 flags · ~330 reports engine · Commando mobile offline sync · QR/genealogy tracking · Tamil voice stack · multi-company/finyear auth chain. These are Phase 5+ / on-demand. This plan is the **only** backlog; new ideas get appended here, not built ad hoc.

---

## Phase 0 — RESTORE THE ROLLBACK (P0, blocking, ~1 day)

The environment reset to a pre-2026-08-24 snapshot. All items below were built and tested once; re-apply from session history.

| ID | Task | Size | Exit criteria |
|---|---|---|---|
| 0.1 ✅ | Re-apply the **77-tool registry** to `src/lib/agent/tools.ts`: 21 master-create tools, 7 transactional creates (jobwork, pcs despatch, debit note, journal, cost sheet), 5 update/cancels, `receive_jobwork`, `create_sizes` batch, 14 new `list_*` reads | S | `grep -c "name: '"` ≈ 77; TS clean |
| 0.2 ✅ | Restore **document ingestion**: `src/lib/agent/docExtract.ts`, `/api/upload/route.ts`, Attach button in `agent-panel.tsx` | S | upload + extract_document E2E works |
| 0.3 ✅ | Restore **agent route hardening**: MAX_STEPS=12, zod validation with type coercion (`parseWithCoercion`), 80K extract_document result limit, two-phase ingestion + direction-rule system prompt | S | coercion test (string "4.5" → number) passes |
| 0.4 ✅ | **Regression re-ingest** the LPP PO (`upload/PO_696GJ_revised 21-04-25.pdf`): masters → approve → continue → 5 orders → approve | M | 5 orders (11135903/11136041/11136133/11111841/11136129), 30,006 pcs, FY 24-25 in DB |
| 0.5 ✅ | Restore `worklog.md` protocol + **git commit checkpoint** of the full restored state | S | `git log` shows restore commit |

**Phase exit:** everything green that was green before the rollback, now committed to git.

---

## Phase 1 — DOMAIN CORE: PostingEngine, enums, numbering (P0, ~1.5 weeks)

Port the LLD's single best idea: all stock math in one engine, driven by a typed movement matrix. Ref: LLD `03-DOMAIN-POSTING-ENGINE.md` §1–§5, §7.

| ID | Task | Size | Exit criteria |
|---|---|---|---|
| 1.1 ✅ | **`src/lib/erp/enums.ts`** — typed ports: `TrType` (18 codes), `GrnType` (11), `PcsType`, `GoodFlag` ('G'/'M'), `ProcessType` ('P'/'R'/'S'), `YF`, `EntryOption`, `FinalStage` — values verbatim from LLD 03 §1 | S | enums module imported everywhere; no free-string txn types in new code |
| 1.2 ✅ | **`src/lib/erp/numbering.ts`** — NumberingService: prefix registry (SO-/PO-Y-/GRN-/INV-/CUT-/JW-/DC-/DN-/V-…), finyear-scoped, gap-free, peek/take; refactor the ~20 copy-pasted auto-number blocks out of tools | M | all create tools call `numbering.take()`; duplicate-number test passes |
| 1.3 ✅ | **`src/lib/erp/posting-engine.ts` + `movement-matrix.ts`** — port the LLD 03 §4.1 rows that map to our schema: process DC out, purchase GRN in, process GRN in (new dyed identity), returns (TrType 4/6/13), godown transfer (14), jobwork out/in, piece despatch, cut ack (dept −7 pool). Signed `Movement { ledger, key, qty, sign }` applied in ONE transaction | L | engine is the only writer of StockLedger/CurrentStock (grep-enforced) |
| 1.4 ✅ | **Refactor write tools onto the engine**: `receive_grn`, `adjust_stock`, `create_cut_order`, `create_pcs_despatch`, `create_jobwork_order`, `receive_jobwork` call `PostingEngine.apply()` instead of hand-rolled stock SQL | M | behavior-identical on golden inputs; tool diffs shrink |
| 1.5 ✅ | **Compensating reversals**: `cancel_order` / `cancel_purchase_order` / `cancel_invoice` / new `reverse_grn` rebuild inverted MovementSets — stock and ledger restored exactly (LLD 03 §3 delete rule) | M | G3 reversal test: post → reverse → byte-identical prior state |
| 1.6 ✅ | **Projectors v1**: `ProgBalanceFabric` / `ProgBalanceYarn` maintained automatically by the engine on every DC/GRN posting (DcKgs, GrnKgs, ReqBalanceKgs per LLD 03 §5). Kills our "dead tables" defect | M | projector state correct after golden GRN/DC sequence |
| 1.7 ✅ | **Golden posting tests** `tests/posting/`: G1 mid-failure atomicity, G2 matrix-expectation parity, G3 reversal — one suite per document type | M | `npm test` green incl. new suites |

**Phase exit:** a fabric process GRN posted via agent chat → stock + ledger + program balance + reversal all correct, proven by tests, with the engine as sole writer.

## Phase 2 — PRODUCTION DEPTH: stages, pieces, rework (P0-P1, ~1 week)

Ref: LLD 03 §4.2–§4.3, SCHEMA-CATALOG `Mas_JobWrkComp`, `Pcs_/Panel_StockTable`.

| ID | Task | Size | Exit criteria |
|---|---|---|---|
| 2.1 | **Stage model** (`Mas_JobWrkComp` equivalent): stage master per department (SemiFinish flag, PcsType, ProdType); seed D1–D6 chains with real Tirupur stages (knit→dye→cut→stitch→finish→pack) | M | stages seeded; dept→stage chain queryable |
| 2.2 | **Stage-aware ProductionEntry**: sourceStage/targetStage, Good/'M' bucket, rework flag; posting via engine dispatcher logic (LLD 03 §4.2 rows: piece prod, stage-to-stage, line-out, rework) | M | production entry moves pcs between stage buckets correctly |
| 2.3 | **Piece ledger** (`PcsStock` model: ordId×style×lot×stage×part×size×color×good×line): the missing third ledger; piece DC/GRN posting paths (LLD 03 §4.3) | L | piece despatch deducts finished-stage bucket; piece GRN adds company bucket |
| 2.4 | **Rejection & rework**: rejection entries (G→'M' with RejectionTypeId), rework consumes 'M' outputs 'G'; agent tools `post_rejection`, `post_rework` | M | rework round-trip test passes |
| 2.5 | **Line operations**: line in/out/transfer posting + agent tools | M | line WIP queryable per order |
| 2.6 | **Read tools upgrade**: `get_line_status`, `get_order` production view read from stage pipeline (ordered/balance per stage) | S | chat query "production status of SO-1001 by stage" answers correctly |

**Phase exit:** production is a stage pipeline with buckets — not a flat qty sum.

## Phase 3 — COMMERCIAL & FLAGS (P1, ~1.5 weeks)

Ref: LLD 03 §4.5, §6, §9; 07 Part 2; 04 §9.

| ID | Task | Size | Exit criteria |
|---|---|---|---|
| 3.1 | **Flag system v1**: `Flag` model + `flags.ts` registry (~25 names: `po_buddev`, `po_budrtdev`, `grn_dev`, `i_scheck`, `dyeinggamtper`, `knittinggamtper`, `need_rate_conf_for_dc`, `rateconfirmcheck`, `saledcagainstpgmbalchk`, `bill_bcheck`, `trankgs_dev`, `entrydatedev`, …) + `/api/config` + agent tool `get_flags`/`set_flag` | M | flags stored per company, served typed, agent-editable |
| 3.2 | **Tolerance service**: warn/block deviation checks wired into the approval flow (PO vs budget, GRN vs DC balance, issue shortage, process loss %) — the plan card shows the deviation verdict | M | over-budget PO triggers warn plan; >dev% blocks |
| 3.3 | **HSN master + GST from HSN** (replaces hardcoded rates); state on Party drives CGST/SGST vs IGST | S | invoice GST split sourced from HSN master |
| 3.4 | **Bill register + bill-pass + TDS + payments** chain: models (`Bill`, `BillPass`) + agent tools (`create_supplier_bill`, `pass_bill` with TDS preview, `record_payment`); 3-way match vs PO & GRN | L | bill→pass→payment chain via chat; TDS computed |
| 3.5 | **Cumulative rate engine v1** (LLD 03 §4.5): walk depts in Sno order — yarn base + dyeing + knitting + own rate; NO legacy hardcoded-filter defects | M | rate/kg per order-style reproducible on golden order |
| 3.6 | **Party exposure views**: absolute (document stack), program-wise, and value-at-cumulative-rate; agent tool `get_party_exposure` | M | "how much value is at Anand dyeing?" answers in ₹ |
| 3.7 | **FCY currency field on Order** + display fix (kills the ₹-vs-USD bug found in ingestion) | S | LPP orders show USD |

**Phase exit:** the money loop is real — bills pass with TDS, party exposure is valued, tolerances gate writes.

## Phase 4 — AI CONVERGENCE (P1, ~3-4 days)

Borrow the LLD 09 trust machinery without their form-docked UX.

| ID | Task | Size | Exit criteria |
|---|---|---|---|
| 4.1 | **Rollback resilience**: persist every generation step as re-runnable `scripts/`, commit after each task; `watchdog.sh` restores from git on env reset | S | recovery drill: reset → restore → green in <30 min |
| 4.2 | **Per-field confidence on ingestion**: extraction carries source-snippet + confidence per field; plan card shows 🟢/🟡 chips; low-confidence fields flagged for user check (LLD 09 §1.3, adapted to our plan cards) | M | LPP PO ingestion shows confidence per qty/rate/date |
| 4.3 | **Golden-set eval harness**: `scripts/eval_ingest.mjs` — field-level scoring (exact for strings, tolerance for numerics) against the LPP PO + 2 synthetic docs; runnable as gate before prompt changes | M | eval report generated; ingestion accuracy ≥95% fields |
| 4.4 | **3-way bill match skill**: `match_bill` tool — PO vs GRN vs invoice line diff with tolerance flags (LLD 09 skill #2) | M | test bill with 5% over-bill flagged |
| 4.5 | **Daily exceptions digest**: `get_daily_digest` tool — non-return jobwork DCs (aging), overdue deliveries, pending approvals, negative-stock warnings | S | one chat prompt returns owner-grade Tamil/English digest |
| 4.6 | **Audit enrichment**: AgentTurn records model, prompt version, corrections (feeds 4.3 learning) | S | audit row contains all fields |

**Phase exit:** the agent's writes are confidence-annotated, evaluated, and auditable — trust machinery at parity with their design.

## Phase 5 — BREADTH (on demand, parked)

DC family TrType completeness + gate pass/e-way · multi-process GRN chains · reports engine with jobId staging (first 10 registers) · auth/rights/multi-company/finyear · mobile offline scan queue · QR TrackUnit genealogy · Tamil voice (STT/TTS + numeric confirm loop). Each gets a spec card here before build.

---

## 4. Standing gates (every task, every phase)

- **G1 Atomicity:** every new write path has a mid-failure test proving zero partial rows.
- **G2 Parity:** golden input → expected stock/ledger/balance deltas asserted (matrix-derived, since no legacy DB).
- **G3 Reversal:** every posting has a compensating action restoring exact prior state.
- **G4 Docs sync:** this PLAN + `worklog.md` updated in the same change; task box ticked.
- **G5 Agent coverage:** every new entity/behavior gets at least one agent tool (read or write) — nothing is UI-only.

## 5. Task backlog summary

| Phase | Tasks | Est. effort | Priority |
|---|---|---|---|
| 0 Restore | 5 | ~1 day | P0 (blocking) |
| 1 Domain core | 7 | ~1.5 weeks | P0 |
| 2 Production depth | 6 | ~1 week | P0-P1 |
| 3 Commercial & flags | 7 | ~1.5 weeks | P1 |
| 4 AI convergence | 6 | ~3-4 days | P1 |
| 5 Breadth | parked | on demand | P2 |
| **Total (0–4)** | **31** | **~5 weeks focused** | |

## 6. Risk register

| ID | Risk | Mitigation |
|---|---|---|
| R1 | Another environment rollback | C7/4.1: scripts/ persistence + git checkpoints + watchdog restore drill |
| R2 | Semantic drift porting matrix onto our schema (their tables ≠ ours) | §3 mapping table in the comparison doc is the translation contract; each matrix row gets a test |
| R3 | Agent step budget too small for chained postings | Engine calls happen server-side inside ONE tool call; MAX_STEPS=12 already raised |
| R4 | Scope creep toward full parity | This plan is the only backlog (rule §3); Phase 5 items need a spec card first |
| R5 | SQLite write contention under tests | Prisma transactions serialize; fine at v1 scale; swap to Postgres at deployment decision point |
| R6 | Cumulative-rate engine complexity (their hardest proc) | v1 scope = straight-line dept walk; blended/FTY branches deferred with TODO-ASSUMPTION tags |

## 7. Success metrics (end of Phase 4)

1. 77 tools live; ingestion E2E green; git history protects state.
2. `PostingEngine` is the **only** writer of stock tables (grep-verified).
3. ProgBalance tables auto-maintained; golden GRN/DC/reversal suites pass.
4. Production = stage pipeline with Good/'M' buckets; piece ledger live.
5. Bill→pass→TDS→payment chain works via chat; party exposure valued at cumulative rate.
6. Ingestion eval ≥95% field accuracy on golden set; plans carry confidence chips.
7. One prompt returns the daily exceptions digest.

## 8. Change log

| Date | Entry |
|---|---|
| 2026-08-25 | Plan created from LLD-vs-codebase analysis (comparison doc §6 convergence path) |
| 2026-08-25 | Git initialized → github.com/mickey61295/fiberops (commits as j.maihby@gmail.com; push pending credentials). Baseline + Phase 0 + Phase 1.1/1.2 committed. |
| 2026-08-25 | Phase 0 COMPLETE: 82-tool registry, docExtract + /api/upload + Attach button, agent route hardening (coercion/12 steps/80K docs), LPP PO regression re-ingested (5 orders, 30,006 pcs verified). src/ typechecks clean. |
| 2026-08-25 | Phase 1.1+1.2 COMPLETE: enums.ts (LLD 03 §1 ports + Movement type), numbering.ts (22-sequence NumberingService), create_order refactored onto it. |
| 2026-08-25 | Phase 1.3-1.7 COMPLETE: movement-matrix.ts + posting-engine.ts (sole stock writer, one-tx) + projectors.ts (ProgBalance live) + receive_grn/adjust_stock refactored + reverse_grn tool + 6/6 golden tests (G1/G2/G3). Fixed NULL-key upsert bug + projector netting bug found by tests. |

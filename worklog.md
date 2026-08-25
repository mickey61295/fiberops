---
Task ID: lld-analysis
Agent: main
Task: Download nextjs-lld.zip via gdown, analyze the LLD document set, compare against our codebase.

Work Log:
- Installed gdown; downloaded upload/nextjs-lld.zip (336 KB) → extracted to workspace/lld/nextjs-lld/ (37 md files, ~9,565 lines).
- Read all core docs: 00-OVERVIEW, 01-ARCHITECTURE, 03-DOMAIN-POSTING-ENGINE, 08-QR-TRACKING, 09-AI-HARNESS, PLAN/TASKS/PROGRESS, agent-docs/README + 01-HLR, design/ASSUMPTIONS-NOLEGACY, SCHEMA-CATALOG (partial), R01 + WO-S0-S1 samples, section maps of 02/04/07.
- The pack is a DESIGN-ONLY blueprint (implementation not started) for a 1:1 parity rewrite of the same legacy Joms/Fiberpro ERP, plus QR tracking + "Joms Sahayak" AI harness additions. Includes a 3-level requirements pyramid (43 HLR/15 NFR → 677 FRs → 85 WO cards/365 ACs) meant to be executed by a supervisor/worker agent pipeline.
- Wrote full comparison → download/LLD-vs-Codebase-Comparison.md (schema mapping table, AI-layer comparison, convergence recommendations).

Stage Summary:
- CRITICAL FINDING: the environment was rolled back to a pre-2026-08-24T05:36 snapshot. Lost: 77-tool agent registry (back to 33), /api/upload + docExtract.ts + ingestion pipeline, agent-panel Attach button, DB LPP orders (30,006 pcs), worklog.md. All reconstructable from session history — recommend re-applying before further work.
- Comparison verdict: our codebase = working agent-first MVP (~10% of LLD scope); LLD = full destination blueprint. Recommended adoption order: re-apply lost work → central PostingEngine → Stage master → typed enums → NumberingService → tolerance flags → piece/panel ledgers → their AI trust machinery (confidence display, eval harness).

---
Task ID: convergence-plan
Agent: main
Task: Create detailed plan based on the LLD-vs-codebase analysis (user request).

Work Log:
- Wrote /home/z/my-project/PLAN.md (canonical working doc) + copy at download/CONVERGENCE-PLAN.md.
- Structure: mission/strategy, 7 standing decisions (C1-C7: keep Prisma, PostingEngine sole writer, agent-first UX, flags subset-first, no supervisor pipeline, gates-as-tests, rollback resilience), 6 phases:
  - Phase 0 RESTORE (5 tasks, ~1 day): re-apply 77-tool registry, docExtract+/api/upload+Attach, route hardening (coercion/MAX_STEPS/prompt), LPP PO regression re-ingest, worklog+git checkpoint.
  - Phase 1 DOMAIN CORE (7 tasks, ~1.5 wks): enums.ts (TrType/GrnType/...), NumberingService, movement-matrix + PostingEngine, refactor write tools onto engine, compensating reversals, ProgBalance projectors, golden posting tests (G1-G3).
  - Phase 2 PRODUCTION DEPTH (6 tasks, ~1 wk): Stage master, stage-aware ProductionEntry w/ Good-'M' buckets, piece ledger, rejection/rework, line ops, read upgrades.
  - Phase 3 COMMERCIAL & FLAGS (7 tasks, ~1.5 wks): 25-flag registry + tolerance service, HSN/GST, bill+bill-pass+TDS chain, cumulative rate engine, party exposure views, FCY field.
  - Phase 4 AI CONVERGENCE (6 tasks, ~3-4 d): rollback resilience, per-field confidence on plans, golden-set eval harness, 3-way bill match, daily digest, audit enrichment.
  - Phase 5 BREADTH parked (DC parity, reports, auth, mobile, QR, Tamil voice).
- Defined gates G1-G5, risk register R1-R6, success metrics, 31-task backlog table (Phases 0-4 ≈ 5 weeks focused).

Stage Summary:
- PLAN.md is now the single backlog; worklog continues as session protocol. Next action per plan: Phase 0.1 (restore 77-tool registry).

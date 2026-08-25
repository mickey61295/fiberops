# agent-docs: Operating Docs for the Agent Build

Purpose: this folder is the execution layer for the Joms/Fiberpro Next.js rewrite (stages S0-S9 in
`nextjs-lld/PLAN.md`). The supervisor (DeepSeek v4 Pro) distills the LLD set (`nextjs-lld/00-11`) into
requirements (R-docs) and work-order cards collected in four stage-bundle files; workers (DeepSeek v4 Flash)
execute one WO card per session under `00-AGENT-FRAMEWORK.md`. Nothing in this folder overrides the LLD or
PLAN.md; report contradictions as DOC-CONFLICT escalations instead of resolving them silently.

## Status

**Verified and promoted (2026-08-15).** All drafts passed the 5-pass verification loop plus a
post-fix re-verification pass (12/12 PASS, zero residual defects) and were promoted from `_staging/`
to the final paths in the file map below. `_staging/` no longer exists. Evidence: `VERIFICATION-REPORT.md`;
ID registry and coverage counts: `TRACEABILITY.md`. The tree is execution-ready: supervisor starts here,
picks the next WO per `nextjs-lld/TASKS.md` order (first: WO-S0.1 in `workorders/WO-S0-S1-foundation.md`).

Operator note: the exact prompts to drive the supervisor (kickoff, resume, post-merge, unblock,
audit) are in `02-ORCHESTRATOR-PROMPTS.md`. No-legacy mode is active (framework sec. 5.1 item 0).

## Quick reference

| Need | Go to |
|---|---|
| Session steps, pre-flight, gates, report format | `00-AGENT-FRAMEWORK.md` sec. 3-5 |
| Reading budget and allowed docs | `00-AGENT-FRAMEWORK.md` sec. 2 |
| Stop conditions and blocker classes B1-B6 | `00-AGENT-FRAMEWORK.md` sec. 6 |
| Conventions (TS, naming, transactions, flags, secrets) | `00-AGENT-FRAMEWORK.md` sec. 7 |
| Environment prerequisites (repo root, Node, DB, .env.local) | `00-AGENT-FRAMEWORK.md` sec. 5.1 |
| WOs parked waiting on the user ("Awaiting user" rows) | `nextjs-lld/PROGRESS.md` sec. 4; framework sec. 6 (USER-SIGNOFF/USER-INPUT) |
| Build stages, exit criteria, gates source | `nextjs-lld/PLAN.md` (supervisor only) |
| Backlog order and task IDs | `nextjs-lld/TASKS.md` |

Prerequisites (host): Windows + Git Bash, Node 20 LTS, npm, git, `gh` (authenticated), `sqlcmd`;
details and environment facts in framework sec. 5.1.

Doc-number map for `nextjs-lld/` (docs are cited everywhere as `NN sec. X`):

| NN | File | NN | File |
|---|---|---|---|
| 00 | 00-OVERVIEW.md | 06 | 06-SCREEN-MAP.md |
| 01 | 01-ARCHITECTURE.md | 07 | 07-REPORTS-FLAGS.md |
| 02 | 02-COMPONENT-TREE.md | 08 | 08-QR-TRACKING.md |
| 03 | 03-DOMAIN-POSTING-ENGINE.md | 09 | 09-AI-HARNESS.md |
| 04 | 04-API-SERVICES.md | 10 | 10-REVIEW-REPORT.md |
| 05 | 05-EVENTS-SYNC-NOTIFICATIONS.md | 11 | 11-PROC-VERIFICATION.md |

## File map

Target state after promotion:

```
agent-docs/
|-- README.md                          this file: entry point, reading order, do-not-touch list
|-- 00-AGENT-FRAMEWORK.md              roles, session protocol, report format, gates G1-G5, conventions
|-- 01-HLR.md                          high-level requirements (from 00-OVERVIEW + PLAN sec. 1)
|-- TRACEABILITY.md                    (planned) FR -> TASKS -> WO -> test chain; supervisor-owned
|-- VERIFICATION-REPORT.md             (planned) 5-pass results per promoted doc; supervisor-owned
|-- requirements/                      module requirement distillations of the LLD, with FR IDs
|   |-- R01-platform-foundation.md     S1: auth, rights, flags, numbering, UI kit, shells (PLT, ADM, INT)
|   |-- R02-orders-planning.md         S2: order family, registers, WBS/T&A planning (ORD, PLN, WBS)
|   |-- R03-procurement-grn-dc.md      S3: PO, GRN, DC families, gate entry (PRC, GRN, DC, GAT)
|   |-- R04-stock-stores.md            S3-S4: FABRIC-ledger stock, transfers, registers (STK, TRF)
|   |-- R05-production-pieces-payroll.md  S4: production, pieces, barcode, wages (PRD, PCS, CUT, PAN, BAR, WAG)
|   |-- R06-qc-commercial-finance.md   S5: QC, bills, invoices, payments, party balance (QC, BIL, INV, DEB, PAY, PTY, RATE)
|   |-- R07-costing-analysis-mis.md    S6: budget-vs-actual, P&L, quick costing, MIS (CST, MIS, MET, PL)
|   |-- R08-tracking-ai-mobile-reports.md  S7-S8: QR tracking, AI, mobile, reports (TRK, LBL, APR, MOB, RPT, AI, GEN)
|   `-- R09-masters.md                 master-data CRUD across modules (MAS)
|-- workorders/                        stage bundles of WO cards (not one file per WO)
|   |-- WO-S0-S1-foundation.md         cards WO-S0.1..S0.4, WO-S1.1..S1.8
|   |-- WO-S2-S3-material-loop.md      cards WO-S2.1..S2.7, WO-S3.1..S3.10
|   |-- WO-S4-S5-production-finance.md cards WO-S4.1..S4.10, WO-S5.1..S5.8
|   `-- WO-S6-S9-analysis-tracking-ai-migration.md  cards WO-S6.x..S9.x + WO-X1..X4
`-- _staging/                          drafts pending 5-pass verification; never authoritative
```

## How the supervisor picks the next WO

1. Scan `nextjs-lld/TASKS.md` top-down within the current stage (stage order S0-S9); take the first unchecked item.
2. Skip an item only when an open blocker in `PROGRESS.md` sec. 3 touches it; record the skip in the next-actions queue (`PROGRESS.md` sec. 4).
3. Author or update the WO card inside its stage bundle (`workorders/WO-S0-S1-foundation.md`,
   `WO-S2-S3-material-loop.md`, `WO-S4-S5-production-finance.md`, or
   `WO-S6-S9-analysis-tracking-ai-migration.md`) meeting the Definition of Ready (framework sec. 8),
   then assign it to one Flash session with an `Execute WO-<id>` message plus the card path
   (framework sec. 1).

## How a worker starts (exact first three steps)

1. Read this README in full.
2. Read the claimed work order card in full: only the `## WO-<id>` section of its stage bundle --
   `workorders/WO-S0-S1-foundation.md` (S0/S1 cards), `WO-S2-S3-material-loop.md` (S2/S3),
   `WO-S4-S5-production-finance.md` (S4/S5), or `WO-S6-S9-analysis-tracking-ai-migration.md`
   (S6-S9 + X cards) -- never the whole bundle. Pre-promotion, the same bundles live under
   `_staging/workorders/`.
3. Read only the Refs sections named inside that card (never a whole LLD doc).

Then follow the session protocol in `00-AGENT-FRAMEWORK.md` sec. 3; obey the reading budget in sec. 2.

## Do not touch

- Legacy folders (`architecture/`, `reverse-engineering/`, legacy SQL and report folders): read-only reference; write nothing.
- The analysis folder: create only `.md` files there; write nothing else (PLAN sec. 2 rule 1).
- `nextjs-lld/00-11`, `PLAN.md`: workers never edit; doc fixes flow through the supervisor (gate G4).
- `PROGRESS.md`: workers append only one sec. 6 change-log row, inside their PR.
- `joms-web/migrations/`: additive new tables only; never ALTER, DROP, or rename legacy objects.
- Never commit secrets or `.env` files; never hard-code flag defaults (framework sec. 7).

## Escalation

Stop conditions, blocker classes B1-B6, and the escalation report format: framework sec. 6. When in
doubt, hand back with evidence; never improvise. USER-SIGNOFF/USER-INPUT escalations (X3 approvers,
B3 credentials, `.env.local` values): the supervisor parks the WO and posts an "Awaiting user" row in
`PROGRESS.md` sec. 4 -- watch that queue for releases.

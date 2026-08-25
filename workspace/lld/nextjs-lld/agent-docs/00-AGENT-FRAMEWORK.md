# 00-AGENT-FRAMEWORK: Agent Operating Framework

**Applies to:** every agent session executing the Joms/Fiberpro Next.js rewrite (PLAN.md stages S0-S9).
**Models:** supervisor = DeepSeek v4 Pro (large context, orchestrates); worker = DeepSeek v4 Flash (small context, executes exactly one work order per session).
**Source of truth:** the LLD set 00-11 plus PLAN.md, TASKS.md, PROGRESS.md in `nextjs-lld/`. This file summarizes and operationalizes them; it never overrides them. On any conflict, escalate (sec. 6).
**Construction rule:** every instruction below is imperative and testable. If a step cannot be executed as written, treat that as a doc defect and escalate.

## 1. Roles & responsibilities

| Duty | Supervisor (v4 Pro) | Worker (v4 Flash) |
|---|---|---|
| Plan stage sequencing; pick next task | Owns (TASKS.md order) | Never |
| Distill LLD into R-docs and work orders | Owns | Never |
| Execute one work order end-to-end | Spot-checks only | Owns (exactly one per session) |
| Self-verify ACs and gates; write the work report | Verifies evidence at review | Owns |
| Open PRs | Merges or rejects with reasons | Opens; never merges own PR |
| Run gate commands | Re-runs at review | Runs at self-check |
| Edit LLD 00-11, PLAN.md, R-docs, WO bundles | Owns | Never (propose via report) |
| Update PROGRESS.md | Owns sec. 1/3/4/5 | Appends one sec. 6 change-log row, inside the PR |
| Resolve blockers B1-B6; administer sign-off X3 | Owns | Reports them |
| Split, merge, or re-scope WOs | Owns | Requests via escalation |

Supervisor must also: keep the canonical script names of sec. 5 in sync with `joms-web/package.json`; run the staging SOP (sec. 10); record decisions in PROGRESS sec. 2 (do not re-litigate D1-D9 without new evidence).

Session start state (both roles verify before anything else):
1. The assigned WO card exists in a promoted stage bundle under `agent-docs/workorders/` and passes the Definition of Ready (sec. 8). Pre-promotion, the same card may instead live under `agent-docs/_staging/workorders/` -- but `_staging/` is never authoritative once the bundle is promoted.
2. `nextjs-lld/PROGRESS.md` sec. 4 (next-actions queue) names the WO's task or permits it.
3. The repository state is clean on main; the build repository contains both `nextjs-lld/` and `joms-web/` (see sec. 5 and sec. 5.1).
4. The previous WO in the same stage is merged (DoR item 6); no two workers share a stage-blocking WO.

Orchestration rules (supervisor-owned):
1. Assignment format: an assignment is exactly `Execute WO-<id>` plus the full path of the bundle file holding the card (e.g. `agent-docs/workorders/WO-S2-S3-material-loop.md`); nothing is assigned verbally or by implication -- if the message names no WO id and card path, the worker does not start.
2. In-flight table: PROGRESS sec. 4 carries an in-flight table with columns `| WO id | session | branch | PR# | opened |`; the supervisor appends a row when assigning and updates or closes it at merge/reject.
3. Parallel workers: default is one worker at a time. Parallel sessions are allowed only within a stage, and only after that stage's dependency WOs are merged. If main moved since branching, the worker rebases before opening the PR and re-runs the universal pre-gate (sec. 5) on the rebased tree.

Handoff artifacts per session (who produces what):
- Worker produces: one branch, one PR (report as body), the AC evidence, the gate outputs.
- Supervisor produces: the review verdict (merge/reject + reasons), the PROGRESS sec. 1/4 updates, any doc fix (G4), any WO amendment.

Hard limits for the worker (all testable in the PR diff):
1. Execute exactly one WO per session; assume no cross-WO memory; every fact needed must be inside the allowed reading set (sec. 2).
2. Touch only files the claimed WO card names (Steps, Test commands, Out of scope), plus test files for them.
3. Never edit LLD 00-11, PLAN.md, R-docs, any WO bundle (your own card included), or anything in a legacy folder.
4. Never merge your own PR; never start a second WO before handing back the report.

## 2. Document hierarchy & reading rules

Hierarchy (each level cites the level above; see sec. 10 for how these files are produced):

```
HLR          agent-docs/01-HLR.md                   (high-level requirements, from 00-OVERVIEW + PLAN sec. 1)
 -> LLD      nextjs-lld/00..11-*.md                 (design truth: routes 02, posting math 03, APIs 04,
                                                      events 05, screens 06, flags/reports 07, additions 08/09,
                                                      audits 10/11)
   -> R-docs agent-docs/requirements/R01-R09.md     (module requirements; FR IDs are domain-prefixed
                                                      <PREFIX>-<nnn>; registry below)
     -> TASKS nextjs-lld/TASKS.md                   (backlog, S#.# items, one item = one PR-sized change)
       -> WOs  agent-docs/workorders/WO-S*.md       (4 stage bundles of WO cards, one card per TASKS item;
                                                      card heading `## WO-<id>`, id = TASKS item id)
```

Doc-number to filename map (docs are cited as `NN sec. X` everywhere below; files live in `nextjs-lld/`):

| NN | Filename | NN | Filename |
|---|---|---|---|
| 00 | 00-OVERVIEW.md | 06 | 06-SCREEN-MAP.md |
| 01 | 01-ARCHITECTURE.md | 07 | 07-REPORTS-FLAGS.md |
| 02 | 02-COMPONENT-TREE.md | 08 | 08-QR-TRACKING.md |
| 03 | 03-DOMAIN-POSTING-ENGINE.md | 09 | 09-AI-HARNESS.md |
| 04 | 04-API-SERVICES.md | 10 | 10-REVIEW-REPORT.md |
| 05 | 05-EVENTS-SYNC-NOTIFICATIONS.md | 11 | 11-PROC-VERIFICATION.md |

R-doc map (fixed filenames under `agent-docs/requirements/`; do not renumber without a PROGRESS decision row):

| R-doc | Build area | Stage | FR prefixes | Distilled from |
|---|---|---|---|---|
| R01-platform-foundation.md | Foundation: auth, rights, flags, numbering, error contract, shells, UI kit, admin, integrations | S1 | PLT, ADM, INT | 01; 02 sec. 1+18-19+21-22; 03 sec. 3+6-7; 04 sec. 1+9+11; 06 sec. A+B+J; 07 |
| R02-orders-planning.md | Orders and planning: order family, registers, WBS/T&A planning | S2 | ORD, PLN, WBS | 01; 02 sec. 3-4; 03 sec. 5+8; 04 sec. 2-3; 06 sec. D+E+O; 07 |
| R03-procurement-grn-dc.md | Material loop front office: PO, GRN, DC families, gate entry, cutting ack | S3 | PRC, GRN, DC, GAT | 03 sec. 4.1; 02 sec. 5-8; 04 sec. 6 |
| R04-stock-stores.md | Stock and stores: FABRIC-ledger stock, transfers, registers, roll detail | S3-S4 | STK, TRF | 03 sec. 3-5; 02 sec. 8; 04 sec. 7 |
| R05-production-pieces-payroll.md | Production, pieces, barcode capture, wages | S4 | PRD, PCS, CUT, PAN, BAR, WAG | 03 sec. 4.2-4.3; 05 sec. 6; 02 sec. 10-11+15 |
| R06-qc-commercial-finance.md | QC, commercial, finance core: bills, invoices, debit notes, payments, party balance, rates | S5 | QC, BIL, INV, DEB, PAY, PTY, RATE | 03 sec. 4.5+6; 04 sec. 9-10; 02 sec. 13 |
| R07-costing-analysis-mis.md | Costing and finance intelligence: budget-vs-actual, P&L, quick costing, WBS boards, MIS | S6 | CST, MIS, MET, PL | 03 sec. 9; 02 sec. 2+4+14; 04 sec. 3 |
| R08-tracking-ai-mobile-reports.md | Additions: QR tracking, AI harness, mobile, approvals, reports | S7-S8 | TRK, LBL, APR, MOB, RPT, AI, GEN | 08; 09; 03 sec. 10; 02 sec. 16; 04 sec. 10 |
| R09-masters.md | Master-data CRUD across modules (MasterCrud pattern) | cross-cutting | MAS | 06 sec. C; 02 sec. 21-22; 04 |

Prefix registry: FR IDs are domain-prefixed `<PREFIX>-<nnn>` (e.g. PLT-001, ORD-001, MAS-001). The FR-prefix column above is the complete per-R-doc registry -- adding a prefix requires a PROGRESS sec. 2 decision row. Two auxiliary non-FR prefixes recur inside several R-docs: BR (business-rule rows, flag names verbatim) and OI (oddity-item rows, lock-in-parity quirks).
Planned supervisor-owned deliverables at `agent-docs/` root: TRACEABILITY.md (the FR -> TASKS -> WO -> test chain) and VERIFICATION-REPORT.md (5-pass results per promoted doc).

FR row format inside R-docs (5 columns): `| FR ID | Requirement | Source | Priority | Stage |` -- one imperative sentence per row; FR ID = `<PREFIX>-<nnn>` from the registry above.
Worked example of the full traceability chain (copy this shape):
`01-HLR "1:1 feature parity with legacy Joms/Fiberpro ERP"` -> `R04 TRF-001 "post a godown transfer (TrType 14): - source godown + destination godown, no program-balance effect" (03 sec. 4.1)` -> `TASKS S3.6` -> `WO-S3.6 AC2` -> test `godown-transfer.reversal.spec.ts`. Every AC in every WO card must be walkable back to the HLR in this shape (checked by pass V1).
WO bundles and card format (supervisor authors; every field is mandatory). WOs live in four stage-bundle files, each holding many cards -- never one file per WO:

```
agent-docs/workorders/WO-S0-S1-foundation.md                      (S0 + S1 cards)
agent-docs/workorders/WO-S2-S3-material-loop.md                   (S2 + S3 cards)
agent-docs/workorders/WO-S4-S5-production-finance.md              (S4 + S5 cards)
agent-docs/workorders/WO-S6-S9-analysis-tracking-ai-migration.md  (S6-S9 + X cards)

## WO-<S#.#> -- <imperative title> (<size S|M|L>, <stage>)
- Objective: <what this card delivers>
- Refs: <doc sections and FR IDs the card relies on, within the sec. 2 budget>
- Preconditions: <WO/blocker dependencies, or "none">
- Implementation steps: <ordered executable steps; enumerate every file to create/modify, <= 25 paths>
- Acceptance criteria:        (AC labels are exactly `  - ACn:` -- indented, no bold)
  - AC1: <Given/When/Then imperative> -- verify: <command or reviewer step> -- refs: <FR ID>
- Test commands: <exact commands to run, from joms-web/>
- Out of scope: <explicit exclusions>
- DoD checklist: <checkboxes the worker must tick before handing back>
- Owning docs: <docs this card may update, for G4>
```

Bundle reading rule: a card runs from its `## WO-<id>` heading to the next `## WO-` heading (or the end of the bundle). A worker reads ONLY its claimed card's section -- never the whole bundle. One card = exactly one TASKS.md item.

Reading rules for the worker:

| Document | Read how |
|---|---|
| agent-docs README | MUST, in full, first |
| This framework | MUST, sections the protocol names |
| Claimed WO card (its `## WO-<id>` section in the bundle) | MUST, in full (the card only, never the whole bundle) |
| R-docs | MUST: only the sections the WO Refs name |
| LLD 00-11 | MAY: only the sections the WO Refs quote, verbatim; NEVER a whole doc |
| nextjs-lld/design/db-extract/ | MAY: only the files the WO Refs quote (proc bodies, catalog, DDL, samples); read-only |
| TASKS.md | MUST: only the claimed task line |
| PROGRESS.md | MAY: sec. 3 (blockers) and sec. 6 (change log) only |
| 10 / 11 audit docs | MAY: only the register rows the WO cites; 11 sec. 3 rows need X3 (sec. 6) |
| Root analysis files, legacy SQL/reports | MAY: only files the WO quotes; read-only |
| PLAN.md | NEVER (supervisor distills it into the WO; any PLAN rule a card relies on is inlined in the card) |

Context budget for Flash (hard limits):
1. Read in full only: README, the claimed WO card, the protocol-named sections of this file. Nothing else in full.
2. Refs budget: at most 6 referenced doc sections per WO, at most 250 lines each, plus the proc extracts the WO quotes verbatim (from `design/db-extract/`); total reading at most 1,500 lines per session.
3. Treat the WO card (Steps, Test commands, Out of scope) as the only map of the codebase; do not browse beyond it and its tests.
4. If the budget cannot cover the work, stop and escalate (class CONTEXT-OVERFLOW). PLAN.md remains NEVER for workers -- WOs must inline any PLAN rule they rely on. Never read a whole LLD doc (02/03/06 are far too large) and never read a root analysis file as a worker.

## 3. Session protocol (worker, one work order per session)

Step 1 - Read context (exact order): (a) agent-docs README in full; (b) the claimed WO card in full (its `## WO-<id>` section only, never the whole bundle); (c) only the Refs sections the card names.
Step 2 - Claim: confirm the assignment is an `Execute WO-<id>` message naming exactly one card path (sec. 1); re-read the card's TASKS.md line; create branch `wo/<id>-<slug>` from main.
Step 3 - Pre-flight checklist (every item must pass; any failure = BLOCKED handback, sec. 6):
- [ ] `joms-web/` exists; `npm ci` exits 0; `npm run build` exits 0 on the clean base.
- [ ] DB reachable when the WO needs it (`npm run db:ping`); otherwise DB-free mode is declared in the report.
- [ ] Card `Preconditions` is satisfied: it names no open row of PROGRESS sec. 3 and every WO it names is merged.
- [ ] Every AC has a verify command or reviewer step and is understandable from the allowed reading set.
- [ ] Card Steps and Test commands cover every AC; nothing they assume is missing from the repo.
Step 4 - Implement: follow sec. 7 conventions; for each testable AC write the failing test first; keep one transaction per document action; touch only listed files plus their tests.
Step 5 - Self-check ACs: fill the AC table of the report (sec. 4) with the command run and the observed output for every AC.
Step 6 - Run gates: run the universal pre-gate plus every gate applicable to the card's work type (sec. 5 table; the card's Test commands name them); record results verbatim.
Step 7 - Report: produce the work report from the sec. 4 template; set Result.
Step 8 - Hand off: open one PR per sec. 9 with the report as body; notify the supervisor; end the session (never start another WO).
Step 9 - Bookkeeping (inside the same PR): tick the TASKS.md checkbox for the task; append one row `| <date> | WO-<id> done: <one line> |` to PROGRESS sec. 6; never edit PLAN.md.

Supervisor side of the loop: review the PR against the report; re-run the gate commands; merge or reject with reasons; update PROGRESS sec. 1/4; then assign the next WO.

Supervisor review checklist (execute in this order; any NO = reject with reasons):
1. PR title matches sec. 9; body equals the sec. 4 report with no empty placeholders.
2. Diff touches only the files the WO card names plus their tests (else F6).
3. Every PASS evidence line re-runs with the same result.
4. Every applicable gate re-runs green.
5. G4: owning docs changed in this PR when behavior changed.
6. DoD items 1-5 hold; then merge.

## 4. Work report format

Paste this template verbatim into the PR body; replace every `<placeholder>`; leave a field as `none` rather than deleting it.

```
# Work report -- WO-<ID>
- WO: <WO-S#.#>   Task: <TASKS id + one-line title>
- Worker: <model>   Date: <YYYY-MM-DD>
- Branch: <branch>   PR: #<n>

## Result
<VERIFIED | PARTIAL | BLOCKED | ESCALATED>

## Acceptance criteria
| # | AC (from WO) | Status | Evidence (command -> observed output) |
|---|---|---|---|
| AC1 | <text> | <PASS|FAIL|DEFERRED-DB> | <command> -> <observed> |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | <command> | <PASS|FAIL|N-A: reason> |

## Files changed
- <path> -- <one-line purpose>

## Tests added
- <test name> -- <what it proves>

## Docs updated (G4)
- <doc section> -- <what changed>

## Deviations
- none | <list; each with reason and its PROGRESS sec. 5 reference -- cite "pending-supervisor-D" when no sec. 5 row exists yet>

## Notes for reviewer
- <at most 5 bullets>
```

Field rules: Evidence must be reproducible (exact command plus observed output, not a summary). DEFERRED-DB is allowed only under blocker B3 (sec. 6). PARTIAL requires each failed/deferred AC to be listed under Deviations. Never paste credentials, connection strings, or full table dumps into a report.

## 5. Quality gates G1-G5

Universal pre-gate (every PR, run first from `joms-web/`): `npm run lint && npm run typecheck && npm run build && npm test` -- all must exit 0.
Canonical scripts (registered by WO-S0.1; the supervisor updates this section if and only if a name changes, and logs it in PROGRESS): `lint`, `typecheck`, `build`, `test`, `test:atomic`, `test:parity`, `test:reversal`, `db:ping`. Note: `test:atomic`, `test:parity`, and `test:reversal` are registered by WO-S0.1 as stubs; the real implementations land with WO-S2.1 (PostingEngine) and are real from S2.1 onward -- until then G1-G3 report `N-A: stub until S2.1` wherever they apply.

Gate applicability by work type (the supervisor records the applicable gates inside the card -- Test commands and DoD checklist -- from this table; a card may add gates but never drop one that applies):

| Work type | G1 | G2 | G3 | G4 | G5 |
|---|---|---|---|---|---|
| New or changed document save/delete path (service + PostingEngine) | Yes | Yes | Yes | Yes | If screens added |
| Projector or posting-math change | If save path changes | Yes | Yes | Yes | No |
| Repository/proc-parity work | If transactional | Yes | No | Yes | No |
| UI screen or wizard | No | No | No | Yes | Yes |
| Report or print layout | No | Dataset fixture | No | Yes | If new route |
| Flag or config surface | No | No | No | Yes | Yes |
| Infra (scaffold, CI, migrations tooling) | No | No | No | Yes | No |
| Additions (08 tracking, 09 AI) | If they post | If ledger-visible | If they post | Yes | Yes (default OFF) |

| Gate | Definition (copied from PLAN sec. 5) | Concrete checks (from `joms-web/`) |
|---|---|---|
| G1 | Transaction test: every new document action has a mid-failure test proving atomicity. | (1) `git grep -l "mid-failure" -- src/ tests/` lists a test file the WO owns (path-agnostic: tests may live under `src/**/__tests__/` or `tests/`). (2) `npm run test:atomic -- -t "<ServiceName>"` exits 0 (vitest name filter; script is a WO-S0.1 stub until S2.1). (3) The mid-failure test injects a failure after header/line insert and before projector/outbox steps, then asserts zero `Trs_*` rows, zero delta in `CurrentStock`/`Pcs_StockTableQty`/`Panel_StockTableQty`, zero outbox rows. |
| G2 | Parity test: golden input -> compare ledger/balance rows vs legacy proc outputs (where legacy runnable) or vs matrix expectations. | (1) `npm run test:parity -- --module <module>` exits 0, where `<module>` is an R-doc FR prefix (PRC, GRN, DC, STK, PRD, PCS, BIL, INV, CST, TRK, ...; full registry in sec. 2). (2) Fixtures live under `tests/parity/golden/<prefix>.json`; fixture ownership: the first WO of each module creates its golden file, later WOs of that module only extend it. Each fixture row cites its source: a live proc run or a 03 sec. 4 matrix row. (3) If the legacy DB is unreachable (B3), fixtures must cite the matrix row and the report must mark this gate `PASS-MATRIX`, never `PASS (live)`. |
| G3 | Reversal test: every posting has a compensating delete that restores exact prior state. | (1) `npm run test:reversal -- -t "<ServiceName>"` exits 0 (vitest name filter). (2) Test shape: snapshot affected ledger rows -> save -> delete/void -> snapshot again -> the two snapshots are identical in all columns. (3) Reversal is implemented as a compensating posting inside one transaction (03 sec. 3), never raw deletes. |
| G4 | Docs sync: owning doc updated in same PR (rule 6). | (1) Whenever behavior-bearing code changed (services, posting, projectors, routes, flags), the report's "Docs updated" section lists at least one doc. (2) `git diff --name-only main...HEAD` contains every doc named in the card's `Owning docs` line. (3) The PR also ticks the TASKS box and appends the PROGRESS sec. 6 row. |
| G5 | Rights/flags: new screens are rights-gated and flag-defaulted OFF if they're additions. | (1) Every new page renders a `<Can do="module.screen.action">` guard or an equivalent server-side right check: `git grep -n "Can do=" app/<route>/` is non-empty. (2) Additions (08/09 features) are gated by a flag that defaults OFF in the flags source; nothing under `/tracking/*` or `/ai/*` is reachable with default flags. (3) `npm test -- rights` exits 0 (guard denies a user without the right). |

Repository note: one build repository contains both `nextjs-lld/` (docs) and `joms-web/` (app) so a PR can carry code and doc updates together. If the S0.3 layout decision differs, the supervisor updates this note once and logs the decision in PROGRESS sec. 2.

### 5.1 Environment prerequisites

0. **NO-LEGACY MODE (active):** agents have NO access to legacy application code or databases and must never request it. The legacy knowledge base is the pre-extracted pack in `nextjs-lld/design/` (`SCHEMA-CATALOG.md`, `REPORT-PARAMS.md`, `ASSUMPTIONS-NOLEGACY.md`). WO-S0.2 executes as its no-legacy variant (WO-S0.2A); gate G2 uses authored golden fixtures; every use of an ASSUMPTION-n carries that tag in code and tests. The dev DB is an EMPTY SQL Server the user provisions — never a legacy copy. See `agent-docs/02-ORCHESTRATOR-PROMPTS.md` for operator prompts.
1. Repo root: `C:\Users\mahes\Documents\Projects\Fiber\Fiberpro` -- one build repository holding `nextjs-lld\` (docs) and `joms-web\` (app, created by WO-S0.1).
2. WO-S0.0/S0.1 own repository bootstrap: git init, `.gitignore` (excluding the legacy binaries -- `*.dll`, `*.exe`, `*.ocx`, `*.OLB` -- and the legacy folders), the remote/PR host choice, and `gh` auth.
3. Node 20 LTS, pinned via `.nvmrc` and `package.json` engines; npm is the only package manager and the lockfile is committed.
4. Dev DB is a restored copy of the legacy DB, provisioned by the supervisor; workers get dev-only credentials in `joms-web/.env.local`; legacy credentials stay supervisor-only.
5. Host prerequisites: Windows with Git Bash, Node 20, npm, git, `gh` (authenticated), `sqlcmd`.
6. `.env.local` is written only by the supervisor, from user-supplied values; workers never write or commit it.
7. CI includes a secret-scan step (gitleaks) from WO-S0.1 onward.

## 6. Escalation rules

Stop and hand back (never improvise) when any of these holds:
1. An open blocker B1-B6 (below) touches the WO.
2. Two allowed documents contradict each other.
3. An AC deviates from live legacy behavior where 11 sec. 3 marks "sign-off needed" and the WO cites no approved X3 row.
4. The same gate fails twice after real fix attempts.
5. The pre-flight checklist (sec. 3) cannot be completed.
6. The context budget (sec. 2) cannot cover the WO.

Blocker classes (mirrors PROGRESS sec. 3):

| ID | Blocker | Touches | Worker action |
|---|---|---|---|
| B1 | Live `Sp_currentstock` body not on disk; extraction pending (S0.2) | S2.1 fabric-ledger writer; G2 live parity | If the card's `Preconditions` names B1: do not claim. If it surfaces mid-work: stop, cite the missing body, report BLOCKED. |
| B2 | Live-DB vs shipped-SQL drift unmeasured for the module | S3+ service/repository work | Do not assume the on-disk proc equals the live one; if the WO lacks a drift-check result, escalate for it before coding the repository. |
| B3 | No legacy DB credentials/access for dev | S0.2; every G2-live check | Execute DB-free ACs only; mark the rest DEFERRED-DB in the report. |
| B4 | `.mrt` report parameters not extracted for the named report | report-building PRs | Never invent parameter lists; escalate for the X2 extraction first. |
| B5 | AI golden-set documents not collected | S8 eval gates | Never fabricate eval data; mark eval ACs BLOCKED-B5. |
| B6 | `Sp_ProductionEntryQty` (plain) vs `_1` divergence un-diffed | S4.6 barcode posting | Do not wire the plain variant until the S0.4 diff note exists. |

Other escalation classes:
- DOC-CONFLICT: quote file plus section of both sides in the escalation; propose nothing final; the supervisor resolves by fixing the owning doc first (G4). Workers never edit LLD/PLAN.
- X3: task X3 is the sign-off sheet for 11 sec. 3 defect deviations (especially the rejection counter, defect 6). A WO implementing corrected semantics must cite the approved X3 row in its AC refs; if the citation is missing, escalate class X3 before coding that AC.
- GATE-FAILED-TWICE: attach both command outputs verbatim to the report; status ESCALATED; do not attempt a third fix round.
- USER-SIGNOFF / USER-INPUT: the WO needs something only the user can supply (X3 approvers, B3 legacy-DB credentials, `.env.local` values). The worker hands back at once; the supervisor parks the WO and posts an "Awaiting user" row in PROGRESS sec. 4 stating exactly what is needed. Workers never improvise user input.

Escalation report block (append to the work report):

```
## Escalation -- WO-<ID>
- Class: B<n> | DOC-CONFLICT | X3 | GATE-FAILED-TWICE | AC-UNVERIFIABLE | CONTEXT-OVERFLOW | USER-SIGNOFF/USER-INPUT
- Where: <file, section, or command>
- Evidence: <quote both sides / both gate outputs / PROGRESS sec. 3 row id>
- Already tried: <at most 3 bullets>
- State: <clean tree | partial diff attached | which tests fail>
```

## 7. Conventions

| # | Convention (imperative) | Verify |
|---|---|---|
| 1 | Use TypeScript `strict: true`; forbid `any` and non-null `!` except with an inline justification comment. | `npm run typecheck` exits 0; lint errors on `@typescript-eslint/no-explicit-any`. |
| 2 | Follow the App Router layout of 02 sec. 1 exactly: route groups `(auth)`, `(erp)`, `(mobile)`; UI only in `app/**/page.tsx`/`layout.tsx`; handlers only in `app/api/**/route.ts`; Server Components by default; mark `'use client'` only where 02 shows `[C]`. | Diff adds pages only under groups 02 defines; `'use client'` marks match 02's `[C]` marks. |
| 3 | Name services PascalCase with camelCase methods (`GrnService.create()`, `OrderService.inHand()`); name zod DTOs `XxxCreateDto` / `XxxUpdateDto`. | `git grep -nE "class [a-z]" src/services/` empty; DTO names match the pattern. |
| 4 | Execute each document action in exactly ONE DB transaction spanning header/lines, posting, projectors, and outbox (01 sec. 2, 03 sec. 3). No exceptions. | G1 mid-failure test present and green. |
| 5 | Keep business math out of components and route handlers: components render; handlers parse, call, shape; services compute. | No tolerance or posting arithmetic in `.tsx`/`route.ts`; `git grep -nE "(CurrentStock\|Pcs_StockTable\|Panel_StockTable)" app/ src/components/` empty. |
| 6 | Import user-visible legacy strings verbatim from the constants file created in S1.7 (`src/lib/messages.legacy.ts`); never retype them. | `git grep "'INVALID TAG'"` (and each new string) hits only the constants file. |
| 7 | Reach the DB only through repositories; only `src/repositories/` (and the pool module) may import `mssql`; services never build raw SQL. | `git grep "from 'mssql'" src/` lists only repository and pool files. |
| 8 | Keep migrations additive-only: create only the new-table allow-list (Track*, ReportJob(Rows), AiActionLog, MasterAlias, TrackLabelLog per TASKS S0.3); never ALTER, DROP, or rename any legacy object. | Reviewer scans the `migrations/` diff; `git grep -iE "(DROP TABLE\|ALTER TABLE\|sp_rename)" migrations/` empty. |
| 9 | Keep secrets out of code: connection strings and keys come from env; `.env*` stays gitignored; never commit credentials (01 sec. 5 fixes the legacy `sa`-in-template exposure). | `git grep -iE "(password=\|pwd=\|;sa;)" -- src/ migrations/` empty; CI secret-scan step green. |
| 10 | Never hard-code flag defaults from this customer's store: read all flags at runtime via `getFlags()`/FlagsProvider using the 189 verbatim legacy names (07; PLAN rule 5), including legacy misspellings such as `inhoustransfer`. | `git grep -nE "<flag>\\s*[:=]\\s*(true\|false\|[0-9]+)" src/` empty for legacy flags; flags resolve from the Options store. |

Reference shape of a document action (conventions 4, 5, 7 in one picture; compare every new service against this):

```
app/api/grn/route.ts        // parse zod GrnCreateDto -> GrnService.create(dto, ctx) -> shape response
src/services/GrnService.ts  // validate + tolerances + NumberingService.take()
  -> repo.insertHeaderLines(tx, ...)         // repository owns SQL
  -> movements = MovementMatrix['Grn.Process'].build(doc)   // 03 sec. 4.1
  -> PostingEngine.apply(tx, docRef, movements)             // only engine touches stock tables
  -> Projectors.schedule(tx, keys) -> EventOutbox.emit(tx, 'grn.created', p)
  -> commit                                 // exactly ONE transaction for the whole action
app/(erp)/grn/new/page.tsx  // renders GrnWizard; no math, no SQL, no direct service calls
```

Error handling rules (add to every service):
1. Return the error contract `{ code, message, fields? }` (01 sec. 3.6); never throw raw driver errors across the API boundary.
2. Map repository errors to the closest legacy message string from the constants file when the user sees them.
3. Log one structured line per document action (01 sec. 3.7); never leave `console.log` in committed code.

## 8. Definition of Ready / Definition of Done

Definition of Ready (supervisor proves before assigning; worker re-verifies in pre-flight):
1. The WO card exists in its stage bundle (`agent-docs/workorders/WO-S0-S1-foundation.md`, `WO-S2-S3-material-loop.md`, `WO-S4-S5-production-finance.md`, or `WO-S6-S9-analysis-tracking-ai-migration.md`; pre-promotion the same bundle may live in `agent-docs/_staging/workorders/`) and names exactly one TASKS.md item.
2. Every AC is testable and carries a verify command or reviewer step plus an FR reference.
3. Refs cite only existing doc sections (V1-checked at authoring) and fit the sec. 2 context budget.
4. Card Steps enumerate every file to create or modify; at most 25 paths.
5. `Preconditions` names no open PROGRESS sec. 3 row (closed rows only, if any).
6. All dependency WOs are merged; the branch base is main.
7. The card's `Owning docs` line is filled so G4 is decidable.

Definition of Done (worker proves in the report; supervisor confirms at review):
1. Every AC is PASS with an evidence line, or listed under Deviations with a blocker class.
2. Universal pre-gate plus every applicable G1-G5 gate is PASS (or N-A with reason).
3. Owning docs are updated in the same PR; TASKS box ticked; PROGRESS sec. 6 row appended.
4. The diff contains no TODO/FIXME, no debugger statements, no secrets, and no non-additive migration.
5. The PR body equals the work report and the title matches sec. 9.
6. The supervisor has merged the PR. Only merge counts as done.

## 9. PR & commit conventions

1. One WO -> one branch `wo/<id>-<slug>` -> one PR targeting main. Never mix two WOs in one PR.
2. PR title format: `WO-S2.3: <imperative summary>` (at most 72 characters), using the TASKS item ID.
3. PR body = the work report (sec. 4), pasted verbatim; no other narrative.
4. Start every commit message with the WO id (`WO-S2.3: ...`); the supervisor squash-merges keeping the PR title.
5. Never merge your own PR; only the supervisor merges, after re-running the gates.
6. If the diff exceeds roughly 800 lines or 25 files, stop and request a split (the WO was sized wrong); do not expand the PR.

Correct title examples (copy the shape): `WO-S2.3: Add GrnService with process-GRN wizard and zod DTO`;
`WO-S3.6: Implement godown and unit transfers with ack parity`. Incorrect: `Fix GRN` (no WO id),
`WO-S2.3+S2.4: ...` (two WOs), `WO-s2.3: ...` (lowercase stage id).

## 10. Staging-to-final documentation SOP & 5-pass verification loop

SOP (supervisor executes for every new or edited agent doc):
1. Draft or edit the file only in `agent-docs/_staging/`; never write directly to a final path.
2. Run passes V1-V5 (below) in order; fix and re-run from the failed pass.
3. On V5 pass, move the file to its final path (`README.md` -> `agent-docs/README.md`; numbered docs -> `agent-docs/`; R-docs -> `agent-docs/requirements/`; WO bundles -> `agent-docs/workorders/`), leaving the filename unchanged.
4. Stamp the promoted file with one line: `Verified: V1-V5 <YYYY-MM-DD>`.
5. Delete the staging copy; update the README file map; append a promotion row to PROGRESS sec. 6.
6. Fast lane for trivial edits (typos, renamed command): run V2 and V5 only; log the fast-lane use.

Record-keeping inside the loop:
1. Keep a running pass log at the top of the staged file (`> V1 pass <date> -- <one line>`, one line per pass); strip the log at promotion and replace it with the single `Verified:` stamp.
2. If a pass fails, record the failing check, fix, and restart from the failed pass in order.
3. Never promote a file whose pass log shows an unresolved failure.
4. The 5-pass loop applies to every doc that lives in `agent-docs/` (R-docs, WO templates, this framework, the README); LLD docs 00-11 follow the review workflow of 10 sec. 5 instead.

| Pass | Name | Check (all imperative, all testable) |
|---|---|---|
| V1 | Traceability | Extract every reference (`NN sec. X`, `FR-*`, `S#.#`, `B#`, `G#`, `X3`, `D#`) with grep; confirm each target exists and says what is claimed (method of 10 sec. 1.2). Pass = zero dangling or mis-cited references. |
| V2 | Consistency | Confirm no statement conflicts with 00-11/PLAN/TASKS/PROGRESS; flag names verbatim; routes match 02; service names match 04; every table has equal cell counts per row; ASCII only; no term used before it is defined. |
| V3 | Worker-executability | Simulate a Flash session on a sample WO: follow sec. 3 using only reading allowed by sec. 2. Pass = every step completes without extra context, the budget holds, and every command runs as written (or is marked S0.1-dependent). |
| V4 | Framework completeness | Confirm: sections 1-11 present and numbered in order; G1-G5 all expanded with commands; B1-B6 mapped; DoR/DoD present; the report template contains every field the protocol references; every "stop" condition has an escalation path. Pass = no reference to an undefined artifact. |
| V5 | Final QA | Confirm line count within target range; imperative voice throughout; no filler prose; run a full supervisor read-through; then promote per the SOP. |

## 11. Failure modes & recovery

| # | Failure | Detection | Recovery | Owner |
|---|---|---|---|---|
| F1 | Worker output does not compile or lint | Universal pre-gate fails at review | Mark report FAILED; reassign the same WO once with a hint appended; a second consecutive failure -> supervisor splits the WO or implements directly | Supervisor |
| F2 | An AC cannot be verified (no command or reviewer step proves it) | Self-check (sec. 3 step 5) cannot produce evidence | Stop; never weaken or skip the AC; report ESCALATED (class AC-UNVERIFIABLE) citing the AC; supervisor rewrites the AC testably and reassigns; not counted as a worker failure | Worker raises, supervisor rewrites |
| F3 | Doc drift: reality contradicts an LLD statement | During implement or self-check | Stop immediately (code never contradicts docs; if reality wins, the doc changes in the same change); hand back both citations (class DOC-CONFLICT); supervisor fixes the owning doc first (G4), amends the WO, reassigns; log in PROGRESS sec. 5 | Worker raises, supervisor resolves |
| F4 | Legacy DB unavailable (B3 open, or outage) | Pre-flight DB check fails, or G2-live cannot run | Execute only DB-free ACs; mark DB-dependent ACs and G2-live as DEFERRED-DB; hand back; supervisor reschedules after S0.2 or the environment fix | Worker raises, supervisor reschedules |
| F5 | Worker exceeds the context budget (confusion, repetition, invented APIs) | Report or PR cites files or rules outside the allowed reading set | Discard the session; trim or split the WO; reassign a fresh session; never let the worker push through | Supervisor |
| F6 | Out-of-scope edits (files outside the card's named scope) | PR diff vs the files the WO card names | Reject the PR; worker reverts out-of-scope hunks and resubmits; on recurrence, reassign | Supervisor |
| F7 | Flaky gate (result differs across runs without a code change) | Gate run twice with different results | Run the gate three times; if instability persists, escalate with all three outputs; supervisor quarantines the test and fixes the harness | Worker raises |
| F8 | Stale branch or merge conflict (main moved after branch creation; the PR does not merge cleanly) | Rebase or PR merge check reports conflicts | Worker rebases onto main, re-runs the universal pre-gate and all applicable gates on the rebased tree, then resubmits; on TASKS.md/PROGRESS.md conflicts the later PR wins (supervisor applies that rule at merge) | Worker rebases, supervisor merges |

Worker first-aid before escalating (try each only once, in order; record what was tried in the escalation block):
1. Re-read the WO Refs sections slowly; confirm the failure is not a misread requirement.
2. Re-run the failing command from a clean state (`git stash`, `npm ci`, re-run) to rule out stale state.
3. Search the allowed reading set for the exact error string or symbol; do not widen the search to disallowed docs.
If first-aid resolves it, note the cause under Deviations and continue; if not, escalate.

Anti-patterns (each is an automatic reject at review, mapped to the failure above):
- Inventing a table, proc, flag, or route name that does not appear in the allowed reading set (F5).
- Deleting or weakening a failing test to make a gate pass (F1, F6).
- Copying a legacy defect from 11 sec. 3 into code without an X3 citation (sec. 6, class X3).
- Porting a dead-code branch from the 11 sec. 4 register (parity policy forbids it).
- Wrapping a document action's steps in two transactions "temporarily" (convention 4; automatic G1 fail).

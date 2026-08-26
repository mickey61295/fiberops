# 01 — STATE (Living Project State)

> Updated every commit. Numbers below are **claims**; `scripts/context_check.sh`
> is the **verifier**. On conflict: trust the script, fix this file, log drift in 03-PITFALLS.

Last verified: 2026-08-26 (session: rollback4-recovery)

## Milestone status

| Milestone | Scope | Status |
|---|---|---|
| M0 — Planning & context framework | deep dive + PLAN-2.0 + CONTEXT system | **DONE** |
| M1 — App shell & menu registry | real routes, sidebar from registry, parity tracker, coming-soo pages, approval inbox shell | **DONE** (original tag lost in rollback #4; milestone recorded in worklog + patch 0003) |
| M2 — MasterTable engine + masters | 24 master configs, shared master-service, form×agent parity, /admin/company | **DONE** (tag `m2-done`) |
| M3 — DocScreen engine + 15-stage chain forms + wiring W1/W3/W4 + PostingEngine extraction | 22 posting services + shared zod + DocScreen engine + 20 doc screens + Order Hub + pickers + /api/upload | **SPEC FROZEN** (`specs/SPEC-M3.md`, ADR-014) — implementation NOT STARTED, Wave A first |
| M4 — RegisterScreen engine + registers + wiring W2/W6 | | NOT STARTED |
| M5 — Extended doc families | | NOT STARTED |
| M6 — Reports, MIS, admin, print | | NOT STARTED |

## Ground truth (verified by context_check.sh)

| Metric | Value | How to verify |
|---|---|---|
| Git HEAD | `rollback4-recovery` commit (re-created after rollback #4; original m1/m2 commits lost — see PITFALLS #16) | `git rev-parse --short HEAD` |
| Agent tools | **120** (72 inline + 24 factory create + 24 factory update) | `scripts/context_check.sh` |
| Prisma models | 54 | `grep -c "^model " prisma/schema.prisma` |
| Master configs | **24** (pure-data files in `src/lib/erp/master-configs/`) | context_check + `tests/unit/master-configs.test.ts` |
| ERP view/shell components | 16 (masters-view deleted in M2) | `ls src/components/erp/*.tsx \| wc -l` |
| Archetype engines | 1 (`master-table.tsx` in `src/components/archetypes/`) | context_check |
| Menu registry | 113 items · 17 groups | `tests/unit/menu-registry.test.ts` |
| Live routes (M2) | 14: M1 set + `/admin/company`; `/masters` now the MasterTable hub (+ dynamic `/masters/[entity]` × 24) | LIVE_ROUTES in `src/lib/erp/menu-registry.ts` |
| Parity (M2) | **4/113 items live** · 11/17 groups · legacy coverage 28.7% (73/254 distinct forms) | `/parity` page or `parityStats()` |
| E2E pipeline tests | 15, all passing | `npx vitest run` |
| Registry unit tests | 13 | `npx vitest run` |
| Master config contract tests | 8 | `npx vitest run` |
| Master form×agent parity tests | 7 blocks → 75 tests at runtime (loop over all 24 configs) | `npx vitest run` |
| MAX_STEPS (agent loop) | 12 | grep in `src/app/api/agent/route.ts` |
| API routes | `/api/agent`, `/api/agent/approve`, `/api/erp`, `/api/seed`, `/api/route.ts` | ls `src/app/api/` |

## Known drift / gaps

1. **`PROMPT_VERSION` constant does NOT exist** in `route.ts` (older session summary
   claimed `v5-2026-08-26`). Do not "restore" a constant that was never in this baseline.
2. **`/api/upload` route is MISSING** (rollback ate it; `docExtract.ts` survived).
   → Rebuild in M3 (PDF ingest lands in DocScreen AI-prefill).
3. Tool counting changed in M2: factory-built master tools (`masterCreateTool`/
   `masterUpdateTool`) do not carry inline `name:` lines — the verifier counts
   inline + factory calls. Never trust a naive `name:` grep again.
4. Single-field masters (dia, part, component) have update tools that can only
   report "No fields to update" — documented behavior (SPEC-M2 §11.2), not a bug.
5. **Rollback #4 (2026-08-26, recovered same day)**: sandbox restored `.git` to
   `3f09291` (Phase-1.8 era) while KEEPING M2-final working files; it also
   resurrected files M1/M2 had deleted (`app/page.tsx`, `erp/sidebar.tsx`,
   `erp/masters-view.tsx`) and restored a STALE Phase-4-era prisma client in
   `node_modules` (58-model). The 54-model `prisma/schema.prisma` was lost from
   the working tree during recovery and RECONSTRUCTED via
   `scripts/rebuild_schema_54.py` (shapes derived from tools.ts + test usage —
   see PITFALLS #16). Original m1/m2 commits and tags are gone; patch exports
   0003/0004 in `download/` are the surviving evidence.
6. **tsc noise is now 32 errors** — the 54-world orphans: `src/lib/erp/{flags,exposure,cumrate}.ts`
   (reference removed Phase-3/4 models Flag/Bill/prs — only `/api/config` imports
   flags), Phase-3/4 seed/cleanup scripts (`seed_commercial`, `seed_stages`,
   `cleanup_e2e_bills`, `cleanup_stale_t3`, `verify_money_loop`), plus the old
   known noise (vitest.config poolOptions, examples/, skills/, .next cache).
   Do NOT chase these; they document the eaten Phase-3/4 lineage. Full list in
   PITFALLS #16.

## What exists today (file inventory — the parts that matter)

| Path | What it is |
|---|---|
| `src/lib/erp/master-configs/` | **M2 single source of master truth**: types.ts + 24 per-entity configs + index.ts registry |
| `src/lib/erp/posting/master-service.ts` | **M2 shared service**: planMasterCreate/Update + listMasters/countMasters + buildMasterSchema — the ONLY master business logic (ADR-001) |
| `src/components/archetypes/master-table.tsx` | MasterTable engine (client): grid, search, CSV export, create/edit slide-over |
| `src/app/(erp)/masters/page.tsx` | hub: 24 entity cards by category with live counts |
| `src/app/(erp)/masters/[entity]/page.tsx` | config-driven MasterTable screen (unknown slug → 404) |
| `src/app/(erp)/masters/actions.ts` | `saveMasterAction` server action → same service as agent tools |
| `src/app/(erp)/admin/company/page.tsx` | company profile + FinYear MasterTable (`company-finyear` item live) |
| `src/lib/erp/menu-registry.ts` | M1 single navigation truth (LIVE_ROUTES grew: `/admin/company`) |
| `src/lib/agent/tools.ts` | 120 tools; master CRUD = thin delegates over master-service (factory pattern) |
| `tests/pipeline/master-parity.test.ts` | **the P2 guarantee**: per-entity tool-path vs service-path equivalence |
| `tests/unit/master-configs.test.ts` | config contract (delegates, tools, fields, columns) |
| `src/app/(erp)/layout.tsx` + 11 module routes | routed shell (M1) |
| `src/app/(erp)/coming/[id]/page.tsx`, `/parity` | registry-driven coming-soon + parity tracker (M1) |
| `src/lib/erp/menu-registry.ts` + `src/components/erp/{app-shell,nav-sidebar,topbar,parity-footer}.tsx` | shell components (M1) |
| `src/lib/agent/docExtract.ts` | upload listing + pdftotext (survivor) |
| `prisma/schema.prisma` | 54 models — **UNCHANGED in M2** (ADR-013: zero schema churn) |
| `docs/CONTEXT/specs/SPEC-M2.md` | frozen M2 spec (+ ERRATUM block: 'list' type, refCreateOnFly, title-dup check, select z.string) |

DELETED in M2: `src/components/erp/masters-view.tsx` (read-only 11-tab view).
DELETED in M1: `src/app/page.tsx` (view-switcher), `src/components/erp/sidebar.tsx`.

## Open decisions awaiting user

1. Multi-company: keep single-company UI, preserve `coyCode`? (recommended: yes until M6)
2. Barcode bundle flow: port in M5 or defer M7?
3. Tally export: JSON adapter in M6 or skip?

## Next actions (in order)

1. Implement M3 **Wave A** per `specs/SPEC-M3.md` §14: `chain.ts` + `schemas/` +
   `posting/` extraction (22 services + ledger.ts) + tools.ts delegation +
   `tests/pipeline/doc-parity.test.ts`. Exit: all tests green, zero behavior change.
2. Waves B→D per spec §14 (engine + order family → chain screens → accounts/
   inventory + AI-prefill). Tag `m3-done` after Wave D acceptance.
3. Update this file every wave (same commit).

## M2 notes for future sessions

- Master CRUD flows: NEVER inline master logic again — configs + service only.
  New master entity = 1 config file + 1 index.ts entry (+ tools auto-generate via
  `masterCreateTool/masterUpdateTool` factories in tools.ts).
- The parity test loop (`master-parity.test.ts`) auto-covers new configs — extend
  `inputFor` when adding an entity.
- `buildMasterSchema(config, mode)` is the ONE schema source: agent tool schema +
  service validation + (form renders from the same config fields).
- FK inputs resolve by code-then-name; `fabric.diaValue` auto-creates Dia (ERRATUM 2);
  date-keyed entities (govt-holiday) need day-range lookups, never findUnique-on-string.
- Prisma DateTime filters REJECT bare date strings on SQLite ("premature end of
  input") — always `new Date(...)` first (see PITFALLS #13).

## Remote / git state

- Local `main` is the working branch; `agent/order-program-flow` was pushed to
  GitHub (github.com/mickey61295/fiberops) at an older tip — remote is STALE.
- History was cleaned with git-filter-repo (blobs >50MB stripped). Never re-add
  binaries from source-erp/.
- Push requires a FRESH PAT from the user each time (protocol in PITFALLS #8).
- Patches exported to `download/`: 0001 (order-program-flow), 0002 (plan-2.0),
  0003 (m1-app-shell), 0004 (m2-master-table), 0005 (rollback4-recovery).
- `.gitignore` now blocks the heavy untracked dirs (`/source-erp/`, `/workspace/`,
  `/download/`, `/upload/`, `/tool-results/`, `/.zscripts/`, `/mini-services/`,
  `/examples/`) so `git add -A` can never re-add legacy binaries (PITFALLS #6).
- Tags after rollback #4: `m2-done` (re-created on the recovery commit — tree is
  M2-final), `rollback4-recovered`.

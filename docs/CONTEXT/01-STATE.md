# 01 — STATE (Living Project State)

> Updated every commit. Numbers below are **claims**; `scripts/context_check.sh`
> is the **verifier**. On conflict: trust the script, fix this file, log drift in 03-PITFALLS.

Last verified: 2026-08-27 (session: m3-wave-b)

## Milestone status

| Milestone | Scope | Status |
|---|---|---|
| M0 — Planning & context framework | deep dive + PLAN-2.0 + CONTEXT system | **DONE** |
| M1 — App shell & menu registry | real routes, sidebar from registry, parity tracker, coming-soo pages, approval inbox shell | **DONE** (original tag lost in rollback #4; milestone recorded in worklog + patch 0003) |
| M2 — MasterTable engine + masters | 24 master configs, shared master-service, form×agent parity, /admin/company | **DONE** (tag `m2-done`) |
| M3 — DocScreen engine + 15-stage chain forms + wiring W1/W3/W4 + PostingEngine extraction | 22 posting services + shared zod + DocScreen engine + 20 doc screens + Order Hub + pickers + /api/upload | **WAVE B DONE** (`specs/SPEC-M3.md` §14): Wave A extraction + Wave B order family (DocScreen engine, doc-configs, W1 chain bar, W4 pickers, /orders/new, Order Hub + BOM card, nextFormUrl + agent "Open form") — Waves C (13 chain screens) → D (accounts/inventory + /api/upload) NOT STARTED |
| M4 — RegisterScreen engine + registers + wiring W2/W6 | | NOT STARTED |
| M5 — Extended doc families | | NOT STARTED |
| M6 — Reports, MIS, admin, print | | NOT STARTED |

## Ground truth (verified by context_check.sh)

| Metric | Value | How to verify |
|---|---|---|
| Git HEAD | `m3-wave-b` commit (Wave B: order family + DocScreen engine + W1/W3/W4 wiring) | `git rev-parse --short HEAD` |
| Agent tools | **120** (51 inline + 24 factory create + 24 factory update + 21 docTool delegates) | `scripts/context_check.sh` |
| Prisma models | 54 | `grep -c "^model " prisma/schema.prisma` |
| Shared zod schemas (M3-A) | **17 files** in `src/lib/erp/schemas/` (verbatim tool contracts) | context_check |
| Posting services (M3-A) | **20 files** in `src/lib/erp/posting/` (17 op services + ledger.ts + types.ts + master-service.ts) | context_check |
| Chain definition (M3-A) | `src/lib/erp/chain.ts` — 15 stages, nextStage/computeChainState/stageFormUrl + resolveStageUrl (Wave B, id-aware) (ADR-007 single source; PIPELINE deleted from tools.ts) | context_check |
| tools.ts size | 2805 → 1693 lines (all 21 SPEC-M3 §5 write ops thin delegates; suggest_next_step gained nextFormUrl) | `wc -l` |
| Doc configs (M3-B) | **1** (`order.ts`) + frozen types + registry + coercion in `src/lib/erp/doc-configs/` | context_check |
| DocScreen engine (M3-B) | `src/components/archetypes/doc-screen.tsx` — New (header grid + line editor + totals + review + commit) / View modes, config-driven | context_check |
| Wiring (M3-B) | W1 chain bar (`chain-bar.tsx`, every DocScreen + Hub) · W3 Order Hub (`/orders/[id]`, resolves id OR orderNo, 12 family sections + rollups) · W4 pickers (`doc-picker.tsx` + `/api/erp?resource=master_search`, create-on-the-fly via master-service) · nextFormUrl (suggest_next_step json) + agent-panel "Open form" | context_check + route smoke |
| Master configs | **24** (pure-data files in `src/lib/erp/master-configs/`) | context_check + `tests/unit/master-configs.test.ts` |
| ERP view/shell components | **19** (16 + Wave B chain-bar + doc-picker + bom-card) | `ls src/components/erp/*.tsx \| wc -l` |
| Archetype engines | **2** (`master-table.tsx` + `doc-screen.tsx`) | context_check |
| Menu registry | 113 items · 17 groups | `tests/unit/menu-registry.test.ts` |
| Live routes (M3-B) | **16**: M2 set + `/orders/new` + `/orders/[id]` (dynamic doc-view routes link to module root in nav) | LIVE_ROUTES in `src/lib/erp/menu-registry.ts` |
| Parity (M3-B) | **6/113 items live** · 11/17 groups · legacy coverage 30.7% (78/254 distinct forms) | `/parity` page or `parityStats()` |
| E2E pipeline tests | 15, all passing | `npx vitest run` |
| Doc form↔agent parity tests (M3-A) | **19 tests** (18 ops × both doors + full-chain ledger signature equality) | `npx vitest run` |
| Doc-config contract + form-door tests (M3-B) | **18 tests** (§7 contracts + coercion + action composition integration) | `npx vitest run` |
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
6. **tsc noise is now ~30 errors** (fluctuates 29-31 with the .next cache) — the
   54-world orphans: `src/lib/erp/{flags,exposure,cumrate}.ts`
   (reference removed Phase-3/4 models Flag/Bill/prs — only `/api/config` imports
   flags), Phase-3/4 seed/cleanup scripts (`seed_commercial`, `seed_stages`,
   `cleanup_e2e_bills`, `cleanup_stale_t3`, `verify_money_loop`), plus the old
   known noise (vitest.config poolOptions, skills/).
   Do NOT chase these; they document the eaten Phase-3/4 lineage. Full list in
   PITFALLS #16.
7. **Two LATENT pre-existing bugs found & fixed by the M3-A doc-parity test**
   (both sat in the inline tool code since rollback #4's schema reconstruction,
   uncovered because no test exercised those paths):
   - `create_purchase_order` passed `itemCode` into the nested pOLine create →
     PrismaClientValidationError (POLine has no such column). Fixed in
     `posting/purchase-order.ts` (itemCode stays in the plan display only).
   - `receive_grn` without deptCode keyed/created the CurrentStock bucket with
     `deptId: ''` → FK violation on create, and the ''-keyed unique lookup never
     matched the null-keyed buckets that exist. Fixed in `posting/grn.ts`
     (null dims when no dept — ADR-004 pattern; dept-keyed buckets preserved).
   See PITFALLS #18.
8. **BOM line REMOVAL is a single-door exception** (`removeBomLineAction` in
   `orders/actions.ts` is a direct db delete — no `delete_bom_line` tool exists in
   the SPEC-M3 §11 inventory). BOM line CREATION is dual-door (planBom). Revisit
   in M5 if agents need to remove BOM lines (would need a new tool + ADR).
9. **SPEC-M3 ERRATUM (Wave B)** documented in `doc-configs/types.ts`: (1) optional
   `pickerValueField` on DocField/DocLineField — colour/size pickers emit NAME
   (planOrder resolves by name) while buyer/style emit code; (2) DocConfig carries
   `schema` (the shared zod) for form-door safeParse; (3) `DocScreenConfig` =
   serializable subset (service/schema cannot cross the RSC boundary — the client
   calls server actions by slug).

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
| `src/lib/erp/menu-registry.ts` | M1 single navigation truth (LIVE_ROUTES grew: `/admin/company` + M3-B `/orders/new`, `/orders/[id]`) |
| `src/lib/erp/chain.ts` | **M3-A: the ONE 15-stage chain def** (ADR-007) — CHAIN + computeChainState + nextStage + stageFormUrl + resolveStageUrl (M3-B id-aware); suggest_next_step + chain bar + DocScreen CTAs share it |
| `src/lib/erp/schemas/` (17 files) | **M3-A: shared zod** — the agent tool schemas extracted VERBATIM (prompt contract); form actions will safeParse the same objects |
| `src/lib/erp/posting/` (17 op services + ledger.ts + types.ts) | **M3-A: PostingEngine** — plan/commit per op; postLedger+bumpStock (ADR-004 comments); DocPlanResult types |
| `src/lib/erp/legacy-enums.ts` | **M3-A: ADR-012 residence** — STAGE_DEPT + documented legacy DeptID/rework magic numbers |
| `src/lib/erp/doc-configs/` (types + order + index + coerce) | **M3-B: DocConfig frozen types (§7 + ERRATUM) + order config + registry + form coercion** |
| `src/lib/erp/doc-actions.ts` | **M3-B: the form door's generic server actions** — planDocAction (serializable plan for review) / commitDocAction (re-plan + commit, same as agent approve flow) |
| `src/components/archetypes/doc-screen.tsx` | **M3-B: DocScreen engine** — New (header grid + W4 pickers + line editor + totals + review step + post-commit CTAs) / View modes; draft state survives create-on-the-fly |
| `src/components/erp/chain-bar.tsx` | **M3-B: W1 chain mini-pipeline bar** — 15 dots, done-fills, current-stage ring, "Next →" Link via resolveStageUrl |
| `src/components/erp/doc-picker.tsx` | **M3-B: W4 picker** — searchable dropdown over `/api/erp?resource=master_search` + create-on-the-fly Sheet reusing MasterFieldInput + saveMasterAction |
| `src/components/erp/bom-card.tsx` | **M3-B: BOM card** (Order Hub #bom) — inline add editor (planBom-backed) + remove (single-door exception, drift #8) |
| `src/app/(erp)/orders/new/page.tsx` | **M3-B: Order Sheet New mode** + recent-docs table (item order-sheet-new LIVE) |
| `src/app/(erp)/orders/[id]/page.tsx` | **M3-B: Order Hub (W3)** — resolves id OR orderNo; header + chain bar + order lines + BOM card + 11 family sections with rollups; unknown → 404 (item order-hub LIVE) |
| `src/app/(erp)/orders/actions.ts` | **M3-B: BOM card actions** — addBomLineAction (planBom dual-door) + removeBomLineAction (exception) |
| `src/app/api/erp/route.ts` | + `resource=master_search` (W4 picker feed — same listMasters read path) |
| `src/lib/agent/tools.ts` | 120 tools, ALL write ops now thin delegates: masterCreateTool/masterUpdateTool (M2) + docTool (M3-A); inline leftovers: approve_pending, adjust_stock, update_order, create_sizes (deliberate — outside SPEC-M3 §5 inventory) |
| `tests/pipeline/doc-parity.test.ts` | **M3-A: the P2 guarantee at transaction scale** — 18 ops × agent-door vs form-door + full-chain StockLedger signature equality + net-zero bucket assertions |
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

1. Implement M3 **Wave C** per `specs/SPEC-M3.md` §14: 13 chain doc-configs
   (program, PO, GRN, jobwork ×2, cut, line-issue, production, rework,
   rejection, despatch — §8 inventory rows 3-13) + routes + view modes +
   family-row links from the Order Hub. Exit: acceptance #3 complete
   (form-only 15-stage chain), #4 complete (per-op parity already test-backed
   by doc-parity; extend if form actions diverge), #9 route smoke.
2. Wave D per spec §14: invoice, debit-note, payment, journal, cost-sheet,
   stock-adjustment (+post_stock_adjustment tool), godown-transfer
   (+transfer_stock tool), /api/upload rebuild + AI-prefill seeding.
   Tag `m3-done` after Wave D acceptance.
3. Update this file every wave (same commit).

## M3 Wave B notes for future sessions

- **DocConfig is the ONLY thing a new doc screen needs**: config (fields mirror
  the shared schema) + page file + LIVE_ROUTES entry. The generic actions
  (`doc-actions.ts`) and DocScreen engine do the rest. Wave C = 13 configs +
  13 page files + registry entries.
- **The DocScreen flow**: edit → planDocAction (serializable plan review) →
  commitDocAction (re-plans + commits — same re-derivation as agent approve).
  NEVER cache the plan client-side; determinism is the contract.
- **`toScreenConfig()` strips service+schema** — client components receive the
  serializable subset only; server actions resolve the config by slug.
- **Picker value fields**: default = master codeField ?? titleField; use
  `pickerValueField` when the service resolves by a different field (colour/
  size by NAME). The API takes `valueField` as a query param.
- **Dynamic [id] routes in nav/parity/coming links** fall back to the module
  root (`getHref(item).split('/[id]')[0]`) — a literal `/orders/[id]` href
  crashes Next `<Link>` ("Dynamic href ... not supported" — caught by the
  /parity 500 during route smoke).
- **Order Hub supplementary queries**: JobworkOrder.orderId / PcsDespatch.orderId
  have NO reverse relation on Order (reconstructed schema) — queried separately
  by orderId; GRNs come via poLines.po.grns (only PO-linked GRNs are visible).
- **revalidatePath is wrapped in try/catch** in the doc actions — it throws
  outside a Next request scope (vitest), and revalidation must never fail a
  commit that already succeeded.
- **`resolveStageUrl`** (chain.ts, Wave B additive export) substitutes ids into
  `[id]` routes and keeps query params BEFORE the `#` anchor; falls back to the
  frozen stageFormUrl when the id is unknown. suggest_next_step's json now
  carries `nextFormUrl` (additive) and the agent panel renders an "Open form"
  button when a tool result json contains it.

## M3 Wave A notes for future sessions

- **Zero-logic-in-tools is now test-enforced**: doc-parity runs every op through
  BOTH doors; re-inlining logic into a tool breaks the ledger-signature equality.
- **Two latent bugs were fixed during extraction** (PO itemCode, GRN deptId:'' —
  see drift #7 / PITFALLS #18). The `receive_grn` service still does NOT use
  postLedger (inline StockLedger + dept-keyed CurrentStock buckets when deptCode
  given) — preserved legacy behaviour, not an oversight.
- `nextNumber`/`resolveDocNo` (pad-4 generic) now live in `numbering.ts`; tools
  with bespoke formats (SO-1001 unpadded, PO-Y-001 3-pad) keep their inline
  resolution in the service — do NOT "unify" them without an ADR (doc numbers
  are user-visible contract).
- `suggest_next_step` json gained additive fields (`state.order`, stage
  `formUrl`/`formParam` on pipeline/nextStep) — existing consumers unaffected.
  Wave B added `nextFormUrl` (§9.5) — json is additive-only, do not remove fields.

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
  0003 (m1-app-shell), 0004 (m2-master-table), 0005 (rollback4-recovery),
  0006 (spec-m3-frozen), 0007 (m3-wave-a-posting-engine),
  0008 (m3-wave-b-order-family).
- `.gitignore` now blocks the heavy untracked dirs (`/source-erp/`, `/workspace/`,
  `/download/`, `/upload/`, `/tool-results/`, `/.zscripts/`, `/mini-services/`,
  `/examples/`) so `git add -A` can never re-add legacy binaries (PITFALLS #6).
- Tags: `m2-done`, `spec-m3-frozen`, `m3-wave-a`, `m3-wave-b` (M3 Wave B).
  Before rollback #4: `m2-done` (re-created on the recovery commit — tree is
  M2-final), `rollback4-recovered`.

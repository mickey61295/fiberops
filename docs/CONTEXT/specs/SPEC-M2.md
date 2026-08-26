# SPEC-M2 — MasterTable Engine + Master Screens

> **FROZEN IMPLEMENTATION SPEC.** Written BEFORE any M2 code (rule: spec-before-code,
> `docs/CONTEXT/00-START-HERE.md` #3). A session with ZERO chat context implements
> M2 correctly from this file alone. Sources verified against:
> `prisma/schema.prisma` (24 master models, read 2026-08-26), `src/lib/agent/tools.ts`
> (89 tools; 21 master create + 19 master list + 2 master update), `docs/form-taxonomy.json`
> (52 master archetype forms), PLAN-2.0 §3.17 / §4.1 / §6-M2.
> Status: APPROVED FOR IMPLEMENTATION.

## 1. Goal

Build the **MasterTable archetype engine**: one config-driven CRUD screen per master
entity. Every one of the **24 master entities** in the Prisma schema gets:

- a **form door** — `/masters/<slug>`: grid + search + CSV export + create/edit slide-over
- an **agent door** — `list_<plural>` + `create_<singular>` + `update_<singular>` tools

Both doors call the **same service functions** (`src/lib/erp/posting/master-service.ts`,
ADR-001: one service per operation — the 21 existing create tools + 2 update tools are
rewritten as thin delegates; logic duplication is structurally impossible).

`/masters` becomes a hub page (24 entity cards with live counts), replacing the
read-only 11-tab `MastersView` (deleted). `/admin/company` goes live (FinYear table +
single-company profile card) → menu item `company-finyear` live → **4/113 items live**.

**Acceptance (all must pass):**
1. `npx tsc --noEmit` — no NEW errors (pre-existing noise list in PITFALLS #10 exempt).
2. `npx vitest run` — existing 28 tests still pass + new `master-configs` +
   `master-parity` suites pass.
3. All 24 entities: create + edit + search + CSV export via form at `/masters/<slug>`.
4. All 24 entities: list + create + update via agent tools (31 new tools, 23 refactored).
5. **Form↔agent parity is test-asserted**: for every entity, tool path
   (`execute → plan → commit`) and form path (`planMasterCreate/Update → commit`)
   produce identical resolved records.
6. `/masters` hub shows all 24 configs grouped by category with live row counts.
7. Route smoke: `/masters`, `/masters/<slug>` × 24, `/admin/company` → 200;
   unknown slug → 404.
8. `scripts/context_check.sh` updated for new reality, all checks green.
9. Agent tool count: **120** (89 existing + 31 new).
10. `parityStats()`: 4 live items / 113, 11 live groups, legacyLive 73 (70 + 3 company forms).

## 2. Non-goals (explicitly OUT of M2 — each deferred with an ADR)

- **No Prisma schema changes, no migrations** (ADR-013).
- **No HSN master model** — legacy FrmHSN/FrmHSNPce map to nothing in the schema;
  `Style.hsn` / item-level strings suffice for invoices. Deferred to M6 admin/settings.
  (ADR-013 — plan §6 M2 line "HSN/GST setup" re-sequenced.)
- **No `post_opening` / opening-stock ledger posting** — a ledger operation, lands with
  the M3 PostingEngine refactor (plan §7 already stages `post_opening` there).
  `Party.openingBalance` field remains a plain master field. (ADR-013.)
- **No BOM grid editor** — `BomLine` is a child collection of Style → M3 DocScreen
  style detail view. `create_bom` tool remains the agent door meanwhile.
- **No delete/deactivate** on masters (reference-data safety + FK protection design
  belongs to M6 rights era). Update only.
- **No W4 create-on-the-fly pickers** inside other screens (needs DocScreens, M3).
- **No pagination** — server fetch caps at 500 rows/entity (masters are small);
  RegisterScreen (M4) gets real pagination.
- **No bulk import**, no audit-trail UI (AgentTurn rows are already written by the
  agent door; a dedicated audit view is M6).

## 3. Master entity inventory (24) — the frozen config table

Slug / delegate / key / auto-prefix / tools-after-M2 / legacy forms covered.
`✓` = tool exists today (will be delegated to the service); `＋` = new in M2.

| # | slug | delegate | key field | prefix | create / update / list | category | legacyForms |
|---|------|----------|-----------|--------|------------------------|----------|-------------|
| 1 | party | party | code | PRT- | ✓ / ✓ / ✓ | commercial | FrmPartyMaster, FrmPartyBlnc, FrmPartyBalanceRegister |
| 2 | buyer | buyer | code | B- | ✓ / ＋ / ✓ | commercial | FRMBUYER, FrmMasBuyerDept |
| 3 | merchandiser | merchandiser | name | — | ✓ / ＋ / ✓ | commercial | — |
| 4 | exporter | exporter | code | — | ✓ / ＋ / ✓ | commercial | — |
| 5 | season | season | code | — | ✓ / ＋ / ✓ | commercial | — |
| 6 | style | style | styleNo | STY- | ✓ / ＋ / ✓ | product | FrmStyleMaster |
| 7 | colour | colour | code | — | ✓ / ＋ / ✓ | product | FrmShadeEntry |
| 8 | size | size | name | — | ✓ / ＋ / ✓ | product | — |
| 9 | size-group | sizeGroup | name | — | ✓ / ＋ / ＋ | product | frmSizeGroup |
| 10 | dia | dia | value | — | ✓ / ＋ / ✓ | product | — |
| 11 | uom | uOM | code | — | ✓ / ＋ / ✓ | product | FrmCountGroup |
| 12 | lot | lot | lotNo | LOT- | ✓ / ＋ / ✓ | product | — |
| 13 | yarn | yarn | code | Y- | ✓ / ＋ / ✓ | product | FrmMill |
| 14 | fabric | fabric | code | F- | ✓ / ＋ / ✓ | product | FrmFabricmaster, FrmMasFabric |
| 15 | accessory | accessory | code | A- | ✓ / ＋ / ✓ | product | FrmAccDescMaster, FrmAccmaster |
| 16 | part | part | name | — | ＋ / ＋ / ＋ | product | — |
| 17 | component | component | name | — | ＋ / ＋ / ＋ | product | — |
| 18 | design | design | code | — | ＋ / ＋ / ＋ | product | FrmDesignEntry |
| 19 | godown | godown | code | G | ✓ / ＋ / ✓ | org | FrmGodownMaster |
| 20 | department | department | code | D | ✓ / ＋ / ✓ | org | FrmDeptMasterNew, frmDeptGroup |
| 21 | employee | employee | code | EMP- | ✓ / ✓ / ✓ | org | FrmEmpmaster |
| 22 | line | line | code | — | ✓ / ＋ / ✓ | org | — |
| 23 | govt-holiday | govtHoliday | date+name | — | ＋ / ＋ / ＋ | org | Frm_Mas_Holiday |
| 24 | fin-year | finYear | code | — | ✓ / ＋ / ✓ | admin | frmFcymaster |

**New tools (31):** update × 22 (buyer, style, fabric, yarn, accessory, godown,
department, colour, size, uom, dia, lot, season, merchandiser, exporter, fin_year,
line, size_group, part, component, design, govt_holiday) · create × 4 (part,
component, design, govt_holiday) · list × 5 (size_groups, parts, components,
designs, govt_holidays). `create_sizes` (batch) stays untouched — a convenience
wrapper, not the single-record door.

**Legacy master forms NOT modeled in the schema** (documented, not silently dropped —
ADR-013): banks (FrmBankMaster/FrmMasBank/FrmMasBankAccount), machines (×2), rates
(FrmRateMaster/FrmCommRateMaster/FrmPrdnRateMaster/frmFCRmaster), ranges (×3),
templates, threads, stages, expenses, work nature, order-input, HSN (×2), and generic
`Frm_Master`/`Frm_AppMas`. Disposition: schema additions via future ADR in M6, or
absorbed by existing fields. The `masters` menu item keeps all 52 forms in its
`legacyForms` array (coverage counting is item-level and already live since M1).

## 4. Frozen types (`src/lib/erp/master-configs/types.ts`)

```ts
export type MasterFieldType = 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'textarea'
export type MasterCategory = 'commercial' | 'product' | 'org' | 'admin'

export interface MasterField {
  name: string          // input name — scalar Prisma field, or FK input (buyerCode, uomCode…)
  label: string
  type: MasterFieldType
  required?: boolean
  options?: { value: string; label: string }[] // select
  defaultValue?: string | number | boolean
  placeholder?: string
  description?: string  // LLM-facing text → zod .describe() in generated tool schema
  refEntity?: string    // config slug referenced (FK) — resolved by code THEN name
  min?: number
  max?: number
}

export interface MasterListColumn {
  field: string         // flattened row field (refs resolved server-side to *Name/*Value)
  label: string
  mono?: boolean        // codes → font-mono
  numeric?: boolean     // right-align
  refEntity?: string    // future W2 link target (M3); plain text in M2
}

export interface MasterConfig {
  slug: string          // /masters/<slug>
  entity: string        // canonical singular key
  label: string         // plural screen label ('Parties')
  singular: string      // 'Party'
  delegate: string      // Prisma delegate: 'party' | 'uOM' | 'finYear' | 'govtHoliday' …
  model: string         // Prisma model name: 'Party' | 'UOM' …
  category: MasterCategory
  codeField?: string    // unique business key ('code' | 'styleNo' | 'lotNo' | 'value' | 'name')
  codePrefix?: string   // auto-assign prefix when set AND code omitted/taken
  codePad?: number      // default 4
  updateKeyField?: string // tool-side identifier for update (defaults codeField || 'name')
  titleField: string
  searchFields: string[]  // flattened fields searched client-side
  defaultSort: { field: string; dir: 'asc' | 'desc' }
  listColumns: MasterListColumn[]
  fields: MasterField[]  // create/edit form AND generated tool schema
  createTool: string
  updateTool: string
  listTool: string
  legacyForms: string[]
  notes?: string
}
```

`src/lib/erp/master-configs/index.ts` (created by §5 files) exports:

```ts
export const MASTER_CONFIGS: MasterConfig[]        // 24, ordered commercial → product → org → admin
export const MASTER_CATEGORIES: Array<{ key: MasterCategory; label: string; blurb: string }>
export function getMasterConfig(slug: string): MasterConfig | undefined
export function configsByCategory(cat: MasterCategory): MasterConfig[]
```

**Configs are PURE DATA** (no functions, no zod objects) — serializable, importable
from server, client, tools, and tests. Per-entity files per CONVENTIONS:
`master-configs/<slug>.ts` each exporting `export const partyConfig: MasterConfig = …`.

## 5. Field definitions per config (frozen — the form AND the tool schema)

Legend: `*` = required. FK inputs resolved `refEntity` by its `codeField` first, then
`titleField` (name). Dates accepted as ISO strings (service coerces via `new Date()`).

- **party**: name*, partyType (select: supplier/customer/both, default supplier),
  gstin, pan, address(textarea), city, state, phone, email, openingBalance(number).
  Columns: code(mono) name partyType gstin city state. Search: name code city state gstin phone.
- **buyer**: name*, dept, merchandiser. Columns: code(mono) name dept merchandiser.
- **merchandiser**: name*(=key), email, phone. Columns: name email phone.
- **exporter**: code*(=key), name*, iec, gstin. Columns: code(mono) name iec gstin.
- **season**: code*(=key), name*, startDate(date), endDate(date).
  Columns: code(mono) name startDate endDate. Sort code asc.
- **fin-year**: code*(=key), name*, start*(date), end*(date), active(checkbox, default false).
  Columns: code(mono) name start end active. Sort code desc. Category admin.
- **style**: description*, buyerCode(ref buyer), category (select: woven/knit/other),
  sam(number), hsn. Key styleNo, prefix STY-. Columns: styleNo(mono) description
  buyerName category sam(numeric). Search: styleNo description buyerName category hsn.
- **colour**: code*(=key), name*. Columns: code(mono) name.
- **size**: name*(=key), sort(number, default 0). Columns: name sort(numeric). Sort sort asc.
- **size-group**: name*(=key), sizes(CSV text of size names/ids — note: naive string
  master, display-only in M2). Columns: name sizes.
- **dia**: value*(=key, e.g. "26"). Columns: value(mono). Sort value asc.
- **uom**: code*(=key), name*(e.g. code "KG", name "Kilogram"). Columns: code(mono) name.
- **lot**: lotNo(key, prefix LOT-), partyCode(ref party). Columns: lotNo(mono) partyName.
- **yarn**: code(key, prefix Y-), count*, blend, uomCode*(ref uom), rate(number).
  Columns: code(mono) count blend uomName rate(numeric).
- **fabric**: code(key, prefix F-), construction, gsm(number), width(number),
  diaValue(ref dia), uomCode*(ref uom), rate(number).
  Columns: code(mono) construction gsm(numeric) width(numeric) diaValue uomName rate(numeric).
- **accessory**: code(key, prefix A-), name*, category, uomCode*(ref uom), rate(number).
  Columns: code(mono) name category uomName rate(numeric).
- **part**: name*(=key). Columns: name.
- **component**: name*(=key). Columns: name.
- **design**: code*(=key), name*. Columns: code(mono) name.
- **godown**: code(key, prefix G), name*, location.
  Columns: code(mono) name location.
- **department**: code(key, prefix D), name*, orderSno(number, default 0),
  isProcess(checkbox, default false). Columns: code(mono) name orderSno(numeric) isProcess.
- **employee**: code(key, prefix EMP-), name*, deptCode(ref department),
  role (select: operator/supervisor/helper/staff), pieceRate(number), dailyWage(number),
  active(checkbox, default true). Columns: code(mono) name deptName role pieceRate(numeric)
  dailyWage(numeric) active.
- **line**: code*(=key), name*, deptCode(ref department), capacityPcsPerHour(number).
  Columns: code(mono) name deptName capacityPcsPerHour(numeric).
- **govt-holiday**: date*(date, =key), name*. Columns: date name. Sort date desc.

## 6. The service (`src/lib/erp/posting/master-service.ts`)

One module, both doors. NO business logic anywhere else (ADR-001).

```ts
import type { MasterConfig, MasterField } from '../master-configs/types'

export interface MasterPlan {
  ok: boolean
  errors: string[]                       // zod issues + ref-resolution failures + duplicate key
  summary: string                        // agent plan summary line
  creates?: { table: string; data: any }
  updates?: { table: string; id: string; data: any }
  sideEffects?: string[]
  commit: () => Promise<{ id: string; code?: string; [k: string]: any }>
}

export async function planMasterCreate(config: MasterConfig, raw: Record<string, unknown>): Promise<MasterPlan>
export async function planMasterUpdate(config: MasterConfig, raw: Record<string, unknown>): Promise<MasterPlan>
//   raw for update MUST contain the updateKeyField value; the key field itself is never patched.
export async function listMasters(config: MasterConfig, opts?: { search?: string; take?: number }): Promise<MasterRow[]>
export async function countMasters(config: MasterConfig): Promise<number>
export function buildMasterSchema(config: MasterConfig, mode: 'create' | 'update'): z.ZodObject<any, any>
export function buildDefaultInput(config: MasterConfig): Record<string, unknown> // defaultValue per field
```

`MasterRow` = flattened display record: `{ id, …scalars, <ref>Name? }` — the page
resolves FK ids into `buyerName` / `uomName` / `deptName` / `partyName` / `diaValue`
server-side (one `include` per refEntity found in `fields`), so the client grid and
search never touch raw ids.

**Behavior rules (frozen):**
1. **Coercion first**: strings from FormData → number/boolean/date per field type;
   `''` → `undefined` (never write empty strings over optional fields).
2. **Validation**: `buildMasterSchema(config, mode)` — same zod object powers the agent
   tool's `schema` (mode=create) and the service's internal re-validation. Required →
   `.min(1)` for text; select → `z.enum(values)`; number → `z.number()`; date →
   `z.string()` (ISO) coerced to Date at mapping; checkbox → `z.boolean()`.
3. **FK resolution** (create AND update): for each `refEntity` field, resolve target by
   its `codeField`, falling back to `titleField`. Not found → error
   `"<Label> '<value>' not found — create it first via <createTool> or /masters/<slug>"`
   and NO plan is returned (ok:false). Resolution happens BEFORE the plan so the agent
   approval card never proposes a dangling FK.
4. **Auto-code**: when `codePrefix` is set and the code field is absent or already
   taken → next free `<prefix><n padded to codePad>` (existing tool algorithm:
   `findMany({ where: { [codeField]: { startsWith: prefix } } })`, walk n from 1).
   When `codePrefix` is absent, a missing required key is a validation error.
5. **Duplicate key**: create with an existing unique key → error
   `"<Entity> '<key>' already exists"` (matches existing tool text patterns).
6. **Update semantics**: only provided fields are patched (partial update). The
   updateKeyField value identifies the record; it is excluded from the patch.
   Record not found → `ok:false` error `"<Entity> '<key>' not found"`.
7. **Plan shape**: exactly the existing `ToolResult.plan` shape — `summary`,
   `creates[]` (create) or `updates[]` (update), `sideEffects[]` (e.g.
   `"Can now be referenced on orders, POs, GRNs"`). The agent tool wraps this;
   the form action calls `commit()` directly.
8. **No deletes. No ledger writes. No finYear switching** (active toggle on fin-year
   updates ALL rows' `active` so exactly one is active — the single exception to
   "no cross-row effects" and it is a master-data invariant, not a posting).
9. `listMasters` orders by `defaultSort`, `take` default **500**, includes ref
   lookups, maps rows to flattened `MasterRow`.

## 7. Agent tool changes (`src/lib/agent/tools.ts`)

**Delegation refactor (23 tools)** — every existing master create/update tool keeps
its `name`, `description`, `domain: 'masters'`, `isWrite` and overall schema shape,
but `execute` becomes:

```ts
async execute(args) {
  const plan = await planMasterCreate(getMasterConfig('party')!, args)
  if (!plan.ok) return { text: plan.errors.join('; ') }
  return {
    text: `Proposed ${plan.summary}`,
    plan: { summary: plan.summary, creates: plan.creates ? [plan.creates] : undefined,
            updates: plan.updates, sideEffects: plan.sideEffects },
    commit: plan.commit,
  }
}
```

Their hand-written inline logic (auto-code walk, FK resolution) is DELETED — the
service owns it. Tool schemas become `buildMasterSchema(config, 'create')` /
`buildMasterSchema(config, 'update')` so field definitions live once, in the config.
Descriptions keep the same guidance content (what + when + auto-code note + next-step
hint per CONVENTIONS "summary states the NEXT pipeline stage" — masters state what
can now reference them).

**New tools (31)** follow the same delegate pattern; names per §3. Update tools take
the updateKeyField as identifier + all other fields optional. `create_govt_holiday`
takes `date` + `name`. List tools mirror existing `list_*` shape: `{ text }` with
compact table + `json.rows` for the model.

Tool count after M2: **120** (verify via context_check).

**SYSTEM_PROMPT** (`src/app/api/agent/route.ts`): extend the masters section —
"every master entity can be listed, created AND updated from chat; prefer
`update_<entity>` over re-creating" — one sentence, no restructuring.

## 8. UI contracts

### 8.1 MasterTable engine (`src/components/archetypes/master-table.tsx`, client)

```
props: { config: MasterConfig, rows: MasterRow[] }
state: search, editing: null | { mode:'new' } | { mode:'edit', row }, submitting, errors[]
```

- **Toolbar**: search input (filters rows client-side across `searchFields`),
  `+ New <Singular>` (emerald), `Export CSV`, `Ask agent` (opens global panel via
  `useAgentPanel().openAgent("List ${label} and help me create or update one")`),
  count badge `N rows`.
- **Grid**: `config.listColumns`; sticky header; `mono` → `font-mono`; `numeric` →
  `text-right`; empty state → "No <label> yet — create the first one". Row click →
  edit slide-over. Keyboard: `/` focuses search.
- **Slide-over** (`Sheet`, side right): fields from `config.fields` — text/number/
  select/checkbox/date/textarea inputs, required marked `*`, FK fields are plain text
  inputs accepting code OR name (M2; searchable picker = M3 W4) with the accepted
  format in placeholder. Submit → `saveMasterAction(config.slug, id|null, FormData)`;
  on `{ok:false}` show `errors[]` inline; on success close + `router.refresh()`.
- **CSV export**: client-side from filtered rows (listColumns + id), filename
  `<slug>-<yyyymmdd>.csv`, RFC4180 quoting.

### 8.2 Server action (`src/app/(erp)/masters/actions.ts`, `'use server'`)

```ts
export async function saveMasterAction(
  slug: string, id: string | null, formData: FormData
): Promise<{ ok: true; code?: string } | { ok: false; errors: string[] }>
```

- `getMasterConfig(slug)`; unknown → `{ ok:false, errors:['Unknown master'] }`.
- id=null → `planMasterCreate` (raw from formData entries) → `commit()`.
- id → `planMasterUpdate` (patch = provided fields only) → `commit()`.
- `revalidatePath('/masters')` + `revalidatePath('/masters/' + slug)` (+ `/admin/company`
  when slug === 'fin-year'). Never throws — errors return as values.

### 8.3 Hub page (`src/app/(erp)/masters/page.tsx`, server)

Category sections (commercial → product → org → admin), each a grid of entity cards:
label, singular, live row count (`countMasters`), code hint, link `/masters/<slug>`.
Header: "Masters — 24 entities, one engine" + parity note. Replaces `MastersView`
(**delete** `src/components/erp/masters-view.tsx`; its only importer is the route).

### 8.4 Entity page (`src/app/(erp)/masters/[entity]/page.tsx`, server)

`getMasterConfig(entity) ?? notFound()`; `rows = await listMasters(config)`;
renders header (breadcrumb-safe: group label › label) + `<MasterTable config rows />`.

### 8.5 Company page (`src/app/(erp)/admin/company/page.tsx`, server)

Single-company profile card (static identity: "Baalaji Export — single-company mode",
open decision #1 note) + embedded FinYear `<MasterTable>` (fin-year config, rows via
`listMasters`). Marks `company-finyear` live.

## 9. Menu registry changes (`src/lib/erp/menu-registry.ts`)

- `LIVE_ROUTES` += `'/admin/company'` (the ONLY liveness change; `/masters` already live).
- Item `company-finyear`: `agentTools` += `'update_fin_year'`.
- Item `masters`: append `'update_party', 'update_buyer', 'update_style', 'update_employee'`
  (representative update tools — create tools already listed).
- **No route/phase edits** (M1 freeze rule).

## 10. File map

**NEW**
| File | Kind |
|---|---|
| `src/lib/erp/master-configs/types.ts` | §4 types |
| `src/lib/erp/master-configs/{party,buyer,merchandiser,exporter,season,style,colour,size,size-group,dia,uom,lot,yarn,fabric,accessory,part,component,design,godown,department,employee,line,govt-holiday,fin-year}.ts` | 24 config files (pure data) |
| `src/lib/erp/master-configs/index.ts` | registry + helpers |
| `src/lib/erp/posting/master-service.ts` | §6 service |
| `src/components/archetypes/master-table.tsx` | §8.1 engine |
| `src/app/(erp)/masters/[entity]/page.tsx` | §8.4 |
| `src/app/(erp)/masters/actions.ts` | §8.2 server action |
| `src/app/(erp)/admin/company/page.tsx` | §8.5 |
| `tests/unit/master-configs.test.ts` | §11.1 |
| `tests/pipeline/master-parity.test.ts` | §11.2 |

**MODIFIED**: `src/lib/agent/tools.ts` (§7), `src/lib/erp/menu-registry.ts` (§9),
`src/app/(erp)/masters/page.tsx` (hub), `src/app/api/agent/route.ts` (SYSTEM_PROMPT
sentence), `tests/unit/menu-registry.test.ts` (4 live items / legacyLive 73),
`scripts/context_check.sh` (tool count 120, erp components 16, new critical files,
new test files), `docs/CONTEXT/01-STATE.md` + `worklog.md` (same commit, rule #5),
`docs/CONTEXT/02-DECISIONS.md` (ADR-013), `docs/PLAN-2.0-MENU-PARITY.md` (§6 M2/M3
re-sequencing note for HSN + post_opening).

**DELETED**: `src/components/erp/masters-view.tsx`.

**UNCHANGED**: the other 10 views' internals, `/api/erp` (masters resource stays —
harmless legacy until M3 cleanup), `prisma/schema.prisma`, pipeline tests,
`/api/agent/approve`, agent-panel.

## 11. Test plan

### 11.1 `tests/unit/master-configs.test.ts` (contract)
1. Exactly 24 configs; unique slugs, entities, delegates, tool names.
2. Every delegate exists on the Prisma client (`db[delegate]` truthy).
3. Every createTool/updateTool exists via `getTool` with `isWrite: true`;
   every listTool exists with `isWrite: false`.
4. Every config with `codePrefix` has a `codeField`; every field has a label;
   select fields have options; required FK fields declare `refEntity`.
5. `listColumns`/`searchFields` reference known flattened fields (scalars ∪ ref
   display fields).
6. `MASTER_CONFIGS` covers all 24 schema master models (party…finYear — the §3 table).

### 11.2 `tests/pipeline/master-parity.test.ts` (form↔agent, the P2 guarantee)
For EVERY config (loop over `MASTER_CONFIGS`), using a unique `M2E-<ts>` marker:
1. **Agent door**: `getTool(createTool).execute(input)` → plan present →
   `commit()` → record exists with expected resolved fields (FK ids resolved,
   auto-code assigned when prefix configured).
2. **Form door**: `planMasterCreate(config, sameInputVariation)` → `commit()` →
   record exists; assert business fields identical to what the tool path produced
   (same input shape modulo unique keys).
3. **Update parity**: tool `update` changes field A; service `planMasterUpdate`
   changes field B; both persisted.
4. **Ref resolution failure**: style with unknown buyerCode → both doors return
   errors (no dangling FK, no record).
5. **Duplicate key**: second create with same key → `ok:false` from both doors.
6. Cleanup `afterAll`: delete created rows by id ( masters only — no FK deps).

### 11.3 `tests/unit/menu-registry.test.ts` updates
- `parityStats`: liveItems 4, comingItems 109, liveGroups 11.
- LIVE_ROUTES↔files-on-disk check: `/admin/company` has a page file (passes as-is).

## 12. Gotchas (known traps for THIS spec)

1. **Prisma delegates are first-letter-lowercase of the MODEL name**: `UOM` → `db.uOM`,
   `FinYear` → `db.finYear`, `GovtHoliday` → `db.govtHoliday`, `SizeGroup` →
   `db.sizeGroup`. The config `delegate` field carries these exactly.
2. **zod v4** (`^4.0.2`): `z.enum([...])` takes string array; `.describe()` fine;
   generated schema must be a plain `z.ZodObject` for `AgentTool.schema`.
3. **SQLite + Prisma `orderBy` on missing field throws** — `defaultSort.field` must be
   a real column; `listAll`'s try/catch fallback pattern is the prior art.
4. **NULL ≠ ''** (PITFALLS #3): optional inputs map `'' → undefined` before create.
5. **`revalidatePath`** only works for actual route paths; dynamic route revalidation
   uses the literal prefix string (`/masters/party`), not generated patterns.
6. **Sheet + server action**: the slide-over is a client component; the action returns
   values (never throws) — `useTransition` + error list rendering.
7. **Don't touch `/api/erp`'s masters resource** — other legacy views still call the
   endpoint for their own data; only MastersView dies.
8. **tools.ts is ~3,400 lines** — refactor by REPLACING the 23 tool bodies in place
   (keep alphabetical-ish grouping), never re-create the file.
9. **`create_sizes` batch tool is NOT refactored** (it loops `create_size` semantics
   but with skip-existing behavior — leave as-is, it is a convenience wrapper).
10. **context_check tool regex** counts `^    name: '…',` — new tools must use the
    same 4-space indentation style or the verifier drifts.
11. **FinYear `active` toggle**: updating `active: true` must deactivate other years
    in the same commit (rule §6.8) — assert in parity test.
12. **`employee.active`** default `true`; the form checkbox unchecked → `false`,
    absent in FormData → keep current value (checkbox-absence semantics).

## 13. Definition of Done checklist

- [ ] tsc clean (no new errors) · [ ] vitest all green (28 existing + ~35 new)
- [ ] smoke: 27 routes 200, unknown slug 404 · [ ] context_check.sh green, tool count 120
- [ ] parity page shows 4/113 items live · [ ] worklog + STATE + ADR-013 in same commit
- [ ] `git tag m2-done` · [ ] patch exported to `download/0004-m2-master-table.patch`

---

## ERRATUM (pre-implementation, discovered while verifying tool schemas against code — rule #4)

Three additive amendments, all preserving existing agent behavior:

1. **`MasterFieldType` adds `'list'`** — comma-separated values. Used ONLY by
   `size-group.sizes`: form input is CSV (`"S,M,L,XL"`), tool schema renders as
   `z.array(z.string())`, service resolves each size name → id and stores the CSV of
   ids (exact legacy of `create_size_group`).
2. **`MasterField` adds `refCreateOnFly?: boolean`** — set on `fabric.diaValue`:
   missing Dia is auto-created (exact legacy of `create_fabric`). All other refs stay
   strict (error, no plan).
3. **Duplicate-key check covers the title field too** when it is unique
   (`colour.name`, `merchandiser.name`, `part/component/design/size.name`) — matches
   `create_colour`'s name-based "already exists" behavior.

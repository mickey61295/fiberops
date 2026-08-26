#!/usr/bin/env python3
"""
SPEC-M2 §7 — tools.ts master-tool refactor (persisted per Rule 9).

Replaces the 23 inline master create/update tool bodies (create_party …
create_size_group, update_party, update_employee) with thin delegates to
src/lib/erp/posting/master-service.ts, and registers 31 NEW tools
(22 update + 4 create + 5 list). create_sizes (batch) and create_bom stay
untouched (SPEC-M2 §7).

Anchors verified against the pre-refactor file; the script asserts every
boundary before touching anything.
"""
import sys

P = 'src/lib/agent/tools.ts'

lines = open(P).read().split('\n')  # lines[N-1] is source line N


def expect(n, needle):
    assert needle in lines[n - 1], f'anchor mismatch at line {n}: {lines[n - 1]!r} (wanted {needle!r})'


# --- boundary assertions (1-indexed, verified 2026-08-26) ---
expect(1844, '{')
expect(1845, "name: 'create_party'")
expect(2287, '},')
expect(2288, '{')
expect(2289, "name: 'create_sizes'")
expect(2327, '},')
expect(2328, '{')
expect(2329, "name: 'create_uom'")
expect(2593, '},')
expect(2594, '{')
expect(2595, "name: 'create_bom'")
expect(2944, '{')
expect(2945, "name: 'update_party'")
expect(3019, '},')
expect(3020, '{')
expect(3021, "name: 'update_order'")

# --- new code blocks ---

IMPORTS = """import { getMasterConfig } from '@/lib/erp/master-configs'
import { buildMasterSchema, planMasterCreate, planMasterUpdate } from '@/lib/erp/posting/master-service'"""

FACTORY = r'''
// ───────────── MASTER CRUD TOOLS (SPEC-M2 §7) — thin delegates ─────────────
// ADR-001: ALL master business logic lives in src/lib/erp/posting/master-service.ts.
// These tools and the form server action (src/app/(erp)/masters/actions.ts) call
// the SAME plan/commit functions — form and agent behavior cannot drift.

function masterCreateTool(slug: string, description: string): AgentTool {
  const config = getMasterConfig(slug)!
  return {
    name: config.createTool,
    description,
    domain: 'masters',
    isWrite: true,
    schema: buildMasterSchema(config, 'create'),
    async execute(args) {
      const plan = await planMasterCreate(config, args)
      if (!plan.ok) return { text: plan.errors.join('; ') }
      return {
        text: plan.summary,
        plan: {
          summary: plan.summary,
          creates: plan.creates ? [plan.creates] : undefined,
          sideEffects: plan.sideEffects,
        },
        commit: plan.commit,
      }
    },
  }
}

function masterUpdateTool(slug: string, description: string): AgentTool {
  const config = getMasterConfig(slug)!
  return {
    name: config.updateTool,
    description,
    domain: 'masters',
    isWrite: true,
    schema: buildMasterSchema(config, 'update'),
    async execute(args) {
      const plan = await planMasterUpdate(config, args)
      if (!plan.ok) return { text: plan.errors.join('; ') }
      return {
        text: plan.summary,
        plan: {
          summary: plan.summary,
          updates: plan.updates ? [plan.updates] : undefined,
          sideEffects: plan.sideEffects,
        },
        commit: plan.commit,
      }
    },
  }
}

const masterCreateTools: AgentTool[] = [
  masterCreateTool('party', 'Create a party master (customer / supplier / both). code is optional — auto-assigned PRT-#### if omitted or taken. Required: name, partyType (supplier|customer|both). Optional: gstin, pan, address, city, state, phone, email, openingBalance.'),
  masterCreateTool('buyer', 'Create a buyer master (the customer department / brand). code is optional — auto-assigned B-#### if omitted or taken. Required: name. Optional: dept, merchandiser.'),
  masterCreateTool('style', 'Create a style master. styleNo is optional — auto-assigned STY-#### if omitted or taken. Required: description. Optional: buyerCode, category (woven|knit), sam, hsn.'),
  masterCreateTool('yarn', 'Create a yarn master. code is optional — auto-assigned Y-#### if omitted or taken. Required: count, uomCode. Optional: blend, rate.'),
  masterCreateTool('fabric', 'Create a fabric master. code is optional — auto-assigned F-#### if omitted or taken. Required: uomCode. Optional: construction, gsm, width, diaValue (creates Dia if missing), rate.'),
  masterCreateTool('accessory', 'Create an accessory master (zipper, button, label, etc). code is optional — auto-assigned A-#### if omitted or taken. Required: name, uomCode. Optional: category, rate.'),
  masterCreateTool('godown', 'Create a godown (warehouse). code is optional — auto-assigned G#### if omitted or taken. Required: name. Optional: location.'),
  masterCreateTool('department', 'Create a department / process. code is optional — auto-assigned D#### if omitted or taken. Required: name. Optional: orderSno, isProcess.'),
  masterCreateTool('employee', 'Create an employee master. code is optional — auto-assigned EMP-#### if omitted or taken. Required: name. Optional: deptCode, role (operator|supervisor|helper), pieceRate, dailyWage, active.'),
  masterCreateTool('colour', 'Create a colour master. Required: name, code (e.g. RED, BLK, NAV). If colour exists, returns it.'),
  masterCreateTool('size', 'Create a size master. Required: name (e.g. S, M, L, XL, 32, 34). Optional: sort order.'),
  masterCreateTool('uom', 'Create a unit of measure master. Required: name (KGS, MTR, PCS, BAG), code (matching). If exists, returns it.'),
  masterCreateTool('dia', 'Create a dia (machine diameter) master. Required: value (e.g. "30", "34"). If exists, returns it.'),
  masterCreateTool('lot', 'Create a lot master. lotNo is optional — auto-assigned LOT-#### if omitted or taken. Optional: partyCode.'),
  masterCreateTool('season', 'Create a season master. Required: code, name. Optional: startDate, endDate.'),
  masterCreateTool('merchandiser', 'Create a merchandiser master. Required: name. Optional: email, phone.'),
  masterCreateTool('exporter', 'Create an exporter master (the exporting entity). Required: code, name. Optional: iec, gstin.'),
  masterCreateTool('fin-year', 'Create a financial year. Required: code, name, start, end. Optional: active (set true for current FY — deactivates other years).'),
  masterCreateTool('line', 'Create a production line. Required: code, name. Optional: deptCode, capacityPcsPerHour.'),
  masterCreateTool('size-group', 'Create a size group master. Required: name, sizes (CSV of size names). Resolves each size name to a Size row.'),
  masterCreateTool('part', 'Create a garment part master. Required: name (e.g. Front Panel, Sleeve, Collar).'),
  masterCreateTool('component', 'Create a component master. Required: name (e.g. Self Fabric, Contrast Panel).'),
  masterCreateTool('design', 'Create a design master. Required: code, name.'),
  masterCreateTool('govt-holiday', 'Create a government holiday. Required: date (ISO), name.'),
]

const masterUpdateTools: AgentTool[] = [
  masterUpdateTool('party', 'Update an existing party master by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('buyer', 'Update an existing buyer by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('style', 'Update an existing style by styleNo. All fields optional; only provided fields are updated (buyerCode resolves the buyer by code or name).'),
  masterUpdateTool('yarn', 'Update an existing yarn by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('fabric', 'Update an existing fabric by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('accessory', 'Update an existing accessory by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('godown', 'Update an existing godown by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('department', 'Update an existing department by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('employee', 'Update an existing employee by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('colour', 'Update an existing colour by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('size', 'Update an existing size by name. All fields optional; only provided fields are updated.'),
  masterUpdateTool('size-group', 'Update an existing size group by name. All fields optional; sizes = CSV/array of size names.'),
  masterUpdateTool('dia', 'Update an existing dia by value. (Dia has a single field — to change it, create a new dia.)'),
  masterUpdateTool('uom', 'Update an existing UOM by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('lot', 'Update an existing lot by lotNo. All fields optional; only provided fields are updated.'),
  masterUpdateTool('season', 'Update an existing season by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('merchandiser', 'Update an existing merchandiser by name. All fields optional; only provided fields are updated.'),
  masterUpdateTool('exporter', 'Update an existing exporter by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('fin-year', 'Update an existing financial year by code. All fields optional. Setting active=true makes it the current FY and deactivates other years.'),
  masterUpdateTool('line', 'Update an existing production line by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('part', 'Update an existing garment part by name. (Part has a single field — to rename, create a new part.)'),
  masterUpdateTool('component', 'Update an existing component by name. (Component has a single field — to rename, create a new component.)'),
  masterUpdateTool('design', 'Update an existing design by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('govt-holiday', 'Update an existing govt holiday by date (ISO). Provide name to rename it.'),
]
'''

LIST_TOOLS = r'''
// new master LIST tools (SPEC-M2 §3 — entities that had no list tool)
const masterNewListTools: AgentTool[] = [
  {
    name: 'list_size_groups',
    description: 'List size groups with their size names resolved.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const groups = await db.sizeGroup.findMany()
      const sizes = await db.size.findMany()
      const byId = new Map(sizes.map((s: any) => [s.id, s.name]))
      return {
        text: `${groups.length} size groups`,
        json: groups.map((g: any) => ({
          name: g.name,
          sizes: String(g.sizes || '').split(',').filter(Boolean).map((id: string) => byId.get(id) || id).join(', '),
        })),
      }
    },
  },
  {
    name: 'list_parts',
    description: 'List garment parts (e.g. Front Panel, Sleeve).',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.part.findMany({ take: 200 })
      return { text: `${rows.length} parts`, json: rows.map((p: any) => ({ name: p.name })) }
    },
  },
  {
    name: 'list_components',
    description: 'List components (e.g. Self Fabric, Contrast Panel).',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.component.findMany({ take: 200 })
      return { text: `${rows.length} components`, json: rows.map((c: any) => ({ name: c.name })) }
    },
  },
  {
    name: 'list_designs',
    description: 'List designs.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.design.findMany({ take: 200 })
      return { text: `${rows.length} designs`, json: rows.map((d: any) => ({ code: d.code, name: d.name })) }
    },
  },
  {
    name: 'list_govt_holidays',
    description: 'List government holidays.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.govtHoliday.findMany({ orderBy: { date: 'desc' }, take: 400 })
      return {
        text: `${rows.length} holidays`,
        json: rows.map((h: any) => ({ date: h.date instanceof Date ? h.date.toISOString().slice(0, 10) : h.date, name: h.name })),
      }
    },
  },
]
'''

SPREAD_BLOCK = """  // ───────────── MASTER CRUD TOOLS (SPEC-M2 §7) — thin delegates to master-service ─────────────
  ...masterCreateTools,
  ...masterUpdateTools,
  ...masterNewListTools,
"""

# --- apply edits bottom-up ---

# 1. delete update_party .. update_employee (lines 2945..3019)
del lines[2944:3019]

# 2. delete create_uom .. create_size_group (lines 2328..2593)
del lines[2327:2593]

# 3. delete create_party .. create_size (lines 1844..2287) and insert the spread
lines[1843:2287] = SPREAD_BLOCK.split('\n')[:-1]

src = '\n'.join(lines)

# 4. imports (after docExtract import)
anchor_import = "import { listUploadDir, extractDocument } from './docExtract'"
assert src.count(anchor_import) == 1
src = src.replace(anchor_import, anchor_import + '\n' + IMPORTS)

# 5. factory + tool arrays before writeTools declaration
anchor_write = 'const writeTools: AgentTool[] = ['
assert src.count(anchor_write) == 1
src = src.replace(anchor_write, FACTORY + '\n' + anchor_write)

# 6. list tools before allTools export
anchor_all = 'export const allTools: AgentTool[] = [...readTools, ...writeTools]'
assert src.count(anchor_all) == 1
src = src.replace(anchor_all, LIST_TOOLS + '\n' + anchor_all)

open(P, 'w').write(src)
print('tools.ts refactored: 23 inline bodies removed, delegates + 31 new tools registered')

/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== STATUTORY PAYROLL CONFIG (SPEC-M47 L-03) ==============
// PF / ESI / PT / LWF rates + thresholds — the flags.ts pattern over AppOption
// (keys `stat:<name>`, group 'statutory'): cross-cutting owner config, the
// schema-free home per PITFALLS #9. Rates are read at PAYROLL PLAN time and
// FROZEN onto the PayrollLine — a later rate change never moves a drafted run.
//
// Defaults ship every head DISABLED: a zero-config system is M46-identical
// (statDeduction 0, net = earned − advances, no deduction journals). The
// owner arms a head at /admin/statutory (setStatutory — the sanctioned door;
// unknown names rejected, registry drift-safe).
//
// READ CONTRACT (the SPEC-M42 INV-04 deadlock lesson, verbatim from flags.ts):
//   getStatutory()      — seeds missing rows idempotently; CALL ONLY OUTSIDE
//                         transactions (admin surfaces / registers). A seed
//                         write inside an open SQLite tx deadlocks WAL.
//   getStatutoryPure()  — pure read, registry defaults fill missing rows,
//                         ZERO writes — the planPayrollRun reader.
import { db } from '@/lib/db'

export type StatValueType = 'number' | 'boolean'

export interface StatDef {
  name: string
  value: string // stored (string) default
  valueType: StatValueType
  category: 'pf' | 'esi' | 'pt' | 'lwf'
  description: string
}

// ── The registry: 4 heads × rates/thresholds (single-company; state shape
//    is the owner's to configure — a per-state slab engine is OUT of scope) ──
export const STAT_DEFS: StatDef[] = [
  // — Provident Fund (employee 12% / employer 12% = EPS 8.33 + EPF 3.67;
  //    EDLI + admin are extra employer charges; wage ceiling 15000 default) —
  { name: 'pf.enabled', value: 'false', valueType: 'boolean', category: 'pf', description: 'PF head on/off — applies to employees with a UAN (the enrolled proxy)' },
  { name: 'pf.eeRate', value: '12', valueType: 'number', category: 'pf', description: 'PF employee share % (deducted from net)' },
  { name: 'pf.erRate', value: '12', valueType: 'number', category: 'pf', description: 'PF employer share % (register/challan data — NOT posted)' },
  { name: 'pf.epsRate', value: '8.33', valueType: 'number', category: 'pf', description: 'EPS carve-out % of the PF wage base (capped at the employer share)' },
  { name: 'pf.edliRate', value: '0.5', valueType: 'number', category: 'pf', description: 'EDLI charge % (employer, register data)' },
  { name: 'pf.adminRate', value: '0.5', valueType: 'number', category: 'pf', description: 'PF admin charge % (employer, register data)' },
  { name: 'pf.wageCeiling', value: '15000', valueType: 'number', category: 'pf', description: 'PF wage base cap ₹ (0 = no ceiling)' },
  // — ESI (gross ≤ threshold ⇒ covered; employee 0.75% / employer 3.25%) —
  { name: 'esi.enabled', value: 'false', valueType: 'boolean', category: 'esi', description: 'ESI head on/off — applies when line gross ≤ the wage threshold' },
  { name: 'esi.eeRate', value: '0.75', valueType: 'number', category: 'esi', description: 'ESI employee share % (deducted from net)' },
  { name: 'esi.erRate', value: '3.25', valueType: 'number', category: 'esi', description: 'ESI employer share % (register/challan data — NOT posted)' },
  { name: 'esi.wageThreshold', value: '21000', valueType: 'number', category: 'esi', description: 'Gross wage threshold ₹ — line earned ≤ threshold ⇒ covered' },
  // — Professional Tax (monthly slab: applies when line earned > threshold) —
  { name: 'pt.enabled', value: 'false', valueType: 'boolean', category: 'pt', description: 'PT head on/off — monthly amount × months in the run window' },
  { name: 'pt.monthlyAmount', value: '208', valueType: 'number', category: 'pt', description: 'PT ₹ per month (TN-shaped default)' },
  { name: 'pt.threshold', value: '10000', valueType: 'number', category: 'pt', description: 'Line earned > threshold ₹ ⇒ PT applies (single slab)' },
  // — Labour Welfare Fund (flat per month, employee + employer) —
  { name: 'lwf.enabled', value: 'false', valueType: 'boolean', category: 'lwf', description: 'LWF head on/off — per month in the run window, every earning line' },
  { name: 'lwf.eeAmount', value: '20', valueType: 'number', category: 'lwf', description: 'LWF employee ₹ per month (deducted from net)' },
  { name: 'lwf.erAmount', value: '20', valueType: 'number', category: 'lwf', description: 'LWF employer ₹ per month (register data — NOT posted)' },
]

const defByName = new Map(STAT_DEFS.map((d) => [d.name, d]))
const optKey = (name: string) => `stat:${name}`

let seeded = false

/** Idempotent seed: inserts any missing stat rows with registry defaults. */
export async function ensureStatutory(): Promise<void> {
  if (seeded) return
  const existing = await db.appOption.findMany({ where: { key: { startsWith: 'stat:' } }, select: { key: true } })
  const have = new Set(existing.map((r) => r.key.slice('stat:'.length)))
  const missing = STAT_DEFS.filter((d) => !have.has(d.name))
  if (missing.length) {
    await db.appOption.createMany({
      data: missing.map((d) => ({ key: optKey(d.name), value: d.value, group: 'statutory', label: d.description })),
    })
  }
  seeded = true
}

function coerce(raw: string | undefined, def: StatDef): any {
  const v = raw ?? def.value
  if (def.valueType === 'number') {
    const n = Number(v)
    return Number.isFinite(n) ? n : Number(def.value)
  }
  // booleans are stored as strings; tolerate a stray boolean
  const sv = v as any
  return sv === 'true' || sv === 'Y' || sv === '1' || sv === true
}

/** Read the whole statutory config as a typed record (seeds missing rows —
 * OUTSIDE transactions only; see the INV-04 note up top). */
export async function getStatutory(): Promise<Record<string, any>> {
  await ensureStatutory()
  return getStatutoryPure()
}

/** PURE READ — never writes (safe INSIDE a transaction). A missing row simply
 * means the registry default: coerce(undefined, def) already handles it. */
export async function getStatutoryPure(): Promise<Record<string, any>> {
  const rows = await db.appOption.findMany({ where: { key: { startsWith: 'stat:' } } })
  const byName = new Map(rows.map((r) => [r.key.slice('stat:'.length), r.value]))
  const out: Record<string, any> = {}
  for (const d of STAT_DEFS) out[d.name] = coerce(byName.get(d.name), d)
  return out
}

/** Validate + persist a statutory config change (the /admin/statutory door).
 * Returns the new typed value. */
export async function setStatutory(name: string, value: any): Promise<any> {
  const def = defByName.get(name)
  if (!def) throw new Error(`Unknown statutory config: ${name} — not in the registry (available: ${STAT_DEFS.map((d) => d.name).join(', ')})`)
  let stored: string
  if (def.valueType === 'number') {
    const n = Number(value)
    if (!Number.isFinite(n)) throw new Error(`Statutory config ${name} expects a number, got: ${JSON.stringify(value)}`)
    if (n < 0) throw new Error(`Statutory config ${name} cannot be negative (${n})`)
    stored = String(n)
  } else {
    const b = value === true || value === 'true' || value === 'Y' || value === 1 || value === '1'
    stored = String(b)
  }
  await ensureStatutory()
  await db.appOption.upsert({
    where: { key: optKey(name) },
    update: { value: stored },
    create: { key: optKey(name), value: stored, group: 'statutory', label: def.description },
  })
  return coerce(stored, def)
}

/** The registry itself (for the admin board / tests). */
export function statRegistry(): StatDef[] {
  return STAT_DEFS
}

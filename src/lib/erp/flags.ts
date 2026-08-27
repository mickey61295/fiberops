/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== FEATURE-FLAG REGISTRY (LLD 07 Part 2 port, subset-first) ==============
// ~25 load-bearing flags of the legacy 189 (decision C4). Legacy names are
// kept verbatim so behavior discussions map 1:1 to the LLD catalog.
// Storage: AppOption rows (key `flag:<name>`, group 'flags') — NOT a dedicated
// Flag table (the 65-model schema is frozen; AppOption is the sanctioned
// key-value store, and list_app_options already exposes it). Coercion on read.
// Enforcement points: tolerance.ts (all *dev / *_check flags) + the tools
// that consult it. GET /api/config mirrors the FlagsProvider contract.

import { db } from '@/lib/db'

export type FlagValueType = 'number' | 'boolean' | 'string'

export interface FlagDef {
  name: string
  value: string // stored (string) default
  valueType: FlagValueType
  category: 'tolerance' | 'numbering' | 'module' | 'commercial' | 'company'
  description: string
}

// ── The registry: legacy names unchanged (LLD 07 §2.1–2.3) ──
export const FLAG_DEFS: FlagDef[] = [
  // — Tolerances & deviations (LLD 07 §2.1) —
  { name: 'po_bud', value: 'true', valueType: 'boolean', category: 'tolerance', description: 'PO qty vs budget check on/off' },
  { name: 'po_buddev', value: '10', valueType: 'number', category: 'tolerance', description: 'PO qty vs budget allowed deviation %' },
  { name: 'po_allowadd', value: 'false', valueType: 'boolean', category: 'tolerance', description: 'Allow PO beyond budget deviation (warn instead of block)' },
  { name: 'po_budrt', value: 'true', valueType: 'boolean', category: 'tolerance', description: 'PO rate vs budget rate check on/off' },
  { name: 'po_budrtdev', value: '10', valueType: 'number', category: 'tolerance', description: 'PO rate vs budget allowed deviation %' },
  { name: 'grn_bal', value: 'true', valueType: 'boolean', category: 'tolerance', description: 'GRN qty vs PO/DC balance check on/off' },
  { name: 'grn_dev', value: '5', valueType: 'number', category: 'tolerance', description: 'GRN vs PO balance allowed deviation %' },
  { name: 'grn_alladd', value: 'false', valueType: 'boolean', category: 'tolerance', description: 'Allow GRN beyond PO balance deviation (warn instead of block)' },
  { name: 'i_scheck', value: 'true', valueType: 'boolean', category: 'tolerance', description: 'Issue shortage check on DC' },
  { name: 'i_sdev', value: '2', valueType: 'number', category: 'tolerance', description: 'Issue shortage allowed deviation %' },
  { name: 'bill_bcheck', value: 'true', valueType: 'boolean', category: 'tolerance', description: 'Bill qty vs GRN/DC qty check on/off' },
  { name: 'bill_bcheckdev', value: '5', valueType: 'number', category: 'tolerance', description: 'Bill vs GRN/DC allowed deviation %' },
  { name: 'trankgs_dev', value: '2', valueType: 'number', category: 'tolerance', description: 'Transfer kg deviation %' },
  { name: 'dyeinggamtper', value: '5', valueType: 'number', category: 'tolerance', description: 'Acceptable dyeing process loss % (DC kgs vs GRN kgs)' },
  { name: 'knittinggamtper', value: '3', valueType: 'number', category: 'tolerance', description: 'Acceptable knitting process loss %' },
  { name: 'entrydatedev', value: '7', valueType: 'number', category: 'tolerance', description: 'Back-dating limit in days for any document' },
  { name: 'pcsrateamt_excess_percent', value: '10', valueType: 'number', category: 'tolerance', description: 'Piece-rate amount excess cap %' },
  { name: 'jobexcess', value: '5', valueType: 'number', category: 'tolerance', description: 'Jobwork excess cap %' },
  { name: 'sampleqtylimitcheck', value: 'false', valueType: 'boolean', category: 'tolerance', description: 'Sample order qty limit check' },
  { name: 'boostupper', value: '2', valueType: 'number', category: 'tolerance', description: 'Requirement boost-up % (FN_Add_BoostupPer parity)' },
  { name: 'reserveper', value: '0', valueType: 'number', category: 'tolerance', description: 'Requirement reserve %' },
  // — Commercial / module switches (LLD 07 §2.3) —
  { name: 'notds', value: 'false', valueType: 'boolean', category: 'commercial', description: 'TDS computation suppressed when true' },
  { name: 'doublebillpassreqd', value: 'false', valueType: 'boolean', category: 'commercial', description: 'Second pass required before a bill becomes payable' },
  { name: 'gstenable', value: 'true', valueType: 'boolean', category: 'commercial', description: 'GST fields enabled on invoices' },
  { name: 'need_rate_conf_for_dc', value: 'false', valueType: 'boolean', category: 'commercial', description: 'Block DC without an approved rate confirmation' },
  { name: 'tds_default_percent', value: '2', valueType: 'number', category: 'commercial', description: 'Default TDS % on bill pass (194C contract/jobwork)' },
  // — Company config (legacy globalcompanyid stand-in) —
  { name: 'coy_state', value: '33', valueType: 'string', category: 'company', description: 'Company GST state code (33 = Tamil Nadu) — drives CGST/SGST vs IGST split' },
  // — Non-return DC aging (gendcdays) —
  { name: 'gendcdays', value: '5', valueType: 'number', category: 'module', description: 'Non-return jobwork DC aging days before digest flags it' },
]

const defByName = new Map(FLAG_DEFS.map((f) => [f.name, f]))
const optKey = (name: string) => `flag:${name}`

let seeded = false

/** Idempotent seed: inserts any missing flag rows with registry defaults. */
export async function ensureFlags(): Promise<void> {
  if (seeded) return
  const existing = await db.appOption.findMany({ where: { key: { startsWith: 'flag:' } }, select: { key: true } })
  const have = new Set(existing.map((r) => r.key.slice('flag:'.length)))
  const missing = FLAG_DEFS.filter((f) => !have.has(f.name))
  if (missing.length) {
    await db.appOption.createMany({
      data: missing.map((f) => ({ key: optKey(f.name), value: f.value, group: 'flags', label: f.description })),
    })
  }
  seeded = true
}

function coerce(raw: string | undefined, def: FlagDef): any {
  const v = raw ?? def.value
  switch (def.valueType) {
    case 'number': {
      const n = Number(v)
      return Number.isFinite(n) ? n : Number(def.value)
    }
    case 'boolean': {
      // values are stored as strings; tolerate a stray boolean
      const sv = v as any
      return sv === 'true' || sv === 'Y' || sv === '1' || sv === true
    }
    default:
      return String(v)
  }
}

/** Read flags as a typed record (names optional; registry defaults fill gaps). */
export async function getFlags(names?: string[]): Promise<Record<string, any>> {
  await ensureFlags()
  const rows = await db.appOption.findMany({
    where: names?.length ? { key: { in: names.map(optKey) } } : { key: { startsWith: 'flag:' } },
  })
  const byName = new Map(rows.map((r) => [r.key.slice('flag:'.length), r.value]))
  const defs = names?.length ? names.map((n) => defByName.get(n)).filter(Boolean) as FlagDef[] : FLAG_DEFS
  const out: Record<string, any> = {}
  for (const d of defs) out[d.name] = coerce(byName.get(d.name), d)
  return out
}

/** Single typed flag value (registry default when the row is missing). */
export async function getFlag<T = any>(name: string): Promise<T> {
  const def = defByName.get(name)
  if (!def) throw new Error(`Unknown flag: ${name} (not in registry)`)
  await ensureFlags()
  const row = await db.appOption.findUnique({ where: { key: optKey(name) } })
  return coerce(row?.value, def) as T
}

/** Validate + persist a flag change. Returns the new typed value. */
export async function setFlag(name: string, value: any): Promise<any> {
  const def = defByName.get(name)
  if (!def) throw new Error(`Unknown flag: ${name} — available: ${FLAG_DEFS.map((f) => f.name).join(', ')}`)
  let stored: string
  if (def.valueType === 'number') {
    const n = Number(value)
    if (!Number.isFinite(n)) throw new Error(`Flag ${name} expects a number, got: ${JSON.stringify(value)}`)
    stored = String(n)
  } else if (def.valueType === 'boolean') {
    const b = value === true || value === 'true' || value === 'Y' || value === 1 || value === '1'
    stored = String(b)
  } else {
    stored = String(value)
  }
  await ensureFlags()
  await db.appOption.upsert({
    where: { key: optKey(name) },
    update: { value: stored },
    create: { key: optKey(name), value: stored, group: 'flags', label: def.description },
  })
  return coerce(stored, def)
}

/** The registry itself (for listing / docs). */
export function flagRegistry(): FlagDef[] {
  return FLAG_DEFS
}

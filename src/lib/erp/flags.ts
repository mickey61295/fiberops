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
  category: 'tolerance' | 'numbering' | 'module' | 'commercial' | 'company' | 'notification'
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
  // SPEC-M42 INV-04 — the negative-stock guard at postLedger: when on, any
  // movement that would take a CurrentStock bucket below zero on a uom it
  // touches FAILS with an actionable error. Default false = the legacy
  // "warns but never blocks" behavior preserved.
  { name: 'block_negative_stock', value: 'false', valueType: 'boolean', category: 'tolerance', description: 'Refuse stock movements that would overdraw a bucket below zero (off = legacy warn-only)' },
  { name: 'sampleqtylimitcheck', value: 'false', valueType: 'boolean', category: 'tolerance', description: 'Sample order qty limit check' },
  { name: 'boostupper', value: '2', valueType: 'number', category: 'tolerance', description: 'Requirement boost-up % (FN_Add_BoostupPer parity)' },
  { name: 'reserveper', value: '0', valueType: 'number', category: 'tolerance', description: 'Requirement reserve %' },
  // — Commercial / module switches (LLD 07 §2.3) —
  { name: 'notds', value: 'false', valueType: 'boolean', category: 'commercial', description: 'TDS computation suppressed when true' },
  { name: 'doublebillpassreqd', value: 'false', valueType: 'boolean', category: 'commercial', description: 'Second pass required before a bill becomes payable' },
  { name: 'gstenable', value: 'true', valueType: 'boolean', category: 'commercial', description: 'GST fields enabled on invoices' },
  { name: 'need_rate_conf_for_dc', value: 'false', valueType: 'boolean', category: 'commercial', description: 'Block DC without an approved rate confirmation' },
  // SPEC-M41 PRC-04 — the PO approval gate: when on, planGrn REFUSES receipts
  // against a PO whose Approval row (entity 'po') is not approved. Default
  // false = legacy behavior (post regardless) preserved.
  { name: 'po_appr', value: 'false', valueType: 'boolean', category: 'commercial', description: 'GRN requires an APPROVED purchase order (reads the po Approval row before receiving)' },
  { name: 'tds_default_percent', value: '2', valueType: 'number', category: 'commercial', description: 'Default TDS % on bill pass (194C contract/jobwork)' },
  // — Company config (legacy globalcompanyid stand-in) —
  { name: 'coy_state', value: '33', valueType: 'string', category: 'company', description: 'Company GST state code (33 = Tamil Nadu) — drives CGST/SGST vs IGST split' },
  // — Non-return DC aging (gendcdays) —
  { name: 'gendcdays', value: '5', valueType: 'number', category: 'module', description: 'Non-return jobwork DC aging days before digest flags it' },
  // — SPEC-M42 INV-05 — waste as an identity: waste receipts land in the
  // waste godown (auto-vivified on first use) at the scrap rate, never in
  // good stock at the good item's rate. scrap rate 0 = waste carries no value
  // until the operator sets one.
  { name: 'waste_godown_code', value: 'WASTE', valueType: 'string', category: 'module', description: 'Godown code waste receipts post into (created on first use)' },
  { name: 'waste_scrap_rate', value: '0', valueType: 'number', category: 'module', description: 'Scrap value per kg of waste (₹/kg; 0 = waste unvalued until set)' },
  // — SPEC-M42 INV-07 — opening stock is postable only within the FY-start
  // window (ties into the Phase-6 FY-close discipline). Default off = legacy.
  { name: 'opn_fy_gate', value: 'false', valueType: 'boolean', category: 'module', description: 'Gate OPN- opening-stock entries to the financial-year start window' },
  { name: 'opn_fy_window_days', value: '30', valueType: 'number', category: 'module', description: 'Days after the active FY start within which OPN- entries are allowed' },
  // — Notifications & digest (SPEC-M9 §9 M13) — arm the channels; the digest
  // itself is built by lib/erp/notifications/digest.ts, surfaced at
  // /notifications/digest + /api/cron/digest —
  { name: 'notification.digest_enabled', value: 'false', valueType: 'boolean', category: 'notification', description: 'Master arm for the daily digest SEND (preview stays available; webhook fires only when true)' },
  { name: 'notification.webhook_url', value: '', valueType: 'string', category: 'notification', description: 'Webhook target the digest is POSTed to (Slack/Discord/Make/Zapier-style JSON endpoint). Empty = nowhere to send.' },
  { name: 'notification.cron_secret', value: '', valueType: 'string', category: 'notification', description: 'Shared secret for unauthenticated /api/cron/digest calls (?secret=...). Empty = session-only access.' },
  { name: 'notification.low_stock_pcs', value: '0', valueType: 'number', category: 'notification', description: 'Low-stock alert threshold on pcs current-stock buckets (0 = section off; negative material balances are always flagged)' },
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

/** Single typed flag value (registry default when the row is missing).
 * PURE READ — never seeds: ensureFlags WRITES on the global db connection,
 * which deadlocks when getFlag runs INSIDE an open transaction that already
 * holds the SQLite write lock (WAL single-writer — SPEC-M42 INV-04 hit this
 * in the transfer commit: getFlag→ensureFlags→createMany blocked on the tx,
 * the tx blocked on getFlag, 5s interactive-transaction timeout killed both).
 * Seeding stays in setFlag/getFlags (the admin surfaces); a missing row here
 * simply means the registry default — coerce(undefined, def) already does. */
export async function getFlag<T = any>(name: string): Promise<T> {
  const def = defByName.get(name)
  if (!def) throw new Error(`Unknown flag: ${name} (not in registry)`)
  const row = await db.appOption.findUnique({ where: { key: optKey(name) } })
  return coerce(row?.value, def) as T
}

/** Validate + persist a flag change. Returns the new typed value. */
export async function setFlag(name: string, value: any): Promise<any> {
  const def = defByName.get(name)
  if (!def) throw new Error(`Unknown flag: ${name} — not in the registry (available: ${FLAG_DEFS.map((f) => f.name).join(', ')})`)
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

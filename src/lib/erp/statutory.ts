/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== SPEC-M48 L-03 — STATUTORY PAYROLL (PF/ESI/PT/LWF) ==============
// One module, three jobs:
//   1. CONFIG — one AppOption row `payroll:statutory` (group 'payroll') holds
//      the rates as JSON. Resolves with SAFE DEFAULTS when the row is absent
//      or unparseable — never throws (a bad edit must not kill payroll).
//      Rate law churns by state and year: the system ships machinery + the
//      stable well-known numbers (PF 12/12, ESI 0.75/3.25 limit ₹21,000) and
//      leaves PT/LWF OFF with the fields ready for the owner's state numbers.
//   2. COMPUTE — pure computeStatutory(earned, cfg) per PayrollLine at PLAN
//      time (the M46 freeze doctrine: rates + numbers freeze on the run).
//      ESI skipped above the gross limit; PF wage capped at the ceiling;
//      employee-side deductions capped at earned (deduct order pf→esi→pt→lwf).
//   3. PARTIES — ensureStatutoryParties(): find-or-create the authority
//      Party per head (EPFO / ESIC / PT-BOARD / LWF-BOARD, partyType
//      'supplier' — we remit to them). Idempotent, the ensureEmployeeParty
//      pattern. The authority's party LEDGER is the remittance tracker
//      (loop-closure #4): −Σ J2 journals + Σ payments to it = pending.
import { db } from '@/lib/db'

// ── the config shape (frozen verbatim onto PayrollRun.statutory) ──

export interface PfConfig {
  enabled: boolean
  employeePct: number // deducted from the wage
  employerPct: number // employer cost, NOT deducted
  epsPct: number // display split of the employer share (ECR detail) — no amount effect
  wageCeiling: number // 0 = no ceiling; PF wage = min(earned, ceiling)
}
export interface EsiConfig {
  enabled: boolean
  employeePct: number
  employerPct: number
  grossLimit: number // earned above this ⇒ employee NOT covered (0 = no limit)
}
export interface PtConfig {
  enabled: boolean
  amount: number // flat, applied when earned ≥ grossThreshold (single-slab — states' multi-slab reality is the owner's to encode as the dominant slab)
  grossThreshold: number
  state: string // display label only (payslip/register)
}
export interface LwfConfig {
  enabled: boolean
  employee: number
  employer: number
  state: string // display label only
}
export interface StatutoryConfig {
  pf: PfConfig
  esi: EsiConfig
  pt: PtConfig
  lwf: LwfConfig
}

/** Safe defaults — the stable federal numbers ON, the state numbers OFF. */
export const DEFAULT_STATUTORY: StatutoryConfig = {
  pf: { enabled: true, employeePct: 12, employerPct: 12, epsPct: 8.33, wageCeiling: 15000 },
  esi: { enabled: true, employeePct: 0.75, employerPct: 3.25, grossLimit: 21000 },
  pt: { enabled: false, amount: 0, grossThreshold: 0, state: '' },
  lwf: { enabled: false, employee: 0, employer: 0, state: '' },
}

export const STATUTORY_OPTION_KEY = 'payroll:statutory'

const num = (v: any, d: number): number => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : d
}
const bool = (v: any, d: boolean): boolean => (typeof v === 'boolean' ? v : d)
const str = (v: any, d: string): string => (typeof v === 'string' ? v : d)

/** Merge a parsed (possibly partial/garbage) JSON object onto the defaults —
 *  unknown fields ignored, wrong-typed fields fall back, never throws. */
export function normalizeStatutory(raw: any): StatutoryConfig {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_STATUTORY)
  return {
    pf: {
      enabled: bool(raw.pf?.enabled, DEFAULT_STATUTORY.pf.enabled),
      employeePct: num(raw.pf?.employeePct, DEFAULT_STATUTORY.pf.employeePct),
      employerPct: num(raw.pf?.employerPct, DEFAULT_STATUTORY.pf.employerPct),
      epsPct: num(raw.pf?.epsPct, DEFAULT_STATUTORY.pf.epsPct),
      wageCeiling: num(raw.pf?.wageCeiling, DEFAULT_STATUTORY.pf.wageCeiling),
    },
    esi: {
      enabled: bool(raw.esi?.enabled, DEFAULT_STATUTORY.esi.enabled),
      employeePct: num(raw.esi?.employeePct, DEFAULT_STATUTORY.esi.employeePct),
      employerPct: num(raw.esi?.employerPct, DEFAULT_STATUTORY.esi.employerPct),
      grossLimit: num(raw.esi?.grossLimit, DEFAULT_STATUTORY.esi.grossLimit),
    },
    pt: {
      enabled: bool(raw.pt?.enabled, DEFAULT_STATUTORY.pt.enabled),
      amount: num(raw.pt?.amount, DEFAULT_STATUTORY.pt.amount),
      grossThreshold: num(raw.pt?.grossThreshold, DEFAULT_STATUTORY.pt.grossThreshold),
      state: str(raw.pt?.state, DEFAULT_STATUTORY.pt.state),
    },
    lwf: {
      enabled: bool(raw.lwf?.enabled, DEFAULT_STATUTORY.lwf.enabled),
      employee: num(raw.lwf?.employee, DEFAULT_STATUTORY.lwf.employee),
      employer: num(raw.lwf?.employer, DEFAULT_STATUTORY.lwf.employer),
      state: str(raw.lwf?.state, DEFAULT_STATUTORY.lwf.state),
    },
  }
}

/** Resolve the live config: AppOption JSON → normalize → defaults on any
 *  failure. Returns `{ config, source }` — source tells the caller (and the
 *  plan text) whether the row parsed, was missing, or fell back. */
export async function resolveStatutoryConfig(): Promise<{ config: StatutoryConfig; source: 'option' | 'default' }> {
  const row = await db.appOption.findUnique({ where: { key: STATUTORY_OPTION_KEY } }).catch(() => null)
  if (!row?.value) return { config: structuredClone(DEFAULT_STATUTORY), source: 'default' }
  try {
    return { config: normalizeStatutory(JSON.parse(row.value)), source: 'option' }
  } catch {
    return { config: structuredClone(DEFAULT_STATUTORY), source: 'default' }
  }
}

// ── the per-line computation (PURE — pinned by tests) ──

export interface StatutoryLine {
  pf: number
  pfEmployer: number
  esi: number
  esiEmployer: number
  pt: number
  lwf: number
  deductions: number // pf + esi + pt + lwf (employee share)
  capped: boolean // true when the employee-side total was clipped to earned
}

const R = Math.round // pct heads round to the rupee (pinned)

/** Compute one line's statutory amounts from its earned gross.
 *  - PF wage = min(earned, ceiling) (0 ceiling = uncapped)
 *  - ESI applies only when earned ≤ grossLimit (0 = no limit)
 *  - PT/LWF are flat config amounts gated on enabled + threshold
 *  - employee-side total CAPPED at earned, deduct order pf→esi→pt→lwf */
export function computeStatutory(earned: number, cfg: StatutoryConfig): StatutoryLine {
  const out: StatutoryLine = { pf: 0, pfEmployer: 0, esi: 0, esiEmployer: 0, pt: 0, lwf: 0, deductions: 0, capped: false }
  if (!(earned > 0)) return out

  let remaining = earned
  const take = (want: number): number => {
    const t = Math.min(want, remaining)
    remaining -= t
    return t
  }

  let wanted = 0 // Σ what the heads would have taken uncapped
  if (cfg.pf.enabled) {
    const wage = cfg.pf.wageCeiling > 0 ? Math.min(earned, cfg.pf.wageCeiling) : earned
    const w = R((wage * cfg.pf.employeePct) / 100)
    wanted += w
    out.pf = take(w)
    out.pfEmployer = R((wage * cfg.pf.employerPct) / 100)
  }
  const esiCovered = cfg.esi.enabled && (cfg.esi.grossLimit <= 0 || earned <= cfg.esi.grossLimit)
  if (esiCovered) {
    const w = R((earned * cfg.esi.employeePct) / 100)
    wanted += w
    out.esi = take(w)
    out.esiEmployer = R((earned * cfg.esi.employerPct) / 100)
  }
  if (cfg.pt.enabled && earned >= cfg.pt.grossThreshold) {
    const w = R(cfg.pt.amount)
    wanted += w
    out.pt = take(w)
  }
  if (cfg.lwf.enabled && earned > 0) {
    const w = R(cfg.lwf.employee)
    wanted += w
    out.lwf = take(w)
  }

  out.deductions = out.pf + out.esi + out.pt + out.lwf
  out.capped = wanted > earned // at least one head was clipped to fit the wage
  return out
}

// ── the head meta (register + journals + parties share ONE source) ──

export interface StatutoryHead {
  key: 'pf' | 'esi' | 'pt' | 'lwf'
  label: string // 'PF' | 'ESI' | 'PT' | 'LWF'
  fullName: string
  payableAccount: string // the Cr account on the J2 journal
  partyCode: string // the authority Party code (find-or-create)
  partyName: string
}

export const STATUTORY_HEADS: StatutoryHead[] = [
  { key: 'pf', label: 'PF', fullName: 'Provident Fund', payableAccount: 'PF Payable', partyCode: 'EPFO', partyName: 'EPFO (Provident Fund)' },
  { key: 'esi', label: 'ESI', fullName: 'Employee State Insurance', payableAccount: 'ESI Payable', partyCode: 'ESIC', partyName: 'ESIC (State Insurance)' },
  { key: 'pt', label: 'PT', fullName: 'Professional Tax', payableAccount: 'PT Payable', partyCode: 'PT-BOARD', partyName: 'Professional Tax Authority' },
  { key: 'lwf', label: 'LWF', fullName: 'Labour Welfare Fund', payableAccount: 'LWF Payable', partyCode: 'LWF-BOARD', partyName: 'Labour Welfare Fund Board' },
]

/** Find-or-create the four authority parties. Idempotent — the
 *  ensureEmployeeParty pattern (supplier-type: we remit to them). Never
 *  clobbers: an existing party of another type under the code is returned
 *  as-is with its real type (the ledger still tracks it — honest). */
export async function ensureStatutoryParties(): Promise<Map<string, { id: string; code: string; name: string }>> {
  const out = new Map<string, { id: string; code: string; name: string }>()
  for (const h of STATUTORY_HEADS) {
    let p = await db.party.findUnique({ where: { code: h.partyCode } })
    if (!p) {
      p = await db.party.create({ data: { code: h.partyCode, name: h.partyName, partyType: 'supplier' } }).catch(async () => {
        // a racing create won the unique — take theirs
        return (await db.party.findUniqueOrThrow({ where: { code: h.partyCode } }))
      })
    }
    out.set(h.key, { id: p.id, code: p.code, name: p.name })
  }
  return out
}

/** Default JSON for seeding / display (stable key order). */
export function defaultStatutoryJson(): string {
  return JSON.stringify(DEFAULT_STATUTORY)
}

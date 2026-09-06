/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== SPEC-M49 L-04 — OVERTIME (ATTENDANCE DEPTH) ==============
// Two jobs, the M48 statutory.ts doctrine:
//   1. CONFIG — one AppOption row `attendance:ot` (group 'payroll') holds
//      { otMultiplier, standardHours } as JSON. Resolves with SAFE DEFAULTS
//      when the row is absent or unparseable — never throws (a bad edit must
//      not kill payroll). Defaults: multiplier 2× (the Factories Act §59
//      "twice the ordinary rate" convention), standard 8h. standardHours is
//      the FALLBACK standard for attendance rows with no linked shift — a
//      linked shift's own hours are that day's standard (a 12h shift means
//      12h is the normal day, and the hourly rate is dailyWage ÷ 12).
//   2. COMPUTE — pure per-day OT: otHours = max(0, hours − standard);
//      otPay = otHours × (dailyWage ÷ standard) × otMultiplier. OT accrues
//      ONLY on 'present' days (the caller filters); no legal cap is encoded —
//      the plan text carries the totals for human review.
// The applied config is FROZEN onto PayrollRun.ot at plan time (the M46
// freeze doctrine: a later rate edit never moves a drafted run); the frozen
// per-line results live on PayrollLine.otHours/otPay.
import { db } from '@/lib/db'

// ── the config shape (frozen verbatim onto PayrollRun.ot) ──

export interface OtConfig {
  otMultiplier: number // pay multiple of the hourly rate (2 = twice)
  standardHours: number // fallback per-day standard when no shift is linked
}

/** Safe defaults — the Factories Act convention, ordinary 8h day. */
export const DEFAULT_OT: OtConfig = { otMultiplier: 2, standardHours: 8 }

export const OT_OPTION_KEY = 'attendance:ot'

const num = (v: any, d: number): number => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : d
}

/** Merge a parsed (possibly partial/garbage) JSON object onto the defaults —
 *  unknown fields ignored, wrong-typed fields fall back, never throws.
 *  standardHours ≤ 0 falls back to 8 (div-by-zero impossible by construction). */
export function normalizeOt(raw: any): OtConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_OT }
  const std = num(raw.standardHours, DEFAULT_OT.standardHours)
  return {
    otMultiplier: num(raw.otMultiplier, DEFAULT_OT.otMultiplier),
    standardHours: std > 0 ? std : DEFAULT_OT.standardHours,
  }
}

/** Resolve the live config: AppOption JSON → normalize → defaults on any
 *  failure. Returns `{ config, source }` — source tells the caller (and the
 *  plan text) whether the row parsed, was missing, or fell back. */
export async function resolveOtConfig(): Promise<{ config: OtConfig; source: 'option' | 'default' }> {
  const row = await db.appOption.findUnique({ where: { key: OT_OPTION_KEY } }).catch(() => null)
  if (!row?.value) return { config: { ...DEFAULT_OT }, source: 'default' }
  try {
    return { config: normalizeOt(JSON.parse(row.value)), source: 'option' }
  } catch {
    return { config: { ...DEFAULT_OT }, source: 'default' }
  }
}

// ── the per-day computation (PURE — pinned by tests) ──

export interface OtDay {
  otHours: number // hours beyond the day's standard, 2dp
  otPay: number // the UNROUNDED day pay (the line rounds the Σ once)
  standard: number // the standard actually used (audit/plan text)
}

const R2 = (n: number) => Math.round(n * 100) / 100

/** One present day's overtime. hours/standard/dailyWage as given; a
 *  non-positive standard or non-positive wage returns zeros (honest no-op);
 *  hours at/below the standard returns zeros (a normal day). */
export function computeOtDay(hours: number, standard: number, dailyWage: number, otMultiplier: number): OtDay {
  if (!(hours > 0) || !(dailyWage > 0)) return { otHours: 0, otPay: 0, standard: standard > 0 ? standard : DEFAULT_OT.standardHours }
  const std = standard > 0 ? standard : DEFAULT_OT.standardHours
  const otHours = R2(Math.max(0, hours - std))
  if (otHours <= 0) return { otHours: 0, otPay: 0, standard: std }
  return { otHours, otPay: otHours * (dailyWage / std) * otMultiplier, standard: std }
}

/** Default JSON for seeding / display (stable key order). */
export function defaultOtJson(): string {
  return JSON.stringify(DEFAULT_OT)
}

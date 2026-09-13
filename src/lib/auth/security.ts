/**
 * SPEC-M60 — the auth security core (Batch 2, part 1).
 *
 * FR-A6 lockout: after LOCKOUT.attempts failed logins on one email within
 * LOCKOUT.windowMinutes, the email is locked for LOCKOUT.lockMinutes
 * (honored at login BEFORE credential verification; attempts while locked
 * record outcome 'locked' — they never extend the fixed window). The
 * ledger is keyed on the email STRING: unknown emails lock identically
 * (anti-enumeration parity — the login failure message never differs).
 *
 * The thresholds are NAMED CONSTANTS here; the security.* flag-registry
 * surface rides Batch 3's controls console (SPEC-M60 §1, deferred named).
 *
 * FR-A7 audit: recordLoginAudit is the single writer every auth door
 * calls (login success/fail/locked, logout, password set/clear, lockout
 * clear, sessions cleared) — the /admin/login-audit register is the reader.
 */
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export const LOCKOUT = {
  attempts: 5,
  windowMinutes: 15,
  lockMinutes: 30,
} as const

/** The horizon for reading the fail ledger: a lock can live at most
 *  lockMinutes past the newest fail of a burst, and the burst itself can
 *  span windowMinutes — anything older can never matter to "locked NOW". */
export const LOCKOUT_HORIZON_MS =
  (LOCKOUT.lockMinutes + LOCKOUT.windowMinutes) * 60 * 1000

export type AttemptLike = { outcome: string; at: Date }

export type LockoutAssessment = {
  locked: boolean
  until: Date | null
  remainingMs: number
}

/**
 * Pure lockout arithmetic (SPEC-M60 §2) — input: the recent FAIL rows for
 * one email (callers pass the horizon-filtered set), output: the lock state.
 *
 * Rule: if >= LOCKOUT.attempts fails fall within LOCKOUT.windowMinutes of
 * the NEWEST fail, the email is locked until newest + LOCKOUT.lockMinutes.
 * This holds the lock past the window slide (5 fails at T are still locked
 * at T+20 even though the sliding window [T+5, T+20] no longer contains
 * them — the regression case) and self-heals at expiry: a new fail after
 * expiry starts a fresh burst because the old fails fall outside the NEW
 * fail's window.
 */
export function assessLockout(attempts: AttemptLike[], now: Date): LockoutAssessment {
  const fails = attempts.filter((a) => a.outcome === 'fail').sort((a, b) => b.at.getTime() - a.at.getTime())
  if (fails.length < LOCKOUT.attempts) return { locked: false, until: null, remainingMs: 0 }
  const newest = fails[0].at.getTime()
  const inWindow = fails.filter((f) => newest - f.at.getTime() <= LOCKOUT.windowMinutes * 60 * 1000)
  if (inWindow.length < LOCKOUT.attempts) return { locked: false, until: null, remainingMs: 0 }
  const until = new Date(newest + LOCKOUT.lockMinutes * 60 * 1000)
  const remainingMs = until.getTime() - now.getTime()
  return { locked: remainingMs > 0, until, remainingMs }
}

/** The recent fail rows for one email (the assessment input). */
export async function recentFailAttempts(email: string): Promise<AttemptLike[]> {
  const since = new Date(Date.now() - LOCKOUT_HORIZON_MS)
  return db.loginAttempt.findMany({
    where: { email, outcome: 'fail', at: { gte: since } },
    select: { outcome: true, at: true },
  })
}

/** Best-effort client IP (no proxy in dev → 'local'). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'local'
}

export function userAgentOf(req: NextRequest): string {
  return req.headers.get('user-agent') ?? 'unknown'
}

/** FR-A6 — append to the lockout ledger. */
export async function recordAttempt(input: {
  email: string
  userId?: string | null
  ip: string
  userAgent: string
  outcome: 'success' | 'fail' | 'locked'
}): Promise<void> {
  await db.loginAttempt.create({ data: input })
}

/** FR-A7 — append to the audit trail (the register's only writer family). */
export async function recordLoginAudit(input: {
  userId?: string | null
  email: string
  event:
    | 'login'
    | 'login_fail'
    | 'login_locked'
    | 'logout'
    | 'lockout_clear'
    | 'password_set'
    | 'password_clear'
    | 'sessions_cleared'
  ip: string
  userAgent: string
  detail?: string
}): Promise<void> {
  await db.loginAudit.create({ data: input })
}

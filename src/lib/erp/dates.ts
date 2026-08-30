/**
 * Shared IST date module — OPS-03 (Phase-6B Batch 1, SPEC-M37).
 *
 * THE PROBLEM: the factory runs IST (UTC+5:30) but the server runs UTC, so
 * every "now"-defaulted business date (`new Date()` / `new Date().toISOString()
 * .slice(0,10)`) lands on YESTERDAY's business day between 00:00–05:29 IST —
 * wrong day-book, wrong wage grouping, wrong daily P&L for a night-shift
 * knitting unit.
 *
 * THE CONVENTION (invariant, do not break): business dates are stored at
 * UTC MIDNIGHT of the intended calendar day (`new Date('2026-08-31')`), and
 * every display site round-trips via `.toISOString().slice(0,10)`. This module
 * keeps that convention while computing the *calendar day* in IST.
 *
 * WHY ARITHMETIC INSTEAD OF PROCESS TZ=Asia/Kolkata: flipping the process TZ
 * silently re-bases every `new Date(y, m, d)` local-calendar constructor to
 * IST-midnight (= 18:30Z of the previous day), which off-by-ones ~100
 * UTC-midnight display sites and every stored date written through them. The
 * fixed +5:30 offset achieves the IST day boundary with ZERO storage-convention
 * change. India has no DST, so the offset is permanent.
 */

/** IST is UTC+5:30, fixed (no DST in India). */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

/** The instant → IST calendar date string 'YYYY-MM-DD' (no process-TZ dependency). */
export function istDateStr(dt: Date = new Date()): string {
  return new Date(dt.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

/** Today's IST calendar date as 'YYYY-MM-DD'. At 23:30 UTC this already returns
 *  tomorrow (05:00 IST) — pinned by tests/pipeline/ops-batch1.test.ts. */
export function istToday(now: Date = new Date()): string {
  return istDateStr(now)
}

/** UTC-midnight Date of the IST calendar date containing `dt` — the storage
 * convention for "the IST business day of this instant". Behavior-preserving
 * for UTC-midnight inputs (round-trips), IST-correct for `new Date()`. */
export function istDayStart(dt: Date = new Date()): Date {
  return new Date(`${istDateStr(dt)}T00:00:00.000Z`)
}

/** UTC-midnight Date of TODAY's IST day — the drop-in replacement for the
 * `: new Date()` date-column fallbacks (docDate/grnDate/payDate/…). */
export function istTodayDate(now: Date = new Date()): Date {
  return istDayStart(now)
}

/** The UTC INSTANT at which the current IST day began — IST midnight as a
 * real instant (18:30Z of the previous UTC day). For TIMESTAMP columns that
 * hold event times (e.g. GateEntry.gateDateTime), where a "today" window must
 * start at the actual IST-midnight instant — NOT at UTC midnight, which would
 * miss 18:30–00:00Z events of the same IST day. */
export function istDayStartInstant(dt: Date = new Date()): Date {
  return new Date(`${istDateStr(dt)}T00:00:00+05:30`)
}

/** Explicit date string (or Date) → stored Date; blank → today's IST day.
 * The drop-in for `args.X ? new Date(args.X) : new Date()` across posting
 * services: explicit dates keep their exact semantics (INVALID strings stay
 * invalid so per-service validation still fails loudly), omitted dates land
 * on the IST business day instead of the UTC one. */
export function dateOrIstToday(v: string | Date | null | undefined, now: Date = new Date()): Date {
  if (v === undefined || v === null || v === '') return istTodayDate(now)
  const d = v instanceof Date ? v : new Date(v)
  return d // NaN propagates — callers that validate invalid dates keep working
}

/** End of the UTC day containing `dt`, as a Date (23:59:59.999 UTC). The
 * register `to`-filter ceiling for UTC-midnight-stored date columns —
 * replaces server-local `setHours(23,59,59,999)`, which silently changes
 * meaning if the process TZ ever moves. */
export function endOfUtcDay(dt: Date): Date {
  const day = new Date(`${dt.toISOString().slice(0, 10)}T00:00:00.000Z`)
  return new Date(day.getTime() + 24 * 60 * 60 * 1000 - 1)
}

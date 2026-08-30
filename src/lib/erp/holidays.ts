/**
 * SPEC-M28 — the holiday calendar read service (gap-audit §7-H): Tirupur
 * plans around Pongal/Deepavali shutdowns. The GovtHoliday master has
 * existed since M2 with zero planning surfaces reading it — these helpers
 * are that surface (delivery-promise risk + the MIS shutdown strip).
 *
 * SPEC-M31 — the working-day planner arithmetic (the M28 OUT promise):
 * the pure breakdown + addWorkingDays cores (the WF_PlanFinishDateArrival
 * Sunday+holiday-skipping lineage) and their db wrappers. Tirupur units
 * vary on Sundays — `sundayWorking` option everywhere, default Sunday-off.
 *
 * Zero new schema, zero new agent tools except get_working_days (M31);
 * this is an ERP-internal planning read, the rate-memory precedent.
 */
import { db } from '@/lib/db'

export interface UpcomingHoliday {
  date: Date
  name: string
  /** whole days from `from` to the holiday (0 = today) */
  daysUntil: number
}

export interface WorkingDayBreakdown {
  /** inclusive [from, to] days minus Sundays (unless sundayWorking) minus holidays */
  workingDays: number
  /** Sundays excluded from working (0 when sundayWorking) */
  sundays: number
  /** holidays in the window (a holiday ON a Sunday counts here, once) */
  holidays: number
}

const dayMs = 86_400_000
const midnight = (d: Date) => new Date(new Date(d).setHours(0, 0, 0, 0))

/** The shared raw read: GovtHoliday rows in [from, to], ascending. */
async function getHolidaysBetween(from: Date, to: Date) {
  return db.govtHoliday.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
  })
}

/** Holidays in [from, from + days], ascending. Future-only by construction. */
export async function getUpcomingHolidays(
  opts: { from?: Date; days?: number } = {},
): Promise<UpcomingHoliday[]> {
  const from = midnight(opts.from ?? new Date())
  const to = new Date(from.getTime() + (opts.days ?? 30) * dayMs)
  const rows = await getHolidaysBetween(from, to)
  return rows.map((r) => ({
    date: r.date,
    name: r.name,
    daysUntil: Math.round((midnight(r.date).getTime() - from.getTime()) / dayMs),
  }))
}

/**
 * The promise-risk window: holidays inside [from, deliveryDate]. A holiday
 * AFTER delivery does not threaten the promise. Null delivery → empty.
 */
export async function holidaysBeforeDelivery(
  deliveryDate: Date | null | undefined,
  opts: { from?: Date } = {},
): Promise<UpcomingHoliday[]> {
  if (!deliveryDate) return []
  const from = midnight(opts.from ?? new Date())
  const to = midnight(deliveryDate)
  if (to.getTime() < from.getTime()) return [] // past promise — nothing to plan
  const rows = await getHolidaysBetween(from, to)
  return rows.map((r) => ({
    date: r.date,
    name: r.name,
    daysUntil: Math.round((midnight(r.date).getTime() - from.getTime()) / dayMs),
  }))
}

// ---------------------------------------------------------------------------
// SPEC-M31 — the working-day arithmetic (pure cores + db wrappers)
// ---------------------------------------------------------------------------

/**
 * PURE — classify every day in the inclusive [from, to] window. A date in
 * holidayDates is a HOLIDAY (counts once even when it lands on a Sunday);
 * else a Sunday is sunday (unless sundayWorking); else working.
 */
export function workingDayBreakdown(
  from: Date,
  to: Date,
  holidayDates: readonly Date[],
  opts: { sundayWorking?: boolean } = {},
): WorkingDayBreakdown {
  const a = midnight(from)
  const b = midnight(to)
  const holidays = new Set(holidayDates.map((d) => midnight(d).getTime()))
  let workingDays = 0
  let sundays = 0
  let holidayCount = 0
  if (b.getTime() < a.getTime()) return { workingDays, sundays, holidays: holidayCount }
  for (let t = a.getTime(); t <= b.getTime(); t += dayMs) {
    const d = new Date(t)
    if (holidays.has(t)) {
      holidayCount++
    } else if (d.getDay() === 0 && !opts.sundayWorking) {
      sundays++
    } else {
      workingDays++
    }
  }
  return { workingDays, sundays, holidays: holidayCount }
}

/**
 * PURE — the Nth working day AT OR AFTER `from` (inclusive: n=1 on a
 * working day returns that day — "you need N working days, when do you
 * finish?"). Skips Sundays (unless sundayWorking) and every holidayDates
 * entry (a holiday ON a Sunday is skipped once). Returns null when the
 * maxScan guard trips (a pathological all-holiday calendar) — honest, not
 * an infinite loop.
 */
export function addWorkingDays(
  from: Date,
  n: number,
  holidayDates: readonly Date[],
  opts: { sundayWorking?: boolean; maxScan?: number } = {},
): Date | null {
  if (n < 1) return null
  const holidays = new Set(holidayDates.map((d) => midnight(d).getTime()))
  const maxScan = opts.maxScan ?? 400
  let t = midnight(from).getTime()
  let found = 0
  for (let i = 0; i <= maxScan; i++) {
    const d = new Date(t)
    const isHoliday = holidays.has(t)
    const isSunday = d.getDay() === 0 && !opts.sundayWorking
    if (!isHoliday && !isSunday) {
      found++
      if (found === n) return d
    }
    t += dayMs
  }
  return null // guard tripped
}

/**
 * DB wrapper — the delivery-promise runway: the working-day breakdown of
 * [from, deliveryDate]. Past delivery → null (nothing to plan).
 */
export async function workingDaysUntil(
  deliveryDate: Date | null | undefined,
  opts: { from?: Date; sundayWorking?: boolean } = {},
): Promise<WorkingDayBreakdown | null> {
  if (!deliveryDate) return null
  const from = midnight(opts.from ?? new Date())
  const to = midnight(deliveryDate)
  if (to.getTime() < from.getTime()) return null
  const rows = await getHolidaysBetween(from, to)
  return workingDayBreakdown(from, to, rows.map((r) => r.date), opts)
}

/**
 * DB wrapper — WF_PlanFinishDateArrival's lineage: the finish date when
 * leadDays working days run from `from` (today by default), skipping
 * Sundays (unless sundayWorking) and GovtHolidays.
 */
export async function planFinishDate(
  opts: { from?: Date; leadDays: number; sundayWorking?: boolean },
): Promise<Date | null> {
  const from = midnight(opts.from ?? new Date())
  // scan window: leadDays + margin for every skipped class (worst case both)
  const scanDays = opts.leadDays * 3 + 60
  const rows = await getHolidaysBetween(from, new Date(from.getTime() + scanDays * dayMs))
  return addWorkingDays(from, opts.leadDays, rows.map((r) => r.date), {
    sundayWorking: opts.sundayWorking,
    maxScan: scanDays,
  })
}

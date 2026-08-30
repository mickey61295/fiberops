/**
 * SPEC-M28 — the holiday calendar read service (gap-audit §7-H): Tirupur
 * plans around Pongal/Deepavali shutdowns. The GovtHoliday master has
 * existed since M2 with zero planning surfaces reading it — these helpers
 * are that surface (delivery-promise risk + the MIS shutdown strip).
 *
 * Zero new schema, zero new agent tools (the master keeps its list tool;
 * this is an ERP-internal planning read, the rate-memory precedent).
 */
import { db } from '@/lib/db'

export interface UpcomingHoliday {
  date: Date
  name: string
  /** whole days from `from` to the holiday (0 = today) */
  daysUntil: number
}

const dayMs = 86_400_000
const midnight = (d: Date) => new Date(new Date(d).setHours(0, 0, 0, 0))

/** Holidays in [from, from + days], ascending. Future-only by construction. */
export async function getUpcomingHolidays(
  opts: { from?: Date; days?: number } = {},
): Promise<UpcomingHoliday[]> {
  const from = midnight(opts.from ?? new Date())
  const to = new Date(from.getTime() + (opts.days ?? 30) * dayMs)
  const rows = await db.govtHoliday.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
  })
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
  const rows = await db.govtHoliday.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
  })
  return rows.map((r) => ({
    date: r.date,
    name: r.name,
    daysUntil: Math.round((midnight(r.date).getTime() - from.getTime()) / dayMs),
  }))
}

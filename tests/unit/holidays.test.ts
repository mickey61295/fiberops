/**
 * SPEC-M28 — the holiday calendar read service: window math (future-only,
 * sorted, daysUntil), the delivery-promise risk filter (a holiday AFTER
 * delivery never threatens the promise), the empty cases, and both page
 * source pins (the M22 readFileSync precedent).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { getUpcomingHolidays, holidaysBeforeDelivery } from '@/lib/erp/holidays'

const TS = Date.now()
const dayMs = 86_400_000
const at = (offsetDays: number) => new Date(new Date(Date.now() + offsetDays * dayMs).setHours(0, 0, 0, 0))

const FIXTURES = [
  { date: at(6), name: `SM28 Pongal Mock ${TS}` },
  { date: at(20), name: `SM28 Deepavali Mock ${TS}` },
  { date: at(61), name: `SM28 Far Future ${TS}` }, // outside the 45d window
]

beforeAll(async () => {
  await db.govtHoliday.createMany({ data: FIXTURES })
})
afterAll(async () => {
  await db.govtHoliday.deleteMany({ where: { name: { contains: `SM28 ` } } })
})

describe('SPEC-M28 §2 — getUpcomingHolidays', () => {
  it('future-only, sorted asc, daysUntil math, and the days-window honored', async () => {
    const rows = await getUpcomingHolidays({ days: 45 })
    const mine = rows.filter((r) => r.name.includes('SM28 '))
    expect(mine.map((r) => r.name)).toEqual([FIXTURES[0].name, FIXTURES[1].name]) // asc, 61d excluded
    expect(mine[0].daysUntil).toBe(6)
    expect(mine[1].daysUntil).toBe(20)
  })

  it('the empty case: a window with no holidays returns []', async () => {
    // a 1-day window starting 40 days out contains none of the fixtures
    const rows = await getUpcomingHolidays({ from: at(40), days: 1 })
    expect(rows.filter((r) => r.name.includes('SM28 '))).toEqual([])
  })
})

describe('SPEC-M28 §2 — holidaysBeforeDelivery (the promise-risk window)', () => {
  it('only holidays inside [today, delivery] threaten the promise', async () => {
    // delivery 10d out: only the 6d holiday is a risk
    const risks = await holidaysBeforeDelivery(at(10))
    const mine = risks.filter((r) => r.name.includes('SM28 '))
    expect(mine.map((r) => r.name)).toEqual([FIXTURES[0].name])
    expect(mine[0].daysUntil).toBe(6)
  })

  it('a holiday AFTER delivery is excluded; null/past delivery = empty', async () => {
    // delivery 3d out: nothing (the 6d holiday is after it)
    const none = await holidaysBeforeDelivery(at(3))
    expect(none.filter((r) => r.name.includes('SM28 '))).toEqual([])
    expect(await holidaysBeforeDelivery(null)).toEqual([])
    expect(await holidaysBeforeDelivery(undefined)).toEqual([])
    expect(await holidaysBeforeDelivery(at(-5))).toEqual([]) // past promise
  })

  it('same-day holiday IS in-window (midnight normalization)', async () => {
    await db.govtHoliday.create({ data: { date: at(0), name: `SM28 Today ${TS}` } })
    const risks = await holidaysBeforeDelivery(at(0))
    expect(risks.some((r) => r.name === `SM28 Today ${TS}`)).toBe(true)
  })
})

describe('SPEC-M28 §2 — the surfaces (source pins)', () => {
  const hub = readFileSync(join(__dirname, '../../src/app/(erp)/orders/[id]/page.tsx'), 'utf8')
  const mis = readFileSync(join(__dirname, '../../src/app/(erp)/reports/mis/page.tsx'), 'utf8')

  it('the Order Hub carries the shutdown warning strip (open orders only)', () => {
    expect(hub).toContain('holidaysBeforeDelivery')
    expect(hub).toContain('holiday-warning')
    expect(hub).toContain("['open', 'in_progress'].includes(order.status)")
    expect(hub).toContain('Shutdown before delivery')
  })

  it('the MIS Dashboard carries the upcoming-shutdowns card', () => {
    expect(mis).toContain('getUpcomingHolidays')
    expect(mis).toContain('holiday-strip')
    expect(mis).toContain('Upcoming shutdowns')
    expect(mis).toContain('/masters/govt-holiday') // the calendar deep-link
  })
})

// ===========================================================================
// SPEC-M31 — the working-day planner arithmetic (pure cores + wrappers + tool)
// ===========================================================================
import {
  workingDayBreakdown,
  addWorkingDays,
  workingDaysUntil,
  planFinishDate,
} from '@/lib/erp/holidays'
import { allTools } from '@/lib/agent/tools'

describe('SPEC-M31 §2 — workingDayBreakdown (PURE, injected holidays)', () => {
  // A known anchor: 2026-09-07 is a Monday (verified: 2026-09-06 is Sunday)
  const mon = new Date('2026-09-07T00:00:00')
  const tue = new Date('2026-09-08T00:00:00')
  const wed = new Date('2026-09-09T00:00:00')
  const thu = new Date('2026-09-10T00:00:00')
  const fri = new Date('2026-09-11T00:00:00')
  const sat = new Date('2026-09-12T00:00:00')
  const sun = new Date('2026-09-13T00:00:00')

  it('Mon–Sun window: 6 working + 1 Sunday (Saturday works in Tirupur)', () => {
    const b = workingDayBreakdown(mon, sun, [])
    expect(b).toEqual({ workingDays: 6, sundays: 1, holidays: 0 })
  })

  it('a weekday holiday drops a working day', () => {
    const b = workingDayBreakdown(mon, sun, [wed])
    expect(b).toEqual({ workingDays: 5, sundays: 1, holidays: 1 })
  })

  it('sundayWorking flips the Sunday to working', () => {
    const b = workingDayBreakdown(mon, sun, [], { sundayWorking: true })
    expect(b).toEqual({ workingDays: 7, sundays: 0, holidays: 0 })
  })

  it('a holiday ON a Sunday counts ONCE (as a holiday, never both)', () => {
    const b = workingDayBreakdown(mon, sun, [sun])
    expect(b).toEqual({ workingDays: 6, sundays: 0, holidays: 1 })
  })

  it('inclusive both ends: a single working day counts itself', () => {
    expect(workingDayBreakdown(tue, tue, [])).toEqual({ workingDays: 1, sundays: 0, holidays: 0 })
    expect(workingDayBreakdown(sun, sun, [])).toEqual({ workingDays: 0, sundays: 1, holidays: 0 })
  })

  it('a past window (to < from) is empty, not negative', () => {
    expect(workingDayBreakdown(sat, mon, [])).toEqual({ workingDays: 0, sundays: 0, holidays: 0 })
  })
})

describe('SPEC-M31 §2 — addWorkingDays (PURE)', () => {
  const mon = new Date('2026-09-07T00:00:00') // Monday
  const tue = new Date('2026-09-08T00:00:00')
  const wed = new Date('2026-09-09T00:00:00')
  const sun = new Date('2026-09-13T00:00:00') // the Sunday after

  it('n=1 identity on a working day — "when do you finish if you need 1 day?"', () => {
    expect(addWorkingDays(mon, 1, [])?.toISOString().slice(0, 10)).toBe('2026-09-07')
  })

  it('skips a Sunday: 7 working days from Monday lands on the NEXT Monday (Sat works)', () => {
    expect(addWorkingDays(mon, 7, [])?.toISOString().slice(0, 10)).toBe('2026-09-14')
    // 6 working days = Mon..Sat (the 6-day Tirupur week — Saturday works)
    expect(addWorkingDays(mon, 6, [])?.toISOString().slice(0, 10)).toBe('2026-09-12')
  })

  it('skips a holiday: Tuesday+2 with Wednesday a holiday lands on Thursday', () => {
    expect(addWorkingDays(tue, 2, [wed])?.toISOString().slice(0, 10)).toBe('2026-09-10')
  })

  it('sundayWorking counts the Sunday: 7 days from Monday reaches Sunday', () => {
    expect(addWorkingDays(mon, 7, [], { sundayWorking: true })?.toISOString().slice(0, 10)).toBe('2026-09-13')
    // without the flag, 7 working days skips Sunday → next Monday
    expect(addWorkingDays(mon, 7, [])?.toISOString().slice(0, 10)).toBe('2026-09-14')
  })

  it('a holiday ON a Sunday skips once (not twice): Mon+7 lands the same day either way', () => {
    // Sunday as a plain Sunday, or as a HOLIDAY — the skip is identical
    const asSunday = addWorkingDays(mon, 7, [])
    const asHoliday = addWorkingDays(mon, 7, [sun])
    expect(asHoliday?.toISOString().slice(0, 10)).toBe('2026-09-14')
    expect(asHoliday?.toISOString().slice(0, 10)).toBe(asSunday?.toISOString().slice(0, 10))
  })

  it('n < 1 → null; the maxScan guard trips honestly on an all-holiday calendar', () => {
    expect(addWorkingDays(mon, 0, [])).toBeNull()
    // every day of a 30-day span is a holiday → 5 working days can never accrue
    const allHolidays = Array.from({ length: 30 }, (_, i) => new Date(2026, 8, 7 + i))
    expect(addWorkingDays(mon, 5, allHolidays, { maxScan: 20 })).toBeNull()
  })
})

describe('SPEC-M31 §2 — the db wrappers (fixtures from the M28 block)', () => {
  it('workingDaysUntil counts the fixture holiday + Sundays in the window', async () => {
    // fixture: a holiday exactly 6 days out (see FIXTURES above)
    const b = await workingDaysUntil(at(10)) // [today, today+10] — 11 days inclusive
    expect(b).not.toBeNull()
    const totalDays = 11
    expect(b!.workingDays + b!.sundays + b!.holidays).toBe(totalDays)
    expect(b!.holidays).toBeGreaterThanOrEqual(1) // the 6d-out fixture
  })

  it('null/past delivery → null (nothing to plan)', async () => {
    expect(await workingDaysUntil(null)).toBeNull()
    expect(await workingDaysUntil(undefined)).toBeNull()
    expect(await workingDaysUntil(at(-5))).toBeNull()
  })

  it('planFinishDate: 1 working day from a clean Monday is that Monday', async () => {
    // date-roll-proof rewrite (qol1-reconcile): the original pinned the FIXED
    // Monday 2026-09-07 — which the relative fixture at(6) landed on exactly
    // when today rolled to 2026-09-01, turning the suite red on the parallel
    // line's close-out+1. Pick a Monday ~400d out (outside every fixture
    // window) and skip any Monday that is itself a holiday in the live table.
    let probe = new Date(new Date(Date.now() + 400 * dayMs).setHours(0, 0, 0, 0))
    while (probe.getDay() !== 1) probe = new Date(probe.getTime() + dayMs)
    for (let i = 0; i < 8; i++) {
      const dayEnd = new Date(probe.getTime() + 86_399_999)
      const hit = await db.govtHoliday.findFirst({ where: { date: { gte: probe, lte: dayEnd } } })
      if (!hit) break
      probe = new Date(probe.getTime() + 7 * dayMs)
    }
    expect(probe.getDay()).toBe(1)
    const d = await planFinishDate({ from: probe, leadDays: 1 })
    expect(d?.toISOString().slice(0, 10)).toBe(probe.toISOString().slice(0, 10))
  })

  it('planFinishDate crosses the fixture holiday: 7 working days never lands on it', async () => {
    const d = await planFinishDate({ leadDays: 7 })
    expect(d).not.toBeNull()
    // the finish date is never the fixture holiday date
    expect(d!.toISOString().slice(0, 10)).not.toBe(at(6).toISOString().slice(0, 10))
    expect(d!.getDay()).not.toBe(0) // never a Sunday (default sundayWorking=false)
  })
})

describe('SPEC-M31 §2 — the agent tool (get_working_days)', () => {
  it('is registered as a read tool in the masters domain (registry 229 → 230)', () => {
    const t = allTools.find((x: any) => x.name === 'get_working_days')
    expect(t).toBeDefined()
    expect((t as any).isWrite).toBe(false)
    expect((t as any).domain).toBe('masters')
    expect(allTools.length).toBe(249) // M43 PRG: +set_order_deliveries +correct_program_spec +propose_program_requirements // M42 INV: +create_stock_take +record_stock_counts +advance_stock_take (M39 JWL: +bill_jobwork +list_jobworker_statement)
  })

  it('window mode returns the breakdown against live fixtures', async () => {
    const t = allTools.find((x: any) => x.name === 'get_working_days') as any
    const to = new Date(Date.now() + 10 * dayMs).toISOString().slice(0, 10)
    const out = await t.execute({ to })
    expect(out.text).toContain('working days')
    expect(out.json.workingDays + out.json.sundays + out.json.holidays).toBe(11)
  })

  it('leadDays mode returns a finish date that is never a Sunday', async () => {
    const t = allTools.find((x: any) => x.name === 'get_working_days') as any
    const out = await t.execute({ leadDays: 7 })
    expect(out.json.finishDate).toBeTruthy()
    expect(new Date(out.json.finishDate).getDay()).not.toBe(0)
  })

  it('missing args → the honest usage message', async () => {
    const t = allTools.find((x: any) => x.name === 'get_working_days') as any
    const out = await t.execute({})
    expect(out.json.error).toBe('missing-args')
  })
})

describe('SPEC-M31 §2 — the Order Hub runway (source pins)', () => {
  it('the Delivery tile carries the working-days runway + the amber strip line', () => {
    const hub = readFileSync(join(__dirname, '../../src/app/(erp)/orders/[id]/page.tsx'), 'utf8')
    expect(hub).toContain('workingDaysUntil')
    expect(hub).toContain('data-testid="working-days"')
    expect(hub).toContain('working days')
    expect(hub).toContain('Only {runway.workingDays} of {totalRunwayDays} days')
  })
})

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

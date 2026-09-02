/**
 * SPEC-M35 — holidays digest adoption: the daily digest gains the
 * shutdowns section (the M28 getUpcomingHolidays read, 14-day window),
 * silent when empty; the get_daily_digest agent tool (the restored
 * Phase-4.5 promise) carries the same shape.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { buildDigest, DIGEST_SHUTDOWN_WINDOW_DAYS } from '../../src/lib/erp/notifications/digest'
import { allTools } from '@/lib/agent/tools'

const TS = Date.now()
const dayMs = 86400000
const at = (offsetDays: number) => new Date(new Date(Date.now() + offsetDays * dayMs).setHours(0, 0, 0, 0))

let holidayIds: string[] = []

describe('SPEC-M35 — the digest shutdowns section', () => {
  beforeAll(async () => {
    await db.govtHoliday.deleteMany({ where: { name: { startsWith: 'M35 ' } } })
  })
  afterAll(async () => {
    await db.govtHoliday.deleteMany({ where: { name: { startsWith: 'M35 ' } } })
    await db.$disconnect()
  })

  it('a holiday 5d out appears with days-until + the planning line', async () => {
    const h = await db.govtHoliday.create({ data: { date: at(5), name: 'M35 Pongal' } })
    holidayIds.push(h.id)
    const digest = await buildDigest()
    const row = digest.sections.shutdowns.rows.find((r) => r.name === 'M35 Pongal')
    expect(row).toBeDefined()
    expect(row!.daysUntil).toBe(5)
    expect(row!.date).toBe(at(5).toISOString().slice(0, 10))
    expect(digest.sections.shutdowns.windowDays).toBe(DIGEST_SHUTDOWN_WINDOW_DAYS)
    expect(DIGEST_SHUTDOWN_WINDOW_DAYS).toBe(14)
    // the text block carries it
    expect(digest.text).toContain('Upcoming shutdowns (14d)')
    expect(digest.text).toContain('M35 Pongal')
    expect(digest.text).toContain('5d away')
    await db.govtHoliday.delete({ where: { id: h.id } })
  })

  it('a holiday 30d out is EXCLUDED (the 14-day briefing window)', async () => {
    const h = await db.govtHoliday.create({ data: { date: at(30), name: 'M35 Far Festival' } })
    const digest = await buildDigest()
    expect(digest.sections.shutdowns.rows.find((r) => r.name === 'M35 Far Festival')).toBeUndefined()
    await db.govtHoliday.delete({ where: { id: h.id } })
  })

  it('no holidays in window → empty section AND no text block (M28 discipline)', async () => {
    const digest = await buildDigest()
    const near = digest.sections.shutdowns.rows.filter((r) => r.name.startsWith('M35 '))
    expect(near).toEqual([])
    // even if OTHER holidays exist, the M35 fixture is gone — the block
    // presence is asserted per-fixture; here the fixture is absent
    if (digest.sections.shutdowns.rows.length === 0) {
      expect(digest.text).not.toContain('Upcoming shutdowns')
    }
  })

  it('the shutdowns block renders AFTER the gate block (briefing order)', async () => {
    const h = await db.govtHoliday.create({ data: { date: at(2), name: 'M35 Deepavali' } })
    const digest = await buildDigest()
    const gateIdx = digest.text.indexOf('Gate movements today')
    const shutIdx = digest.text.indexOf('Upcoming shutdowns')
    expect(gateIdx).toBeGreaterThan(-1)
    expect(shutIdx).toBeGreaterThan(gateIdx)
    await db.govtHoliday.delete({ where: { id: h.id } })
  })

  it('a same-day holiday speaks with TODAY (the deadline case)', async () => {
    const h = await db.govtHoliday.create({ data: { date: at(0), name: 'M35 Today Strike' } })
    const digest = await buildDigest()
    const row = digest.sections.shutdowns.rows.find((r) => r.name === 'M35 Today Strike')
    expect(row?.daysUntil).toBe(0)
    expect(digest.text).toContain('M35 Today Strike')
    expect(digest.text).toMatch(/M35 Today Strike \(.*TODAY\)/)
    await db.govtHoliday.delete({ where: { id: h.id } })
  })
})

describe('SPEC-M35 — the get_daily_digest tool (the restored Phase-4.5 promise)', () => {
  it('is registered (read, reports domain) — 229 → 230 after M33', async () => {
    const tool = allTools.find((t) => t.name === 'get_daily_digest')
    expect(tool).toBeDefined()
    expect(tool!.domain).toBe('reports')
    expect(tool!.isWrite).toBe(false)
    expect(allTools.length).toBe(250) // M45 L-01: +get_operator_statement // M43 PRG: +set_order_deliveries +correct_program_spec +propose_program_requirements // M42 INV: +create_stock_take +record_stock_counts +advance_stock_take (M39 JWL: +bill_jobwork +list_jobworker_statement)
  })

  it('returns the briefing text + section counts + shutdown rows', async () => {
    const h = await db.govtHoliday.create({ data: { date: at(3), name: 'M35 Tool Holiday' } })
    const tool = allTools.find((t) => t.name === 'get_daily_digest')!
    const res = await tool!.execute({})
    expect(res.text).toContain('FiberOps daily digest')
    const json = res.json as { approvals: number; shutdowns: { name: string }[] }
    expect(typeof json.approvals).toBe('number')
    expect(Array.isArray(json.shutdowns)).toBe(true)
    expect(json.shutdowns.find((s) => s.name === 'M35 Tool Holiday')).toBeDefined()
    await db.govtHoliday.delete({ where: { id: h.id } })
  })
})

describe('SPEC-M35 — surface source pins', () => {
  const read = (p: string) => readFileSync(join(__dirname, '../..', p), 'utf8')

  it('digest.ts carries the shutdowns section + window constant + text block', () => {
    const src = read('src/lib/erp/notifications/digest.ts')
    expect(src).toContain('getUpcomingHolidays')
    expect(src).toContain('DIGEST_SHUTDOWN_WINDOW_DAYS = 14')
    expect(src).toContain('Upcoming shutdowns')
    expect(src).toContain('shutdowns: { windowDays: DIGEST_SHUTDOWN_WINDOW_DAYS, rows: shutdownRows }')
  })

  it('the digest page renders the amber shutdowns card, hidden when empty', () => {
    const src = read('src/app/(erp)/notifications/digest/page.tsx')
    expect(src).toContain('data-digest-shutdowns')
    expect(src).toContain('shutdowns.rows.length > 0')
    expect(src).toContain('masters/govt-holiday')
  })

  it('SYSTEM_PROMPT mentions get_daily_digest', () => {
    const src = read('src/lib/agent/prompt.ts')
    expect(src).toContain('get_daily_digest')
  })
})

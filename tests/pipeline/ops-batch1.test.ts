/**
 * OPS Batch 1 (Phase-6B, SPEC-M37) — the ops-trust tier:
 *   OPS-01 nightly backup artifacts + digest ops section
 *   OPS-02 WAL journal mode at boot
 *   OPS-03 IST day boundary (helpers + posting defaults + register ceilings)
 *   OPS-04 commit idempotency (replay, concurrency, failure-release)
 *   OPS-05 StockLedger docKey doc-level uniqueness (ADJ single-row, GT pair,
 *          same-number collision fails loudly, no duplicate rows)
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { runCommit } from '@/lib/erp/audit'
import { planStockAdjustment } from '@/lib/erp/posting/stock-adj'
import { planTransfer } from '@/lib/erp/posting/transfer'
import { docKeyViolation } from '@/lib/erp/posting/ledger'
import {
  istToday, istDateStr, istDayStart, istTodayDate, istDayStartInstant,
  dateOrIstToday, endOfUtcDay, IST_OFFSET_MS,
} from '@/lib/erp/dates'
import { buildDigest } from '@/lib/erp/notifications/digest'

const TS = Date.now()
const GODOWN = `M37-G-${TS}`
const YARN = `M37-Y-${TS}`
const FAB = `M37-F-${TS}`

let godownId = '', yarnId = '', fabId = '', uomId = ''

beforeAll(async () => {
  const uom = await db.uOM.findFirst()
  uomId = uom!.id
  const g = await db.godown.create({ data: { code: GODOWN, name: `M37 Godown ${TS}` } })
  godownId = g.id
  const y = await db.yarn.create({ data: { code: YARN, count: '30s', uomId, rate: 320 } })
  yarnId = y.id
  const f = await db.fabric.create({ data: { code: FAB, construction: 'SJ', uomId, rate: 210 } })
  fabId = f.id
})

afterAll(async () => {
  const docNos = await db.stockLedger.findMany({
    where: { OR: [{ docNo: { startsWith: 'ADJ-M37' } }, { docNo: { startsWith: 'GT-M37' } }] },
    select: { docNo: true },
  })
  for (const { docNo } of docNos) {
    await db.stockLedger.deleteMany({ where: { docNo } }).catch(() => {})
  }
  await db.currentStock.deleteMany({ where: { OR: [{ itemId: yarnId }, { itemId: fabId }] } }).catch(() => {})
  await db.idempotencyKey.deleteMany({ where: { key: { startsWith: 'm37-test-' } } }).catch(() => {})
  await db.auditLog.deleteMany({ where: { docNo: { startsWith: 'ADJ-M37' } } }).catch(() => {})
  await db.yarn.deleteMany({ where: { id: yarnId } }).catch(() => {})
  await db.fabric.deleteMany({ where: { id: fabId } }).catch(() => {})
  await db.godown.deleteMany({ where: { id: godownId } }).catch(() => {})
  await db.$disconnect()
})

// ───────────────────────── OPS-02 — WAL ─────────────────────────

describe('OPS-02 — WAL journal mode', () => {
  it('the booted database runs under journal_mode=wal', async () => {
    const mode = await db.$queryRawUnsafe('PRAGMA journal_mode')
    const m = (Array.isArray(mode) ? mode[0] : mode) as { journal_mode?: string }
    expect(m.journal_mode).toBe('wal')
  })

  it("db.ts pins the pragma (source contract — it is the boot-time enforcer)", () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/db.ts'), 'utf8')
    expect(src).toContain('PRAGMA journal_mode=WAL')
  })
})

// ───────────────────────── OPS-03 — IST day boundary ─────────────────────────

describe('OPS-03 — IST date module', () => {
  it('THE PIN: 23:30 UTC is already the next IST day (05:00 IST)', () => {
    // spec acceptance criterion, verbatim
    expect(istToday(new Date('2026-08-31T23:30:00Z'))).toBe('2026-09-01')
  })

  it('the exact boundary: 18:29:59Z is the same day, 18:30:00Z is the next day', () => {
    expect(istToday(new Date('2026-08-31T18:29:59Z'))).toBe('2026-08-31')
    expect(istToday(new Date('2026-08-31T18:30:00Z'))).toBe('2026-09-01')
  })

  it('IST offset is the fixed +5:30 (no DST in India)', () => {
    expect(IST_OFFSET_MS).toBe(5.5 * 3600 * 1000)
    expect(istDateStr(new Date('2026-08-31T18:30:00Z'))).toBe('2026-09-01')
  })

  it('istDayStart keeps the UTC-midnight storage convention (behavior-preserving)', () => {
    // instants whose UTC date == IST date round-trip to the same UTC midnight
    for (const h of [0, 6, 12, 18]) {
      const d = new Date(`2026-08-31T${String(h).padStart(2, '0')}:00:00Z`)
      expect(istDayStart(d).toISOString()).toBe('2026-08-31T00:00:00.000Z')
    }
    // from 18:30Z the IST calendar day rolls over
    expect(istDayStart(new Date('2026-08-31T23:00:00Z')).toISOString()).toBe('2026-09-01T00:00:00.000Z')
    // a 01:30 IST posting (20:00Z) belongs to the NEW IST day
    expect(istDayStart(new Date('2026-08-31T20:00:00Z')).toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('istDayStartInstant is the real IST-midnight instant (timestamp columns)', () => {
    // 2026-09-01 00:00 IST == 2026-08-31 18:30Z — NOT UTC midnight
    expect(istDayStartInstant(new Date('2026-08-31T20:00:00Z')).toISOString()).toBe('2026-08-31T18:30:00.000Z')
    expect(istTodayDate(new Date('2026-08-31T20:00:00Z')).toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('dateOrIstToday: explicit preserved, blank → IST today, invalid stays invalid', () => {
    expect(dateOrIstToday('2026-01-05', new Date('2026-08-31T20:00:00Z')).toISOString())
      .toBe('2026-01-05T00:00:00.000Z')
    expect(dateOrIstToday(undefined, new Date('2026-08-31T20:00:00Z')).toISOString())
      .toBe('2026-09-01T00:00:00.000Z') // 01:30 IST Sep 1 → Sep 1
    expect(dateOrIstToday('', new Date('2026-08-31T20:00:00Z')).toISOString())
      .toBe('2026-09-01T00:00:00.000Z')
    const invalid = dateOrIstToday('not-a-date')
    expect(isNaN(invalid.getTime())).toBe(true) // per-service validation still fires
  })

  it('endOfUtcDay: the register to-filter ceiling in explicit UTC', () => {
    const e = endOfUtcDay(new Date('2026-08-31T05:00:00Z'))
    expect(e.toISOString()).toBe('2026-08-31T23:59:59.999Z')
  })

  it('posting default: a 01:30 IST stock adjustment plans docDate = the IST day', async () => {
    vi.useFakeTimers({ now: new Date('2026-08-31T20:00:00Z'), toFake: ['Date'] })
    try {
      const plan = await planStockAdjustment({
        itemType: 'yarn', itemCode: YARN, godownCode: GODOWN,
        action: 'add', qty: 4, reason: 'M37 IST default', docNo: 'ADJ-M37-ISTDATE',
      })
      expect(plan.ok).toBe(true)
      if (plan.ok) {
        expect((plan.creates?.[0]?.data as any).docDate.toISOString()).toBe('2026-09-01T00:00:00.000Z')
      }
    } finally {
      vi.useRealTimers()
    }
  })
})

// ───────────────────────── OPS-04 — commit idempotency ─────────────────────────

describe('OPS-04 — runCommit idempotency', () => {
  const base = { itemType: 'yarn', itemCode: YARN, godownCode: GODOWN, action: 'add', qty: 5, reason: 'M37 idem' } as const

  it('replay with the same key returns the ORIGINAL result and posts exactly once', async () => {
    const key = `m37-test-replay-${TS}`
    const plan1 = await planStockAdjustment({ ...base, docNo: 'ADJ-M37-IDEM1' })
    if (!plan1.ok) throw new Error(plan1.error)
    const first = await runCommit(plan1, { actorName: 'm37@test', actorSource: 'agent', idempotencyKey: key })
    expect((first as any).docNo).toBe('ADJ-M37-IDEM1')

    // the "double-click": a second call with the SAME key must NOT re-post
    const plan2 = await planStockAdjustment({ ...base, docNo: 'ADJ-M37-IDEM1' })
    if (!plan2.ok) throw new Error(plan2.error)
    const replay = await runCommit(plan2, { actorName: 'm37@test', actorSource: 'agent', idempotencyKey: key })
    expect((replay as any).docNo).toBe('ADJ-M37-IDEM1')
    expect((replay as any).id).toBe((first as any).id) // the SAME row, not a twin

    const rows = await db.stockLedger.findMany({ where: { docNo: 'ADJ-M37-IDEM1' } })
    expect(rows.length).toBe(1) // posted exactly once
    const keyRow = await db.idempotencyKey.findUnique({ where: { key } })
    expect(keyRow?.status).toBe('done')
  })

  it('concurrent same-key commits: exactly one wins, the other fails loudly, one row exists', async () => {
    const key = `m37-test-concurrent-${TS}`
    const mk = () => planStockAdjustment({ ...base, docNo: 'ADJ-M37-RACE' }).then((p) => {
      if (!p.ok) throw new Error(p.error)
      return p
    })
    const [a, b] = await Promise.allSettled([
      runCommit(await mk(), { actorName: 'm37@test', actorSource: 'agent', idempotencyKey: key }),
      runCommit(await mk(), { actorName: 'm37@test', actorSource: 'agent', idempotencyKey: key }),
    ])
    const winners = [a, b].filter((r) => r.status === 'fulfilled')
    const losers = [a, b].filter((r) => r.status === 'rejected')
    expect(winners.length).toBe(1)
    expect(losers.length).toBe(1)
    const rows = await db.stockLedger.findMany({ where: { docNo: 'ADJ-M37-RACE' } })
    expect(rows.length).toBe(1) // the loser's transaction never landed
  })

  it('a FAILED commit releases the key so a retry can succeed', async () => {
    const key = `m37-test-fail-${TS}`
    // docKey ADJ-M37-FAIL is pre-seeded → the commit violates the unique index
    await db.stockLedger.create({
      data: { txnType: 'stock_adjustment_add', itemType: 'yarn', itemId: yarnId, godownId,
        docNo: 'ADJ-M37-FAIL', docKey: 'ADJ-M37-FAIL', finYear: '26-27', inKgs: 1, rate: 1 },
    })
    const plan = await planStockAdjustment({ ...base, docNo: 'ADJ-M37-FAIL' })
    if (!plan.ok) throw new Error(plan.error)
    await expect(runCommit(plan, { actorName: 'm37@test', actorSource: 'agent', idempotencyKey: key }))
      .rejects.toThrow(/was just taken/)

    const keyRow = await db.idempotencyKey.findUnique({ where: { key } })
    expect(keyRow).toBeNull() // the lock was released — a retry may attempt again
  })
})

// ───────────────────────── OPS-05 — docKey uniqueness ─────────────────────────

describe('OPS-05 — StockLedger doc-level uniqueness', () => {
  it('ADJ commit stamps docKey=docNo on its single row', async () => {
    const plan = await planStockAdjustment({
      itemType: 'yarn', itemCode: YARN, godownCode: GODOWN, action: 'add', qty: 2,
      reason: 'M37 docKey', docNo: 'ADJ-M37-KEY',
    })
    if (!plan.ok) throw new Error(plan.error)
    await plan.commit()
    const rows = await db.stockLedger.findMany({ where: { docNo: 'ADJ-M37-KEY' } })
    expect(rows.length).toBe(1)
    expect(rows[0].docKey).toBe('ADJ-M37-KEY')
  })

  it('GT commit stamps docKey on the OUT leg only (the pair stays legitimate)', async () => {
    const g2 = await db.godown.create({ data: { code: `${GODOWN}-2`, name: `M37 Godown2 ${TS}` } })
    try {
      const plan = await planTransfer({
        itemType: 'fabric', itemCode: FAB, fromGodownCode: GODOWN, toGodownCode: g2.code,
        qty: 3, docNo: 'GT-M37-KEY',
      })
      if (!plan.ok) throw new Error(plan.error)
      await plan.commit()
      const rows = await db.stockLedger.findMany({ where: { docNo: 'GT-M37-KEY' } })
      expect(rows.length).toBe(2)
      const out = rows.find((r) => r.txnType === 'godown_transfer_out')!
      const inn = rows.find((r) => r.txnType === 'godown_transfer_in')!
      expect(out.docKey).toBe('GT-M37-KEY')
      expect(inn.docKey).toBeNull() // in-leg repeats the docNo BY DESIGN
    } finally {
      await db.stockLedger.deleteMany({ where: { docNo: 'GT-M37-KEY' } }).catch(() => {})
      await db.currentStock.deleteMany({ where: { itemId: fabId } }).catch(() => {})
      await db.godown.deleteMany({ where: { id: g2.id } }).catch(() => {})
    }
  })

  it('THE PIN: a second doc minting the SAME number fails loudly and mints no duplicate rows', async () => {
    const first = await planStockAdjustment({
      itemType: 'yarn', itemCode: YARN, godownCode: GODOWN, action: 'add', qty: 1,
      reason: 'M37 collision A', docNo: 'ADJ-M37-COLL',
    })
    if (!first.ok) throw new Error(first.error)
    await first.commit()

    const second = await planStockAdjustment({
      itemType: 'yarn', itemCode: YARN, godownCode: GODOWN, action: 'add', qty: 9,
      reason: 'M37 collision B', docNo: 'ADJ-M37-COLL', // the racing plan's number
    })
    if (!second.ok) throw new Error(second.error)
    await expect(second.commit()).rejects.toThrow(/ADJ-M37-COLL was just taken by another user/)

    const rows = await db.stockLedger.findMany({ where: { docNo: 'ADJ-M37-COLL' } })
    expect(rows.length).toBe(1) // cannot mint two same-numbered rows
    expect(rows[0].inKgs).toBe(1) // the FIRST doc's data, not the second's
  })

  it('docKeyViolation maps only P2002-on-docKey; other errors pass through', () => {
    const p2002: any = { code: 'P2002', meta: { target: ['docKey'] } }
    expect(docKeyViolation(p2002, 'ADJ-0007')?.message).toContain('ADJ-0007 was just taken')
    const otherUnique: any = { code: 'P2002', meta: { target: ['orderNo'] } }
    expect(docKeyViolation(otherUnique, 'ADJ-0007')).toBeNull()
    expect(docKeyViolation(new Error('boom'), 'ADJ-0007')).toBeNull()
  })
})

// ───────────────────────── OPS-01 — backup + digest ops ─────────────────────────

describe('OPS-01 — backup infrastructure + digest ops section', () => {
  it('backup_db.py: VACUUM INTO snapshot + rotation + integrity + verify all present', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/backup_db.py'), 'utf8')
    expect(src).toContain('VACUUM INTO')
    expect(src).toContain('integrity_check')
    expect(src).toContain('restore_verify')
    expect(src).toContain('DAILY_KEEP_DAYS = 7')
    expect(src).toContain('WEEKLY_KEEP_DAYS = 30')
    expect(src).toContain('ops.backup.rsync_target')
  })

  it('recovery_drill.sh: NO destructive push on the data path (the OPS-01 rewrite)', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/recovery_drill.sh'), 'utf8')
    // the executable lines must never force data loss (comments may mention it)
    const executable = src.split('\n').filter((l) => /npx prisma db push/.test(l) && !l.trim().startsWith('#'))
    expect(executable.length).toBeGreaterThan(0)
    for (const line of executable) {
      expect(line).not.toContain('--accept-data-loss')
    }
    expect(src).toContain('integrity_check')
    expect(src).toContain('.restore-verify.db')
  })

  it('backups directory exists with at least one snapshot (this environment)', () => {
    const dir = join(process.cwd(), 'db', 'backups')
    expect(existsSync(dir)).toBe(true)
    const files = readdirSync(dir).filter((f) => /^custom-.*\.db$/.test(f))
    expect(files.length).toBeGreaterThanOrEqual(1)
  })

  it('digest gains the ops & data-growth section', async () => {
    const d = await buildDigest(new Date('2026-08-31T20:00:00Z'))
    expect(d.sections.ops).toBeDefined()
    const row = d.sections.ops.rows[0]
    expect(row).toBeTruthy()
    expect(row.rows.stockLedger).toBeGreaterThanOrEqual(0)
    expect(row.rows.auditLog).toBeGreaterThanOrEqual(0)
    expect(row.rows.agentTurn).toBeGreaterThanOrEqual(0)
    expect(row.backupDir).toContain('backups')
    expect(typeof row.dbSizeMb).toBe('number')
    expect(d.text).toContain('Ops & data growth')
  })

  it('digest header date is the IST calendar day', async () => {
    const d = await buildDigest(new Date('2026-08-31T20:00:00Z')) // 01:30 IST Sep 1
    expect(d.text).toContain('FiberOps daily digest — 2026-09-01')
  })
})

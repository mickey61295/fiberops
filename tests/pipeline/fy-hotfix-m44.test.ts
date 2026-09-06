/**
 * FY hotfix (SPEC-M44 FY-01) — fiscal-year single source:
 *   - fyCodeFor pure derivation matrix (Apr 1 / Mar 31 boundaries, century wrap)
 *   - activeFinYear() === the ACTIVE FinYear row's code (future-proof: stays
 *     true the day the owner activates 27-28 — no literal pinned anywhere)
 *   - fallback: no active row → today's IST-derived code; DB restored in finally
 *   - behavioral: a posting service with finYear omitted commits with the
 *     ACTIVE row's code (both doors inherit — one service, ADR-001)
 *   - source contracts: zero '26-27' literals across the posting layer,
 *     tools.ts, numbering.ts, and the seeder
 */
import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { fyCodeFor, fyCodeToday, activeFinYear } from '@/lib/erp/numbering'
import { planExpense } from '@/lib/erp/posting/expense'
import { runCommit } from '@/lib/erp/audit'
import { istDateStr } from '@/lib/erp/dates'

const TS = Date.now()
const EXP_NO = `M44-EXP-${TS}` // unique — cleanup targets exactly this row
const IDEMPOTENCY_KEY = `m44-fy-behavioral-${TS}`
const ROOT = process.cwd()

const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
// EVERY .ts file in the posting layer — enumerated, never hand-listed
const postingFiles = readdirSync(join(ROOT, 'src/lib/erp/posting'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => `src/lib/erp/posting/${f}`)

afterAll(async () => {
  // leave the DB byte-identical: the behavioral row, its audit trail, the
  // idempotency key, and the FinYear active flag (restored in the fallback
  // test's finally, re-asserted here defensively)
  const exp = await db.expense.findUnique({ where: { expNo: EXP_NO } })
  if (exp) {
    await db.auditLog.deleteMany({ where: { entity: 'expense', entityId: exp.id } })
    await db.expense.delete({ where: { id: exp.id } })
  }
  await db.idempotencyKey.deleteMany({ where: { key: IDEMPOTENCY_KEY } })
  const anyActive = await db.finYear.findFirst({ where: { active: true } })
  expect(anyActive).toBeTruthy() // the fallback test restored it
})

describe('FY-01 fyCodeFor — pure derivation matrix', () => {
  it('maps FY boundaries (Apr 1 starts a new code)', () => {
    expect(fyCodeFor('2026-03-31')).toBe('25-26')
    expect(fyCodeFor('2026-04-01')).toBe('26-27')
    expect(fyCodeFor('2027-03-31')).toBe('26-27')
    expect(fyCodeFor('2027-04-01')).toBe('27-28')
    expect(fyCodeFor('2026-09-02')).toBe('26-27')
    expect(fyCodeFor('2026-01-01')).toBe('25-26')
    expect(fyCodeFor('2026-12-31')).toBe('26-27')
  })

  it('wraps the century (99→00) without falling apart', () => {
    expect(fyCodeFor('2099-03-31')).toBe('98-99')
    expect(fyCodeFor('2099-04-01')).toBe('99-00')
    expect(fyCodeFor('2100-04-01')).toBe('00-01')
  })

  it('garbage input falls back to today (defensive, never hit by istDateStr)', () => {
    expect(fyCodeFor('not-a-date')).toBe(fyCodeToday())
  })

  it('fyCodeToday is self-consistent with istDateStr (no literal pinned — not a 2027 bomb)', () => {
    expect(fyCodeToday()).toBe(fyCodeFor(istDateStr(new Date())))
  })
})

describe('FY-01 activeFinYear — the active row decides', () => {
  it("returns the ACTIVE row's code (works for any code the owner activates)", async () => {
    const row = await db.finYear.findFirst({ where: { active: true } })
    expect(row).toBeTruthy()
    expect(await activeFinYear()).toBe(row!.code)
  })

  it('falls back to today-derived code when no row is active (DB restored)', async () => {
    const rows = await db.finYear.findMany({ where: { active: true } })
    try {
      await db.finYear.updateMany({ where: { active: true }, data: { active: false } })
      expect(await activeFinYear()).toBe(fyCodeToday())
    } finally {
      for (const r of rows) {
        await db.finYear.update({ where: { id: r.id }, data: { active: true } })
      }
    }
  })
})

describe('FY-01 behavioral — a service with finYear omitted stamps the active row code', () => {
  it('planExpense → runCommit → Expense.finYear === active code', async () => {
    const plan = await planExpense({ expNo: EXP_NO, category: 'other', amount: 7, narration: 'M44 FY default' })
    expect(plan.ok).toBe(true)
    const res: any = await runCommit(plan, {
      actorName: 'm44-test',
      actorSource: 'system',
      entity: 'expense',
      idempotencyKey: IDEMPOTENCY_KEY,
    })
    const row = await db.expense.findUnique({ where: { expNo: EXP_NO } })
    expect(row).toBeTruthy()
    const activeRow = await db.finYear.findFirst({ where: { active: true } })
    expect(row!.finYear).toBe(activeRow!.code)
    expect(res.expNo).toBe(EXP_NO)
  })

  it('explicit args.finYear still wins (historical documents)', async () => {
    const plan = await planExpense({ expNo: `${EXP_NO}-H`, category: 'other', amount: 3, finYear: '22-23' })
    expect(plan.ok).toBe(true)
    expect((plan as any).creates[0].data.finYear).toBe('22-23')
    // plan-only — never committed, no residue
  })
})

describe('FY-01 source contracts — zero frozen literals', () => {
  it('the posting layer has no 26-27 literal', () => {
    for (const f of postingFiles) {
      const t = read(f)
      expect(t.includes("'26-27'"), `${f} still hard-codes '26-27'`).toBe(false)
    }
  })

  it('tools.ts / numbering.ts / context.ts / seed.ts have no frozen FY', () => {
    const tools = read('src/lib/agent/tools.ts')
    expect(tools.includes("= '26-27'")).toBe(false)
    expect(tools.includes("defaults to current 26-27")).toBe(false)
    const numbering = read('src/lib/erp/numbering.ts')
    expect(numbering.includes("?? '26-27'")).toBe(false)
    const context = read('src/lib/agent/context.ts')
    expect(context.includes(".catch(() => '26-27')")).toBe(false)
    const seed = read('scripts/seed.ts')
    expect(seed.includes("= '26-27'")).toBe(false)
  })

  it('the honest-claims text landed in the 3 schemas', () => {
    for (const s of ['budget', 'expense', 'packing-list']) {
      const t = read(`src/lib/erp/schemas/${s}.ts`)
      expect(t.includes('Defaults to the active financial year'), `${s}.ts describe stale`).toBe(true)
    }
  })
})

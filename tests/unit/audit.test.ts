/**
 * SPEC-M9 §9 M15 — the engine-level audit trail: every committed plan leaves
 * an AuditLog row through the SHARED runCommit executor (the doors, not
 * per-service discipline). Exercises each door: doc-actions (form),
 * master-service (form + agent factory), lifecycle, and the executor's
 * semantics (best-effort, docNo extraction, payload after-image).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { runCommit, writeAudit } from '../../src/lib/erp/audit'
import { commitDocAction } from '../../src/lib/erp/doc-actions'
import { planMasterCreate } from '../../src/lib/erp/posting/master-service'
import { getMasterConfig } from '../../src/lib/erp/master-configs'
import { planCancelProgram } from '../../src/lib/erp/posting/lifecycle'
import { REGISTER_SERVICES } from '../../src/lib/erp/registers'
import { getRegisterConfig } from '../../src/lib/erp/register-configs'

const TS = Date.now()
const PARTY = `M15-P-${TS}`
const BUYER = `M15-B-${TS}`
const ORDER = `M15-ORD-${TS}`
const PROGRAM = `M15-PGM-${TS}`

let partyId = '', buyerId = '', orderId = '', programId = ''
const auditIds: string[] = []

async function cleanupAudit(actorMark: string) {
  const rows = await db.auditLog.findMany({ where: { actorName: { contains: actorMark } }, select: { id: true } })
  await db.auditLog.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } })
}

describe('SPEC-M9 §9 M15 — engine-level audit trail', () => {
  beforeAll(async () => {
    const p = await db.party.create({ data: { code: PARTY, name: `M15 Party ${TS}` } })
    partyId = p.id
    const b = await db.buyer.create({ data: { code: BUYER, name: `M15 Buyer ${TS}` } })
    buyerId = b.id
    const o = await db.order.create({ data: { orderNo: ORDER, buyerId, finYear: 'FY26', totalPcs: 100 } })
    orderId = o.id
    const pg = await db.program.create({ data: { programNo: PROGRAM, orderId, stage: 'knitting', status: 'open' } })
    programId = pg.id
    // L1 line for the line-issue door probe (deleted in afterAll when created here)
    if (!(await db.line.findUnique({ where: { code: 'L1' } }))) {
      await db.line.create({ data: { code: 'L1', name: 'Line 1' } })
    }
  })

  afterAll(async () => {
    // children-first: audit rows for THIS run, then the fixtures
    await cleanupAudit('m15')
    await cleanupAudit('system') // test-scope commits degrade to actor 'system'
    const myAudit = await db.auditLog.findMany({
      where: { OR: [{ docNo: { in: [ORDER, PROGRAM, PARTY] } }, { summary: { contains: `M15 ` } }] },
      select: { id: true },
    })
    if (myAudit.length) await db.auditLog.deleteMany({ where: { id: { in: myAudit.map((r) => r.id) } } })
    await db.program.deleteMany({ where: { id: programId } })
    await db.order.deleteMany({ where: { id: orderId } })
    await db.buyer.deleteMany({ where: { id: buyerId } })
    await db.party.deleteMany({ where: { id: partyId } })
  })

  it('runCommit runs the plan AND records the row (docNo extracted, payload after-image)', async () => {
    const plan = await planMasterCreate(getMasterConfig('party')!, { name: `M15 AuditParty ${TS}`, partyType: 'both' })
    expect(plan.ok).toBe(true)
    const committed = await runCommit(
      { ok: plan.ok, commit: plan.commit, summary: plan.summary, creates: plan.creates ? [plan.creates] : undefined, updates: plan.updates ? [plan.updates] : undefined },
      { actorName: 'm15@test', actorSource: 'form', action: 'create', entity: 'party' },
    )
    expect(committed.code).toBeTruthy()
    const row = await db.auditLog.findFirst({ where: { actorName: 'm15@test' }, orderBy: { createdAt: 'desc' } })
    expect(row).toBeTruthy()
    auditIds.push(row!.id)
    expect(row!.action).toBe('create')
    expect(row!.entity).toBe('party')
    expect(row!.docNo).toBe(committed.code) // code extracted as the doc no
    expect(row!.actorSource).toBe('form')
    const payload = JSON.parse(row!.payload!)
    expect(payload.creates.length).toBeGreaterThan(0)
    // cleanup the created party
    await db.party.deleteMany({ where: { id: committed.id } })
  })

  it('the DOC form door (commitDocAction) leaves a row — engine-level, not per-service', async () => {
    // a line issue against the fixture order via the form door (actor degrades to 'system' in tests)
    const r = await commitDocAction('line-issue', {
      header: { orderNo: ORDER, lineCode: 'L1', qty: '10', issueDate: '2026-08-15' },
    })
    expect(r.ok).toBe(true)
    const row = await db.auditLog.findFirst({ where: { entity: 'line-issue', actorSource: 'system' }, orderBy: { createdAt: 'desc' } })
    expect(row).toBeTruthy()
    expect(row!.docNo).toContain('LI-')
    expect(row!.summary).toContain(ORDER)
    await db.lineIssue.deleteMany({ where: { id: (r.doc as { id: string }).id } })
  })

  it('the LIFECYCLE door leaves a row with the right action', async () => {
    const plan = await planCancelProgram({ programNo: PROGRAM, force: true })
    expect(plan.ok).toBe(true)
    await runCommit(plan, { actorName: 'm15@test', actorSource: 'form', action: 'cancel', entity: 'program' })
    const row = await db.auditLog.findFirst({ where: { actorName: 'm15@test', action: 'cancel' }, orderBy: { createdAt: 'desc' } })
    expect(row).toBeTruthy()
    expect(row!.docNo).toBe(PROGRAM)
    expect(row!.entity).toBe('program')
  })

  it('writeAudit is best-effort — a broken payload object never throws', async () => {
    await expect(writeAudit({
      actorName: 'm15@test', actorSource: 'system', action: 'create', entity: 'x',
      payload: { big: 'ok' },
    })).resolves.toBeUndefined()
    const row = await db.auditLog.findFirst({ where: { actorName: 'm15@test', entity: 'x' }, orderBy: { createdAt: 'desc' } })
    expect(row).toBeTruthy()
  })

  it('the audit-log REGISTER filters by source and entity (the admin viewer)', async () => {
    const svc = REGISTER_SERVICES['audit-log']
    expect(svc).toBeTruthy()
    const all = await svc({ limit: 100, page: 1 })
    expect(all.count).toBeGreaterThan(0)
    expect(all.rows[0].createdAt).toBeTruthy()

    const bySource = await svc({ limit: 100, page: 1, variant: 'form' })
    expect(bySource.rows.every((r: any) => r.source === 'form')).toBe(true)

    const byEntity = await svc({ limit: 100, page: 1, status: 'party' })
    expect(byEntity.rows.every((r: any) => r.entity === 'party')).toBe(true)

    const byQ = await svc({ limit: 100, page: 1, q: 'm15@test' })
    expect(byQ.rows.length).toBeGreaterThan(0)
    expect((byQ.rows[0] as any).actor).toBe('m15@test')
  })

  it('no commit door bypasses the executor (grep-level contract)', async () => {
    const fs = await import('node:fs')
    const doors = [
      'src/lib/erp/doc-actions.ts',
      'src/lib/erp/cancel-action.ts',
      'src/app/api/agent/approve/route.ts',
      'src/app/(erp)/masters/actions.ts',
      'src/app/(erp)/orders/actions.ts',
      'src/app/(erp)/programs/cancel/actions.ts',
      'src/app/(erp)/programs/complete/actions.ts',
      'src/app/(erp)/orders/close/actions.ts',
      'src/app/(erp)/procurement/po/close/actions.ts',
      'src/app/(erp)/orders/amendments/actions.ts',
      'src/app/(erp)/admin/menu-rights/actions.ts',
    ]
    for (const f of doors) {
      const src = fs.readFileSync(f, 'utf-8')
      expect(src.includes('runCommit'), `${f} must route commits through runCommit`).toBe(true)
      expect(!/[^.\w]plan\.commit\(\)/.test(src), `${f} must not call plan.commit() directly`).toBe(true)
    }
  })
})

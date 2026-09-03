/**
 * SPEC-M7 Wave B — agent user context: the session user is the APPROVAL ACTOR.
 *
 *   - approve_pending executed WITH an actor → plan.updates + committed
 *     Approval.approvedBy = actor.email (the human who clicked Approve)
 *   - approve_pending executed WITHOUT an actor → 'agent' (pre-M7B contract
 *     preserved for direct/test calls)
 *   - a manual-queue gate wrapper (accept_grn) with an actor stamps
 *     actor.email on the find-or-create commit path too
 *   - AgentTool.execute signature accepts the optional second parameter
 *     without breaking the registry
 */
import { describe, it, expect, afterAll } from 'vitest'
import { getTool, allTools, type AgentActor } from '@/lib/agent/tools'
import { db } from '@/lib/db'

const TS = Date.now()
const ACTOR: AgentActor = {
  userId: 'actor-user-id',
  email: 'actor@fiberpro.local',
  name: 'Actor Test',
}

const grnNo = `GRN-ACTOR-${TS}`
let partyId = ''
let godownId = ''

afterAll(async () => {
  await db.approval.deleteMany({ where: { entityId: { contains: `actor-${TS}` } } }).catch(() => {})
  const grn = await db.gRN.findUnique({ where: { grnNo } }).catch(() => null)
  if (grn) {
    await db.approval.deleteMany({ where: { entity: 'grn_acceptance', entityId: grn.id } }).catch(() => {})
    await db.gRN.delete({ where: { id: grn.id } }).catch(() => {})
  }
  if (partyId) await db.party.delete({ where: { id: partyId } }).catch(() => {})
  if (godownId) await db.godown.delete({ where: { id: godownId } }).catch(() => {})
  await db.$disconnect()
})

describe('approval actor on commits (SPEC-M7 Wave B)', () => {
  it('approve_pending WITH actor → approvedBy = actor.email in plan AND commit', async () => {
    const ap = await db.approval.create({
      data: {
        entity: 'po', entityId: `actor-${TS}-po`, step: 1,
        requestedBy: 'agent', status: 'pending',
      },
    })
    const t = getTool('approve_pending')!
    const result = await t.execute({ approvalId: ap.id }, ACTOR)
    expect(result.plan).toBeTruthy()
    expect(result.plan!.updates[0].data.approvedBy).toBe(ACTOR.email)
    const committed = await result.commit!()
    expect(committed.status).toBe('approved')
    const row = await db.approval.findUnique({ where: { id: ap.id } })
    expect(row!.status).toBe('approved')
    expect(row!.approvedBy).toBe(ACTOR.email)
  })

  it('approve_pending WITHOUT actor → approvedBy = "agent" (back-compat)', async () => {
    const ap = await db.approval.create({
      data: {
        entity: 'po', entityId: `actor-${TS}-po2`, step: 1,
        requestedBy: 'agent', status: 'pending',
      },
    })
    const t = getTool('approve_pending')!
    const result = await t.execute({ approvalId: ap.id })
    expect(result.plan!.updates[0].data.approvedBy).toBe('agent')
    await result.commit!()
    const row = await db.approval.findUnique({ where: { id: ap.id } })
    expect(row!.approvedBy).toBe('agent')
  })

  it('accept_grn gate wrapper WITH actor → find-or-create commit stamps actor.email', async () => {
    const party = await db.party.create({
      data: { code: `ACTOR-${TS}`, name: `Actor Party ${TS}`, partyType: 'supplier' },
    })
    const godown = await db.godown.create({
      data: { code: `AG${TS % 1000}`, name: `Actor Godown ${TS}` },
    })
    partyId = party.id
    godownId = godown.id
    const grn = await db.gRN.create({
      data: {
        grnNo, grnType: 'purchase', partyId: party.id, godownId: godown.id,
        finYear: '26-27', totalQty: 10, totalValue: 1000,
      },
    })
    const t = getTool('accept_grn')!
    const result = await t.execute({ grnNo }, ACTOR)
    expect(result.plan).toBeTruthy() // no existing approval → create-then-approve
    expect(result.plan!.creates.length).toBe(1)
    expect(result.plan!.updates[0].data.approvedBy).toBe(ACTOR.email)
    const committed = await result.commit!()
    expect(committed.status).toBe('approved')
    const row = await db.approval.findFirst({
      where: { entity: 'grn_acceptance', entityId: grn.id },
      orderBy: { createdAt: 'desc' },
    })
    expect(row!.status).toBe('approved')
    expect(row!.approvedBy).toBe(ACTOR.email)
  })

  it('the tool registry still exposes every tool with the widened execute signature', () => {
    expect(allTools.length).toBe(253) // M46 L-02: +create_payroll_run +commit_payroll_run +get_payroll_runs // M45 L-01: +get_operator_statement // M43 PRG: +set_order_deliveries +correct_program_spec +propose_program_requirements // M42 INV: +create_stock_take +record_stock_counts +advance_stock_take (M39 JWL: +bill_jobwork +list_jobworker_statement)
    for (const t of allTools) {
      expect(typeof t.execute).toBe('function')
    }
    expect(getTool('approve_pending')).toBeTruthy()
    expect(getTool('accept_grn')).toBeTruthy()
    expect(getTool('acknowledge_cutting_issue')).toBeTruthy()
    expect(getTool('create_bill_pass')).toBeTruthy()
    // SPEC-M9 — the live-activity read door over the tracker service
    expect(getTool('get_live_activity')).toBeTruthy()
  })
})

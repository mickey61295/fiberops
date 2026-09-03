/**
 * Tracker tests — SPEC-M9 §7: getTrackerSnapshot over seeded fixtures
 * (the Wave-A pattern: create rows with TS-suffixed keys, assert, clean up
 * children-first — no onDelete cascade).
 *
 * THE ONE RULE under test: createdAt is the live signal — seeded rows (createdAt
 * = now) must appear in the feed AND the today-KPIs, regardless of business dates.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { getTrackerSnapshot, countToolCalls, FEED_LIMIT_DEFAULT } from '@/lib/erp/tracker'
import { getTool, allTools } from '@/lib/agent/tools'

const TS = Date.now()

// fixtures
let partyId = ''
let buyerId = ''
let orderId = ''
let godownId = ''
let grnId = ''
let gateInId = ''
let gateOutId = ''
let approvalId = ''
let turnOkId = ''
let turnCorruptId = ''

const GRN_NO = `TGN-${TS}`
const GE_NO = `TGE-${TS}`
const GP_NO = `TGP-${TS}`
const ORDER_NO = `TWO-${TS}`
const PROMPT = `tracker fixture prompt ${TS}`

describe('M9 Live Tracker (SPEC-M9 §7)', () => {
  beforeAll(async () => {
    const party = await db.party.create({
      data: { code: `TPY-${TS}`, name: `Tracker Party ${TS}`, city: 'Tirupur', partyType: 'both' },
    })
    partyId = party.id
    const buyer = await db.buyer.create({ data: { code: `TBY-${TS}`, name: `Tracker Buyer ${TS}` } })
    buyerId = buyer.id
    const godown = await db.godown.create({ data: { code: `TGD-${TS}`, name: `Tracker Godown ${TS}` } })
    godownId = godown.id
    const order = await db.order.create({
      data: { orderNo: ORDER_NO, buyerId, finYear: 'FY26', totalPcs: 300, totalValue: 240000 },
    })
    orderId = order.id
    const grn = await db.gRN.create({
      data: { grnNo: GRN_NO, grnType: 'purchase', partyId, godownId, finYear: 'FY26', totalQty: 120, totalValue: 96000 },
    })
    grnId = grn.id
    const ge = await db.gateEntry.create({
      data: { entryNo: GE_NO, gateType: 'in', partyId, vehicleNo: 'TN33-B-1111', purpose: 'fabric inward' },
    })
    gateInId = ge.id
    const gp = await db.gateEntry.create({
      data: { entryNo: GP_NO, gateType: 'out', vehicleNo: 'TN39-C-2262', purpose: 'finished goods outward' },
    })
    gateOutId = gp.id
    const approval = await db.approval.create({
      data: { entity: 'grn_acceptance', entityId: `fixture-${TS}`, requestedBy: 'agent', status: 'pending' },
    })
    approvalId = approval.id
    const turnOk = await db.agentTurn.create({
      data: {
        prompt: PROMPT,
        toolCalls: JSON.stringify([{ name: 'get_order_status', args: {}, result: 'ok' }]),
        approved: true, approvedBy: 'admin@fiberpro.local', approvedAt: new Date(),
        userId: 'tracker-fixture-user',
      },
    })
    turnOkId = turnOk.id
    const turnCorrupt = await db.agentTurn.create({
      data: { prompt: 'corrupt tools row', toolCalls: '{not json', userId: 'tracker-fixture-user' },
    })
    turnCorruptId = turnCorrupt.id
  })

  afterAll(async () => {
    // children-first cleanup (PITFALLS-repeated lesson)
    await db.agentTurn.deleteMany({ where: { id: { in: [turnOkId, turnCorruptId] } } })
    await db.approval.deleteMany({ where: { id: approvalId } })
    await db.gateEntry.deleteMany({ where: { id: { in: [gateInId, gateOutId] } } })
    await db.gRN.deleteMany({ where: { id: grnId } })
    await db.order.deleteMany({ where: { id: orderId } })
    await db.godown.deleteMany({ where: { id: godownId } })
    await db.buyer.deleteMany({ where: { id: buyerId } })
    await db.party.deleteMany({ where: { id: partyId } })
  })

  it('snapshot shape: all five sections, ISO generatedAt, feed sorted desc', async () => {
    const snap = await getTrackerSnapshot()
    expect(Object.keys(snap.kpis).sort()).toEqual([
      'agentTurnsToday', 'approvalsToday', 'cutsToday', 'despatchPcsToday', 'docsToday',
      'gateToday', 'grnsToday', 'invoicesToday', 'jobworkToday', 'ordersToday',
      'paymentsToday', 'pendingApprovals', 'posToday', 'prodPcsToday', 'stockMovesToday',
    ].sort())
    expect(Array.isArray(snap.feed)).toBe(true)
    expect(snap.feed.length).toBeLessThanOrEqual(FEED_LIMIT_DEFAULT)
    for (let i = 1; i < snap.feed.length; i++) {
      expect(snap.feed[i - 1].at >= snap.feed[i].at).toBe(true)
    }
    expect(isNaN(Date.parse(snap.generatedAt))).toBe(false)
    expect(snap.modules).toHaveProperty('groups')
    expect(snap.modules).toHaveProperty('activeToday')
    expect(snap.modules).toHaveProperty('familiesTotal')
    expect(snap.approvals).toHaveProperty('pendingByKind')
    expect(snap.approvals).toHaveProperty('oldestPendingMin')
    expect(snap.agent).toHaveProperty('turns')
    expect(snap.system).toHaveProperty('serverTime')
    expect(snap.system.flagsTotal).toBeGreaterThan(0)
  })

  it('seeded fixtures appear in the feed with kind/docNo/href (THE ONE RULE: createdAt=now)', async () => {
    const snap = await getTrackerSnapshot({ feedLimit: 40 })
    const feedEntry = (kind: string, docNo: string) =>
      snap.feed.find((e) => e.kind === kind && e.docNo === docNo)
    expect(feedEntry('order', ORDER_NO)?.href).toBe(`/orders/${orderId}`)
    expect(feedEntry('grn', GRN_NO)?.href).toBe(`/procurement/grn/${grnId}`)
    expect(feedEntry('approval', 'GRN Acceptance')).toBeTruthy() // entity 'grn_acceptance' → approval-kind label
    expect(feedEntry('approval', 'GRN Acceptance')?.href).toBe('/approvals')
    expect(feedEntry('agent', '1 tools')).toBeTruthy() // turnOk with 1 parsed tool call
  })

  it('gate href splits by gateType: in → gate-entry, out → gate-pass', async () => {
    const snap = await getTrackerSnapshot({ feedLimit: 40 })
    expect(snap.feed.find((e) => e.docNo === GE_NO)?.href).toBe(`/dispatch/gate-entry/${gateInId}`)
    expect(snap.feed.find((e) => e.docNo === GP_NO)?.href).toBe(`/dispatch/gate-pass/${gateOutId}`)
  })

  it('today KPIs include the seeded rows', async () => {
    const snap = await getTrackerSnapshot()
    expect(snap.kpis.ordersToday).toBeGreaterThanOrEqual(1)
    expect(snap.kpis.grnsToday).toBeGreaterThanOrEqual(1)
    expect(snap.kpis.gateToday).toBeGreaterThanOrEqual(2)
    expect(snap.kpis.agentTurnsToday).toBeGreaterThanOrEqual(2)
    expect(snap.kpis.docsToday).toBeGreaterThanOrEqual(4) // order+grn+2 gate
    expect(snap.kpis.pendingApprovals).toBeGreaterThanOrEqual(1)
    // the seeded pending row is counted under its kind in the approvals panel
    const pending = snap.approvals.pendingByKind.find((k) => k.kind === 'grn_acceptance')
    expect(pending?.label).toBe('GRN Acceptance')
    expect(pending?.count).toBeGreaterThanOrEqual(1)
    expect(snap.kpis.approvalsToday).toBeGreaterThanOrEqual(0)
    expect(snap.agent.approvedToday).toBeGreaterThanOrEqual(1)
    // the agent pulse shows the parsed turn with its tool count + user
    const pulseTurn = snap.agent.turns.find((t) => t.prompt === PROMPT)
    expect(pulseTurn?.toolCalls).toBe(1)
    expect(pulseTurn?.approved).toBe(true)
  })

  it('modules board (§4-B): 11 groups / 17 families; seeded rows drive today + latest', async () => {
    const snap = await getTrackerSnapshot()
    // fixed board shape: 11 groups, 17 unique family kinds
    expect(snap.modules.groups.length).toBe(11)
    const fams = snap.modules.groups.flatMap((g) => g.families)
    expect(fams.length).toBe(17)
    expect(new Set(fams.map((f) => f.kind)).size).toBe(17)
    expect(snap.modules.familiesTotal).toBe(17)
    const byKind = new Map(fams.map((f) => [f.kind, f]))
    // seeded fixtures (createdAt = now) make order + grn ACTIVE today with a latest doc
    expect(byKind.get('order')!.today).toBeGreaterThanOrEqual(1)
    expect(byKind.get('order')!.total).toBeGreaterThanOrEqual(1)
    expect(byKind.get('order')!.latestDocNo).toBeTruthy()
    expect(byKind.get('order')!.latestAt).toBeTruthy()
    expect(byKind.get('grn')!.today).toBeGreaterThanOrEqual(1)
    // board rows carry their register links; agent has no list screen; stock is board-only
    expect(byKind.get('order')!.listHref).toBe('/orders')
    expect(byKind.get('grn')!.listHref).toBe('/procurement/grn')
    expect(byKind.get('stock')!.listHref).toBe('/inventory/ledger')
    expect(byKind.get('agent')!.listHref).toBeNull()
    // THE ONE RULE at board scale: ≥ order + grn + agent families active today
    expect(snap.modules.activeToday).toBeGreaterThanOrEqual(3)
    // every row is well-formed (no undefined leaking into the JSON contract)
    for (const f of fams) {
      expect(typeof f.total).toBe('number')
      expect(typeof f.today).toBe('number')
      expect(f.latestAt === null || !isNaN(Date.parse(f.latestAt))).toBe(true)
    }
  })

  it('feedLimit cap respected; countToolCalls degrades corrupt JSON to 0', async () => {
    const one = await getTrackerSnapshot({ feedLimit: 1 })
    expect(one.feed.length).toBeLessThanOrEqual(1)
    // corrupt row surfaces as '0 tools' in the feed, never throws
    expect(countToolCalls('{not json')).toBe(0)
    expect(countToolCalls(null)).toBe(0)
    expect(countToolCalls('[]')).toBe(0)
    expect(countToolCalls(JSON.stringify([{}, {}, {}]))).toBe(3)
  })

  it('get_live_activity tool: registered read tool over the same service (189 pin)', async () => {
    expect(allTools.length).toBe(253) // M46 L-02: +create_payroll_run +commit_payroll_run +get_payroll_runs // M45 L-01: +get_operator_statement // M43 PRG: +set_order_deliveries +correct_program_spec +propose_program_requirements // M42 INV: +create_stock_take +record_stock_counts +advance_stock_take (M39 JWL: +bill_jobwork +list_jobworker_statement)
    const tool = getTool('get_live_activity')
    expect(tool).toBeTruthy()
    expect(tool!.isWrite).toBe(false)
    expect(tool!.domain).toBe('meta')
    const r = await tool!.execute({})
    expect(r.text).toContain('Live today:')
    expect(r.text).toContain('screens active today')
    expect(r.text).toContain('Pending approvals:')
    expect((r as { json: { kpis: unknown; feed: unknown[]; modules: { groups: unknown[] } } }).json.kpis).toBeTruthy()
    expect((r as { json: { feed: unknown[] } }).json.feed.length).toBeGreaterThan(0)
    expect((r as { json: { modules: { groups: unknown[] } } }).json.modules.groups.length).toBe(11)
  })
})

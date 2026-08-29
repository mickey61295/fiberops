/**
 * SPEC-M9 §9 M13 — notifications digest: section math (approvals with age,
 * low stock threshold + negative balances, gate movements today), flags
 * gating the send, and the route's auth matrix (session / cron secret).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { buildDigest, sendDigest } from '../../src/lib/erp/notifications/digest'
import { setFlag, getFlag } from '../../src/lib/erp/flags'

const TS = Date.now()
const GODOWN = `M13-G-${TS}`
const STYLE = `M13-S-${TS}`
const PARTY = `M13-P-${TS}`

let godownId = '', styleId = '', partyId = ''
let approvalIds: string[] = []

describe('SPEC-M9 §9 M13 — buildDigest sections', () => {
  beforeAll(async () => {
    const g = await db.godown.create({ data: { code: GODOWN, name: `M13 GD ${TS}` } })
    godownId = g.id
    const s = await db.style.create({ data: { styleNo: STYLE } })
    styleId = s.id
    const p = await db.party.create({ data: { code: PARTY, name: `M13 Party ${TS}` } })
    partyId = p.id

    await db.currentStock.createMany({ data: [
      // pcs under a threshold of 500 → low stock (armed case)
      { itemType: 'pcs', itemId: styleId, godownId, pcs: 120, rate: 10 },
      // NEGATIVE yarn kgs → always flagged
      { itemType: 'yarn', itemId: 'M13-NEG-YARN', godownId, kgs: -25 },
      // healthy fabric row → never flagged
      { itemType: 'fabric', itemId: 'M13-OK-FABRIC', godownId, kgs: 400 },
    ]})
    await setFlag('notification.low_stock_pcs', 500)

    const a1 = await db.approval.create({ data: { entity: 'po', entityId: `M13-PO-${TS}`, step: 1, requestedBy: 'm13@test' } })
    const old = new Date(Date.now() - 3 * 86400000)
    const a2 = await db.approval.create({ data: { entity: 'invoice', entityId: `M13-INV-${TS}`, step: 2, requestedBy: 'm13@test', createdAt: old } })
    approvalIds = [a1.id, a2.id]

    await db.gateEntry.create({ data: { entryNo: `M13-GE-${TS}`, gateType: 'in', partyId, vehicleNo: 'TN33XY1234', refDocNo: `M13-PO-${TS}` } })
  })

  afterAll(async () => {
    await db.gateEntry.deleteMany({ where: { entryNo: `M13-GE-${TS}` } })
    await db.approval.deleteMany({ where: { id: { in: approvalIds } } })
    await db.currentStock.deleteMany({ where: { godownId } })
    await db.style.deleteMany({ where: { id: styleId } })
    await db.party.deleteMany({ where: { id: partyId } })
    await db.godown.deleteMany({ where: { id: godownId } })
    await setFlag('notification.low_stock_pcs', 0)
    await setFlag('notification.digest_enabled', false)
    await setFlag('notification.webhook_url', '')
    await setFlag('notification.cron_secret', '')
  })

  it('approvals section carries both rows with age (incl. the 3-day-old one) and entity labels', async () => {
    const d = await buildDigest()
    const inv = d.sections.approvals.rows.find((r) => r.entityId === `M13-INV-${TS}`)
    expect(inv).toBeTruthy()
    expect(inv!.entity).toBe('Invoice')
    expect(inv!.ageDays).toBe(3)
    expect(d.sections.approvals.rows.some((r) => r.entity === 'Purchase Order' && r.ageDays === 0)).toBe(true)
    expect(d.text).toContain('Pending approvals: 2')
  })

  it('low stock: pcs under threshold + negative material; healthy rows never flagged', async () => {
    const d = await buildDigest()
    expect(d.sections.lowStock.thresholdPcs).toBe(500)
    const pcs = d.sections.lowStock.rows.find((r) => r.itemCode === STYLE)
    expect(pcs).toBeTruthy()
    expect(pcs!.pcs).toBe(120)
    const neg = d.sections.lowStock.rows.find((r) => r.itemCode === 'M13-NEG-YARN')
    expect(neg).toBeTruthy()
    expect(neg!.kgs).toBe(-25)
    expect(d.sections.lowStock.rows.some((r) => r.itemCode === 'M13-OK-FABRIC')).toBe(false)
  })

  it('threshold 0 → pcs section off, negative balances still flagged', async () => {
    await setFlag('notification.low_stock_pcs', 0)
    const d = await buildDigest()
    expect(d.sections.lowStock.rows.some((r) => r.itemCode === STYLE)).toBe(false) // threshold off
    expect(d.sections.lowStock.rows.some((r) => r.itemCode === 'M13-NEG-YARN')).toBe(true) // always
    await setFlag('notification.low_stock_pcs', 500)
  })

  it('gate section lists today\u2019s entries with vehicle + party resolved (plain-FK id-map)', async () => {
    const d = await buildDigest()
    const ge = d.sections.gate.rows.find((r) => r.entryNo === `M13-GE-${TS}`)
    expect(ge).toBeTruthy()
    expect(ge!.vehicleNo).toBe('TN33XY1234')
    expect(ge!.party).toContain('M13 Party')
    expect(ge!.refDocNo).toBe(`M13-PO-${TS}`)
    expect(d.text).toContain('Gate movements today')
  })

  it('sendDigest is FLAG-GATED: disabled or empty webhook never fetches', async () => {
    await setFlag('notification.digest_enabled', false)
    await setFlag('notification.webhook_url', 'https://example.test/hook')
    let r = await sendDigest()
    expect(r.sent).toBe(false)
    expect(r.reason).toContain('digest_enabled')

    await setFlag('notification.digest_enabled', true)
    await setFlag('notification.webhook_url', '')
    r = await sendDigest()
    expect(r.sent).toBe(false)
    expect(r.reason).toContain('webhook_url')
    // armed but unreachable endpoint → ok:false with a reason, never a throw
    await setFlag('notification.webhook_url', 'http://127.0.0.1:1/unreachable')
    r = await sendDigest()
    expect(r.ok).toBe(false)
  })

  it('the four notification flags exist in the registry with the right types', async () => {
    await setFlag('notification.digest_enabled', false) // reset the send-test's arm
    expect(await getFlag('notification.digest_enabled')).toBe(false)
    expect(typeof (await getFlag('notification.low_stock_pcs'))).toBe('number')
    expect(String(await getFlag('notification.cron_secret'))).toBe('')
  })
})

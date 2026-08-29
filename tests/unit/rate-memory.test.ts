/**
 * SPEC-M18 §4-C3 tests — rate memory: the read-only last_rate door.
 * findLastRate(party, itemType, itemCode) must return the MOST RECENT PO/GRN
 * line rate for that pair (whichever document is newer wins), exclude
 * cancelled POs, and return null for unknown pairs. Plus the /api/erp wiring
 * pin (the case exists and calls the same function).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { findLastRate } from '@/lib/erp/rate-memory'

const TS = Date.now()
let partyId = ''
let otherPartyId = ''
let yarnId = ''
let godownId = ''
const PARTY_CODE = `RMPY-${TS}`
const OTHER_PARTY_CODE = `RMPZ-${TS}`
const YARN_CODE = `RMYN-${TS}`
const poNos = [`RMPO1-${TS}`, `RMPO2-${TS}`, `RMPOC-${TS}`]
const grnNo = `RMGRN-${TS}`

describe('M18 Wave C: rate memory (SPEC-M18 §4-C3)', () => {
  beforeAll(async () => {
    const party = await db.party.create({ data: { code: PARTY_CODE, name: `RM Party ${TS}`, city: 'Tirupur', partyType: 'supplier' } })
    partyId = party.id
    const other = await db.party.create({ data: { code: OTHER_PARTY_CODE, name: `RM Other ${TS}`, city: 'Tirupur', partyType: 'supplier' } })
    otherPartyId = other.id
    // yarn needs a UOM (required relation) — reuse any existing, else mint one
    let uomId = (await db.uOM.findFirst({ select: { id: true } }))?.id
    if (!uomId) uomId = (await db.uOM.create({ data: { code: `RMUOM-${TS}`, name: `RM UOM ${TS}` } })).id
    const yarn = await db.yarn.create({ data: { code: YARN_CODE, count: '30S', uomId } })
    yarnId = yarn.id
    const godown = await db.godown.create({ data: { code: `RMGD-${TS}`, name: `RM Godown ${TS}` } })
    godownId = godown.id

    // PO1: older, rate 80
    await db.purchaseOrder.create({
      data: {
        poNo: poNos[0], poType: 'yarn', partyId, finYear: 'FY26', status: 'open',
        orderDate: new Date('2026-07-01T00:00:00Z'),
        lines: { create: { itemType: 'yarn', itemId: yarnId, qty: 10, rate: 80, amount: 800 } },
      },
    })
    // PO2: newer, rate 85 — this wins over PO1
    await db.purchaseOrder.create({
      data: {
        poNo: poNos[1], poType: 'yarn', partyId, finYear: 'FY26', status: 'open',
        orderDate: new Date('2026-08-10T00:00:00Z'),
        lines: { create: { itemType: 'yarn', itemId: yarnId, qty: 10, rate: 85, amount: 850 } },
      },
    })
    // PO cancelled: NEWEST of the POs, rate 99 — must be excluded
    await db.purchaseOrder.create({
      data: {
        poNo: poNos[2], poType: 'yarn', partyId, finYear: 'FY26', status: 'cancelled',
        orderDate: new Date('2026-08-20T00:00:00Z'),
        lines: { create: { itemType: 'yarn', itemId: yarnId, qty: 10, rate: 99, amount: 990 } },
      },
    })
    // GRN: newest overall (2026-08-25), rate 87 — source GRN wins
    const grn = await db.gRN.create({
      data: { grnNo, grnType: 'purchase', partyId, godownId, finYear: 'FY26', totalQty: 5, grnDate: new Date('2026-08-25T00:00:00Z') },
    })
    await db.gRNLine.create({
      data: { grnId: grn.id, itemType: 'yarn', itemId: yarnId, qty: 5, rate: 87, amount: 435 },
    })
  })

  afterAll(async () => {
    const cleanup = async (fn: () => Promise<unknown>) => { try { await fn() } catch { /* already gone */ } }
    await cleanup(() => db.gRNLine.deleteMany({ where: { grn: { grnNo: grnNo } } }))
    await cleanup(() => db.gRN.deleteMany({ where: { grnNo } }))
    // POLines FIRST — PO delete is FK-restricted while lines exist (Prisma
    // default Restrict; a silent .catch would leak the PO — the residue bug)
    await cleanup(() => db.pOLine.deleteMany({ where: { po: { poNo: { in: poNos } } } }))
    await cleanup(() => db.purchaseOrder.deleteMany({ where: { poNo: { in: poNos } } }))
    await cleanup(() => db.yarn.deleteMany({ where: { id: yarnId } }))
    await cleanup(() => db.uOM.deleteMany({ where: { code: `RMUOM-${TS}` } })) // no-op when an existing UOM was reused
    await cleanup(() => db.godown.deleteMany({ where: { id: godownId } }))
    await cleanup(() => db.party.deleteMany({ where: { id: { in: [partyId, otherPartyId] } } }))
  })

  it('returns the NEWER PO rate when only POs exist for the pair… (here a GRN is newer — source GRN wins)', async () => {
    const hit = await findLastRate(PARTY_CODE, 'yarn', YARN_CODE)
    expect(hit).not.toBeNull()
    expect(hit!.rate).toBe(87)
    expect(hit!.source).toBe('GRN')
    expect(hit!.docNo).toBe(grnNo)
    expect(hit!.date).toBe('2026-08-25')
  })

  it('PO wins when it is newer than any GRN, and cancelled POs are excluded', async () => {
    // push the GRN into the past by deleting + recreating with an old date
    await db.gRNLine.deleteMany({ where: { grn: { grnNo } } })
    await db.gRN.delete({ where: { grnNo } })
    const grnOld = await db.gRN.create({
      data: { grnNo, grnType: 'purchase', partyId, godownId, finYear: 'FY26', totalQty: 5, grnDate: new Date('2026-06-01T00:00:00Z') },
    })
    await db.gRNLine.create({ data: { grnId: grnOld.id, itemType: 'yarn', itemId: yarnId, qty: 5, rate: 50, amount: 250 } })

    const hit = await findLastRate(PARTY_CODE, 'yarn', YARN_CODE)
    expect(hit).not.toBeNull()
    // newest NON-cancelled PO is PO2 (2026-08-10, rate 85) — the cancelled 99 is excluded
    expect(hit!.rate).toBe(85)
    expect(hit!.source).toBe('PO')
    expect(hit!.docNo).toBe(poNos[1])
    expect(hit!.date).toBe('2026-08-10')
  })

  it('null for unknown party / unknown item / bad item type', async () => {
    expect(await findLastRate(`NOPE-${TS}`, 'yarn', YARN_CODE)).toBeNull()
    expect(await findLastRate(PARTY_CODE, 'yarn', `NOPE-${TS}`)).toBeNull()
    expect(await findLastRate(PARTY_CODE, 'machine', YARN_CODE)).toBeNull()
  })

  it('history is party-scoped: another supplier with no history gets null', async () => {
    expect(await findLastRate(OTHER_PARTY_CODE, 'yarn', YARN_CODE)).toBeNull()
  })

  it('/api/erp wiring pin: the last_rate case exists and calls findLastRate', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/erp/route.ts'), 'utf8')
    expect(src).toContain("case 'last_rate'")
    expect(src).toContain('findLastRate')
    // and the DocScreen auto-fill consumes it with the source-citing toast
    const screen = readFileSync(join(process.cwd(), 'src/components/archetypes/doc-screen.tsx'), 'utf8')
    expect(screen).toContain('last_rate')
    expect(screen).toContain('Rate ₹')
  })
})

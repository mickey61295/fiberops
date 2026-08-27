/**
 * print-docs-b tests — SPEC-M8 Wave B §6: the 15 remaining fetchers against
 * seeded fixtures (the Wave-A pattern: create rows, assert the normalized
 * PrintDoc shape, clean up children-first — no onDelete cascade).
 *
 * budget / cost-sheet / production-entry resolve by db id ONLY (no unique
 * doc-no field); gate-entry vs gate-pass filter by gateType (§4 rule-2).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { PRINT_DOCS, getPrintDocTypes } from '@/lib/erp/print'

const TS = Date.now()

// fixtures
let partyId = ''
let buyerId = ''
let orderId = ''
let deptId = ''
let lineId = ''
let employeeId = ''

let noteId = ''
let journalId = ''
let budgetId = ''
let costSheetId = ''
let expenseId = ''
let cutId = ''
let gateInId = ''
let gateOutId = ''
let sampleId = ''
let despatchId = ''
let packId = ''
let rejId = ''
let prodId = ''
let issueId = ''
let labId = ''

const NOTE_NO = `PBN-${TS}`
const JRN_NO = `PJV-${TS}`
const EXP_NO = `PEX-${TS}`
const CUT_NO = `PCT-${TS}`
const GE_NO = `PGE-${TS}`
const GP_NO = `PGP-${TS}`
const SMP_NO = `PSM-${TS}`
const DC_NO = `PDC-${TS}`
const PKL_NO = `PPK-${TS}`
const REJ_NO = `PRJ-${TS}`
const ISS_NO = `PIS-${TS}`
const LT_NO = `PLT-${TS}`

const WAVE_B_TYPES = [
  'debit-note', 'journal', 'budget', 'cost-sheet', 'expense', 'cut-order',
  'gate-entry', 'gate-pass', 'sample', 'pcs-despatch', 'packing-list',
  'rejection', 'production-entry', 'line-issue', 'lab-test',
]

describe('M8 Wave B print docs (SPEC-M8 §6)', () => {
  beforeAll(async () => {
    const party = await db.party.create({
      data: { code: `BPY-${TS}`, name: `WaveB Party ${TS}`, city: 'Tirupur', gstin: '33AAAPL1234C1ZV', partyType: 'both' },
    })
    partyId = party.id
    const buyer = await db.buyer.create({ data: { code: `BBY-${TS}`, name: `WaveB Buyer ${TS}` } })
    buyerId = buyer.id
    const order = await db.order.create({
      data: { orderNo: `PWO-${TS}`, buyerId, finYear: 'FY26', totalPcs: 500, totalValue: 500000 },
    })
    orderId = order.id
    const dept = await db.department.create({ data: { code: `BDP-${TS}`, name: `WaveB Dept ${TS}` } })
    deptId = dept.id
    const line = await db.line.create({ data: { code: `BLN-${TS}`, name: `WaveB Line ${TS}`, deptId } })
    lineId = line.id
    const employee = await db.employee.create({ data: { code: `BEM-${TS}`, name: `WaveB Operator ${TS}`, deptId } })
    employeeId = employee.id

    const note = await db.debitNote.create({
      data: { noteNo: NOTE_NO, noteType: 'fabric', partyId, finYear: 'FY26', amount: 12500, reason: 'fabric shortage penalty' },
    })
    noteId = note.id

    const jrn = await db.journal.create({
      data: { voucherNo: JRN_NO, voucherType: 'journal', partyId, finYear: 'FY26', debitAccount: 'Freight A/c', creditAccount: 'Cash A/c', amount: 7500, narration: 'freight paid' },
    })
    journalId = jrn.id

    const budget = await db.budget.create({
      data: {
        orderId, deptId, finYear: 'FY26', amount: 100000,
        BudgetLine: { create: [{ workId: 'dyeing', amount: 60000, actualAmount: 55000 }] },
      },
    })
    budgetId = budget.id

    const cs = await db.costSheet.create({
      data: { orderId, version: 1, fabricCost: 100, trimCost: 20, cmCost: 30, washingCost: 10, packingCost: 5, overheads: 15, commissionPct: 2, marginPct: 10, totalCost: 180, sellingPrice: 200 },
    })
    costSheetId = cs.id

    const exp = await db.expense.create({
      data: { expNo: EXP_NO, finYear: 'FY26', category: 'transport', orderId, partyId, amount: 3400, narration: 'lorry freight' },
    })
    expenseId = exp.id

    const cut = await db.cutOrder.create({
      data: { cutNo: CUT_NO, orderId, fabricIssued: 250.5, totalPcs: 500, markerLength: 12.5, noOfPlies: 40, efficiency: 88.2, status: 'cut' },
    })
    cutId = cut.id

    const ge = await db.gateEntry.create({
      data: { entryNo: GE_NO, gateType: 'in', partyId, vehicleNo: 'TN33-B-5555', refDocNo: 'PPO-1', purpose: 'yarn inward' },
    })
    gateInId = ge.id
    const gp = await db.gateEntry.create({
      data: { entryNo: GP_NO, gateType: 'out', vehicleNo: 'TN39-C-9999', refDocNo: DC_NO, purpose: 'finished goods outward' },
    })
    gateOutId = gp.id

    const smp = await db.sample.create({
      data: { sampleNo: SMP_NO, buyerId, sampleType: 'proto', qty: 25, status: 'approved', enquiryRef: `PWO-${TS}`, remarks: 'proto approved with shade comment' },
    })
    sampleId = smp.id

    const dc = await db.pcsDespatch.create({
      data: {
        dcNo: DC_NO, orderId, buyerId, finYear: 'FY26', totalPcs: 300, vehicleNo: 'TN33-X-1111', status: 'despatched',
        lines: { create: [{ styleNo: 'S-1001', qty: 200, rate: 250 }] },
      },
    })
    despatchId = dc.id

    const pk = await db.packingList.create({
      data: {
        packNo: PKL_NO, despatchId, orderId, buyerId, finYear: 'FY26', totalCartons: 3, totalPcs: 300, netKgs: 95.5, grossKgs: 101.2, status: 'confirmed',
        lines: { create: [{ cartonNo: 'CTN-1', styleNo: 'S-1001', qty: 100, netKgs: 31.8 }] },
      },
    })
    packId = pk.id

    const rej = await db.rejectionEntry.create({
      data: { rejNo: REJ_NO, orderId, deptId, qty: 12, rejType: 'stitch_fault', action: 'rework', notes: 'loose stitches' },
    })
    rejId = rej.id

    const pe = await db.productionEntry.create({
      data: { orderId, deptId, operatorId: employeeId, bundleNo: `PWO-${TS}/B1`, styleNo: 'S-1001', qty: 100, rate: 12.5, amount: 1250 },
    })
    prodId = pe.id

    const li = await db.lineIssue.create({
      data: { issueNo: ISS_NO, orderId, lineId, qty: 250, styleNo: 'S-1001', notes: 'first feeding' },
    })
    issueId = li.id

    const lt = await db.labTest.create({
      data: { testNo: LT_NO, itemType: 'fabric', itemId: 'FAB-01', testType: 'gsm', result: 'pass', testedBy: 'lab-qc', values: JSON.stringify({ gsm: 182, deviation: '+2%' }), remarks: 'within tolerance' },
    })
    labId = lt.id
  })

  afterAll(async () => {
    const sw = (e: unknown) => e as any
    // children first — no onDelete cascade in the reconstructed schema
    await sw(db.budgetLine.deleteMany({ where: { budgetId } }).catch(() => {}))
    await sw(db.pcsDespatchLine.deleteMany({ where: { pcsDespatchId: despatchId } }).catch(() => {}))
    await sw(db.packingListLine.deleteMany({ where: { packingListId: packId } }).catch(() => {}))
    await sw(db.debitNote.deleteMany({ where: { id: noteId } }).catch(() => {}))
    await sw(db.journal.deleteMany({ where: { id: journalId } }).catch(() => {}))
    await sw(db.budget.deleteMany({ where: { id: budgetId } }).catch(() => {}))
    await sw(db.costSheet.deleteMany({ where: { id: costSheetId } }).catch(() => {}))
    await sw(db.expense.deleteMany({ where: { id: expenseId } }).catch(() => {}))
    await sw(db.cutOrder.deleteMany({ where: { id: cutId } }).catch(() => {}))
    await sw(db.gateEntry.deleteMany({ where: { id: { in: [gateInId, gateOutId] } } }).catch(() => {}))
    await sw(db.sample.deleteMany({ where: { id: sampleId } }).catch(() => {}))
    await sw(db.pcsDespatch.deleteMany({ where: { id: despatchId } }).catch(() => {}))
    await sw(db.packingList.deleteMany({ where: { id: packId } }).catch(() => {}))
    await sw(db.rejectionEntry.deleteMany({ where: { id: rejId } }).catch(() => {}))
    await sw(db.productionEntry.deleteMany({ where: { id: prodId } }).catch(() => {}))
    await sw(db.lineIssue.deleteMany({ where: { id: issueId } }).catch(() => {}))
    await sw(db.labTest.deleteMany({ where: { id: labId } }).catch(() => {}))
    await sw(db.line.deleteMany({ where: { id: lineId } }).catch(() => {}))
    await sw(db.employee.deleteMany({ where: { id: employeeId } }).catch(() => {}))
    await sw(db.department.deleteMany({ where: { id: deptId } }).catch(() => {}))
    await sw(db.order.deleteMany({ where: { id: orderId } }).catch(() => {}))
    await sw(db.buyer.deleteMany({ where: { id: buyerId } }).catch(() => {}))
    await sw(db.party.deleteMany({ where: { id: partyId } }).catch(() => {}))
  })

  it('registry: Wave B adds exactly the 15 families (20 total)', () => {
    const types = getPrintDocTypes()
    for (const t of WAVE_B_TYPES) expect(types).toContain(t)
    expect(types).toHaveLength(20)
  })

  it('debit-note: DEBIT NOTE with party + words', async () => {
    const doc = await PRINT_DOCS['debit-note']!(NOTE_NO)
    expect(doc!.title).toBe('DEBIT NOTE')
    expect(doc!.docNo).toBe(NOTE_NO)
    expect(doc!.party?.name).toContain('WaveB Party')
    expect(doc!.totals!.at(-1)).toEqual(['Debit Amount', '₹12,500'])
    expect(doc!.amountWords).toContain('Twelve Thousand')
  })

  it('journal: voucherType drives the title; Dr/Cr lines', async () => {
    const doc = await PRINT_DOCS.journal!(JRN_NO)
    expect(doc!.title).toBe('JOURNAL VOUCHER')
    expect(doc!.lines!.rows).toEqual([
      ['Freight A/c', 'Dr', '₹7,500'],
      ['Cash A/c', 'Cr', '₹7,500'],
    ])
    expect(doc!.totals!.at(-1)).toEqual(['Voucher Amount', '₹7,500'])
  })

  it('budget: id-only resolution, lines + variance totals', async () => {
    const doc = await PRINT_DOCS.budget!(budgetId)
    expect(doc).toBeTruthy()
    expect(doc!.docNo).toBe(`BGT-PWO-${TS}`)
    expect(doc!.meta!.some(([l, v]) => l === 'Department' && v === `WaveB Dept ${TS}`)).toBe(true)
    expect(doc!.lines!.rows[0]).toEqual([1, 'dyeing', '₹60,000', '₹55,000'])
    expect(doc!.totals!.at(-1)).toEqual(['Variance', '₹45,000'])
  })

  it('cost-sheet: component lines + Total Cost/Selling Price totals', async () => {
    const doc = await PRINT_DOCS['cost-sheet']!(costSheetId)
    expect(doc!.docNo).toBe('v1')
    expect(doc!.meta!.some(([l, v]) => l === 'Order' && v === `PWO-${TS}`)).toBe(true)
    expect(doc!.lines!.rows[0]).toEqual(['Fabric Cost', '₹100'])
    expect(doc!.totals).toEqual([['Total Cost', '₹180'], ['Selling Price', '₹200']])
  })

  it('expense: EXPENSE VOUCHER with Paid To party + order meta', async () => {
    const doc = await PRINT_DOCS.expense!(EXP_NO)
    expect(doc!.title).toBe('EXPENSE VOUCHER')
    expect(doc!.party?.label).toBe('Paid To')
    expect(doc!.party?.name).toContain('WaveB Party')
    expect(doc!.meta!.some(([l, v]) => l === 'Order' && v === `PWO-${TS}`)).toBe(true)
    expect(doc!.totals!.at(-1)).toEqual(['Expense Amount', '₹3,400'])
  })

  it('cut-order: CUTTING ORDER with marker/plies/efficiency meta', async () => {
    const doc = await PRINT_DOCS['cut-order']!(CUT_NO)
    expect(doc!.title).toBe('CUTTING ORDER')
    expect(doc!.meta!.some(([l, v]) => l === 'Marker Length' && v === '12.5 m')).toBe(true)
    expect(doc!.meta!.some(([l, v]) => l === 'Efficiency' && v === '88.2%')).toBe(true)
    expect(doc!.totals!.at(-1)).toEqual(['Total Pcs', '500'])
  })

  it('gate-entry: IN gate → GATE ENTRY with party', async () => {
    const doc = await PRINT_DOCS['gate-entry']!(GE_NO)
    expect(doc!.title).toBe('GATE ENTRY')
    expect(doc!.docNo).toBe(GE_NO)
    expect(doc!.party?.label).toBe('Received From')
    expect(doc!.meta!.some(([l, v]) => l === 'Vehicle No' && v === 'TN33-B-5555')).toBe(true)
  })

  it('gate-pass: OUT gate → GATE PASS; wrong-type resolution → null', async () => {
    const doc = await PRINT_DOCS['gate-pass']!(GP_NO)
    expect(doc!.title).toBe('GATE PASS')
    expect(doc!.meta!.some(([l, v]) => l === 'Direction' && v === 'OUT')).toBe(true)
    // an IN entry must NOT resolve as a gate pass (and vice versa)
    expect(await PRINT_DOCS['gate-pass']!(GE_NO)).toBeNull()
    expect(await PRINT_DOCS['gate-entry']!(GP_NO)).toBeNull()
  })

  it('sample: SAMPLE CARD with buyer + status notes', async () => {
    const doc = await PRINT_DOCS.sample!(SMP_NO)
    expect(doc!.title).toBe('SAMPLE CARD')
    expect(doc!.party?.name).toContain('WaveB Buyer')
    expect(doc!.meta!.some(([l, v]) => l === 'Enquiry Ref' && v === `PWO-${TS}`)).toBe(true)
    expect(doc!.notes).toContain('Sample APPROVED for production.')
  })

  it('pcs-despatch: DESPATCH CHALLAN (PIECES) with line value + words', async () => {
    const doc = await PRINT_DOCS['pcs-despatch']!(DC_NO)
    expect(doc!.title).toBe('DESPATCH CHALLAN (PIECES)')
    expect(doc!.party?.label).toBe('Buyer')
    expect(doc!.lines!.rows[0][4]).toBe('200')
    expect(doc!.totals).toEqual([['Total Pcs', '300'], ['Total Value', '₹50,000']])
    expect(doc!.amountWords).toContain('Fifty Thousand')
  })

  it('packing-list: PACKING LIST with carton lines + kgs totals', async () => {
    const doc = await PRINT_DOCS['packing-list']!(PKL_NO)
    expect(doc!.title).toBe('PACKING LIST')
    expect(doc!.meta!.some(([l, v]) => l === 'Despatch DC' && v === DC_NO)).toBe(true)
    expect(doc!.lines!.rows[0][0]).toBe('CTN-1')
    expect(doc!.totals!.at(-1)).toEqual(['Net / Gross Kgs', '95.5 / 101.2'])
  })

  it('rejection: REJECTION NOTE with type/action meta', async () => {
    const doc = await PRINT_DOCS.rejection!(REJ_NO)
    expect(doc!.title).toBe('REJECTION NOTE')
    expect(doc!.meta!.some(([l, v]) => l === 'Rejection Type' && v === 'stitch fault')).toBe(true)
    expect(doc!.totals!.at(-1)).toEqual(['Rejected Qty', '12 pcs'])
  })

  it('production-entry: id-only resolution, rework=false title', async () => {
    const doc = await PRINT_DOCS['production-entry']!(prodId)
    expect(doc!.title).toBe('PRODUCTION ENTRY')
    expect(doc!.docNo).toBe(`PWO-${TS}/B1`)
    expect(doc!.meta!.some(([l, v]) => l === 'Operator' && v === `WaveB Operator ${TS} (BEM-${TS})`)).toBe(true)
    expect(doc!.totals!.at(-1)).toEqual(['Amount', '₹1,250'])
  })

  it('line-issue: LINE ISSUE SLIP with line code', async () => {
    const doc = await PRINT_DOCS['line-issue']!(ISS_NO)
    expect(doc!.title).toBe('LINE ISSUE SLIP')
    expect(doc!.meta!.some(([l, v]) => l === 'Line' && v === `BLN-${TS}`)).toBe(true)
    expect(doc!.totals!.at(-1)).toEqual(['Issued Qty', '250 pcs'])
  })

  it('lab-test: LAB TEST REPORT parses values JSON into parameter rows', async () => {
    const doc = await PRINT_DOCS['lab-test']!(LT_NO)
    expect(doc!.title).toBe('LAB TEST REPORT')
    expect(doc!.meta!.some(([l, v]) => l === 'Item' && v === 'FAB-01 (fabric)')).toBe(true)
    expect(doc!.lines!.rows).toContainEqual(['gsm', '182'])
    expect(doc!.totals).toEqual([['Result', 'Pass']])
  })

  it('id resolution also works for doc-no families (db id, not doc no)', async () => {
    expect((await PRINT_DOCS['debit-note']!(noteId))!.docNo).toBe(NOTE_NO)
    expect((await PRINT_DOCS['cut-order']!(cutId))!.docNo).toBe(CUT_NO)
    expect((await PRINT_DOCS['pcs-despatch']!(despatchId))!.docNo).toBe(DC_NO)
  })

  it('unknown id/doc-no → null (route 404s)', async () => {
    for (const t of WAVE_B_TYPES) {
      expect(await PRINT_DOCS[t]!('NOPE-404')).toBeNull()
    }
  })
})

/**
 * SPEC-M5 §12-1 — M5 Wave A doc parity (the P2 guarantee). The three NEW write
 * ops of Wave A must produce IDENTICAL rows through both doors:
 *   - create_budget            (agent tool vs planBudget service)
 *   - create_commercial_invoice (agent tool vs planExportInvoice service)
 *   - create_supplier_order    (agent tool vs planSupplierOrder service)
 * Plus: the invoice VARIANT configs' defaults injection (local → sales +
 * cgst_sgst; piece → jobwork) — the form-door side of the variant pattern (§4).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTool } from '@/lib/agent/tools'
import { db } from '@/lib/db'
import type { DocPlanResult } from '@/lib/erp/posting/types'
import { planBudget } from '@/lib/erp/posting/budget'
import { planExportInvoice } from '@/lib/erp/posting/invoice'
import { planSupplierOrder } from '@/lib/erp/posting/supplier-order'
import { commitDocAction } from '@/lib/erp/doc-actions'
import { localInvoiceConfig, pieceJobworkInvoiceConfig } from '@/lib/erp/doc-configs/invoice-variants'

const TS = Date.now()
const BUYER = 'B001'
const YARN = 'Y-30COT'
const SUPPLIER = 'SUP001'
const CUSTOMER = 'CUS001'

const ordA = `M5A-OA-${TS}`
const ordB = `M5A-OB-${TS}`
const ordC = `M5A-OC-${TS}`
const styA = `M5A-SA-${TS}`
const styB = `M5A-SB-${TS}`
const styC = `M5A-SC-${TS}`
const soA = `M5A-SOA-${TS}`   // supplier order (agent door)
const soB = `M5A-SOB-${TS}`   // supplier order (form door)
const invA = `M5A-EIA-${TS}`  // export invoice (agent door)
const invB = `M5A-EIB-${TS}`  // export invoice (form door)
const locInv = `M5A-LI-${TS}` // local-invoice variant form-door commit
const pcInv = `M5A-PI-${TS}`  // piece-jobwork variant form-door commit

async function agentDoor(toolName: string, args: Record<string, unknown>) {
  const tool = getTool(toolName)
  if (!tool) throw new Error(`tool ${toolName} not found`)
  const res = await tool.execute(args)
  if (!res.plan || !res.commit) throw new Error(`${toolName} agent door returned no plan: ${res.text}`)
  return res.commit()
}

async function formDoor(plan: (input: any) => Promise<DocPlanResult>, args: Record<string, unknown>) {
  const p = await plan(args)
  if (!p.ok) throw new Error(`form door plan failed: ${p.error}`)
  return p.commit()
}

function pick<T extends object>(row: T, keys: string[]) {
  const out: Record<string, unknown> = {}
  for (const k of keys) out[k] = (row as any)[k]
  return out
}

describe('M5 Wave A doc parity (SPEC-M5 §12-1)', () => {
  let orderIds: string[] = []
  let budgetIds: string[] = []

  beforeAll(async () => {
    const styles = await Promise.all([
      db.style.create({ data: { styleNo: styA, description: `M5A style A ${TS}` } }),
      db.style.create({ data: { styleNo: styB, description: `M5A style B ${TS}` } }),
      db.style.create({ data: { styleNo: styC, description: `M5A style C ${TS}` } }),
    ])
    const orders = []
    for (let i = 0; i < 3; i++) {
      const buyer = await db.buyer.findUnique({ where: { code: BUYER } })
      orders.push(await db.order.create({
        data: {
          orderNo: [ordA, ordB, ordC][i],
          buyerId: buyer!.id,
          styleId: styles[i].id,
          orderDate: new Date(),
          deliveryDate: new Date('2027-03-31'),
          finYear: '26-27',
          status: 'open',
          totalPcs: 10,
          totalValue: 1000,
        },
      }))
    }
    orderIds = orders.map((o) => o.id)
  })

  it('1. create_budget — both doors, identical Budget + lines', async () => {
    const lines = [
      { workId: `W1-${TS}`, amount: 600, actualAmount: 100 },
      { workId: `W2-${TS}`, amount: 400 },
    ]
    const a = await agentDoor('create_budget', { orderNo: ordA, amount: 1000, lines })
    const b = await formDoor(planBudget, { orderNo: ordB, amount: 1000, lines })
    const [bA, bB] = await Promise.all([
      db.budget.findUnique({ where: { id: a.id }, include: { BudgetLine: true } }),
      db.budget.findUnique({ where: { id: b.id }, include: { BudgetLine: true } }),
    ])
    budgetIds.push(a.id, b.id)
    expect(bA!.amount).toBe(1000)
    expect(pick(bA!, ['amount', 'finYear'])).toEqual(pick(bB!, ['amount', 'finYear']))
    expect(bA!.BudgetLine).toHaveLength(2)
    expect(bB!.BudgetLine).toHaveLength(2)
    const sortLines = (ls: Array<{ workId: string | null }>) =>
      [...ls].sort((x, y) => String(x.workId).localeCompare(String(y.workId)))
    expect(sortLines(bA!.BudgetLine).map((l) => pick(l, ['workId', 'amount', 'actualAmount'])))
      .toEqual(sortLines(bB!.BudgetLine).map((l) => pick(l, ['workId', 'amount', 'actualAmount'])))
  })

  it('2. budget service: orderNo XOR deptCode enforced', async () => {
    const neither = await planBudget({ amount: 500, lines: [{ amount: 500 }] } as any)
    expect(neither.ok).toBe(false)
    expect(neither.error).toContain('orderNo')
  })

  it('3. create_commercial_invoice — both doors, identical export invoices', async () => {
    const a = await agentDoor('create_commercial_invoice', {
      invoiceNo: invA, orderNo: ordA, partyCode: CUSTOMER, totalQty: 10,
      taxableValue: 5000, gstRate: 0, ern: `ERN-${TS}`,
    })
    const b = await formDoor(planExportInvoice, {
      invoiceNo: invB, orderNo: ordB, partyCode: CUSTOMER, totalQty: 10,
      taxableValue: 5000, gstRate: 0, ern: `ERN-${TS}`,
    })
    const [iA, iB] = await Promise.all([
      db.salesInvoice.findUnique({ where: { invoiceNo: invA } }),
      db.salesInvoice.findUnique({ where: { invoiceNo: invB } }),
    ])
    expect(iA!.invoiceType).toBe('export')
    expect(iB!.invoiceType).toBe('export')
    expect(iA!.ern).toBe(`ERN-${TS}`)
    expect(pick(iA!, ['invoiceType', 'billType', 'totalQty', 'taxableValue', 'cgstRate', 'sgstRate', 'igstRate', 'cgstAmt', 'sgstAmt', 'igstAmt', 'billAmount', 'status']))
      .toEqual(pick(iB!, ['invoiceType', 'billType', 'totalQty', 'taxableValue', 'cgstRate', 'sgstRate', 'igstRate', 'cgstAmt', 'sgstAmt', 'igstAmt', 'billAmount', 'status']))
    expect(iA!.billAmount).toBe(5000) // zero-rated export
    expect(a.billAmount).toBe(5000)
  })

  it('4. create_supplier_order — both doors, identical POs with poType=general', async () => {
    const poLines = [{ itemType: 'yarn', itemCode: YARN, qty: 5, rate: 320 }]
    const a = await agentDoor('create_supplier_order', {
      poNo: soA, partyCode: SUPPLIER, deliveryDate: '2027-04-30', lines: poLines,
    })
    const b = await formDoor(planSupplierOrder, {
      poNo: soB, partyCode: SUPPLIER, deliveryDate: '2027-04-30', lines: poLines,
    })
    const [pA, pB] = await Promise.all([
      db.purchaseOrder.findUnique({ where: { poNo: soA }, include: { lines: true } }),
      db.purchaseOrder.findUnique({ where: { poNo: soB }, include: { lines: true } }),
    ])
    expect(pA!.poType).toBe('general') // the variant default injected
    expect(pB!.poType).toBe('general')
    expect(pick(pA!, ['poType', 'totalQty', 'totalValue', 'status']))
      .toEqual(pick(pB!, ['poType', 'totalQty', 'totalValue', 'status']))
    expect(pA!.totalQty).toBe(5)
    expect(pA!.lines).toHaveLength(1)
    expect(b.poNo).toBe(soB) // PO commit returns { id, poNo }
    // both doors auto-submit PO approvals (planPurchaseOrder behavior)
    const approvals = await db.approval.findMany({ where: { entity: 'po', entityId: { in: [pA!.id, pB!.id] } } })
    expect(approvals.length).toBe(2)
  })

  it('5. local-invoice variant: form door injects billType=sales + gstType default (cgst_sgst)', async () => {
    // DocScreen payload shape: header strings; readonly billType skipped by coerce
    const res = await commitDocAction('local-invoice', {
      header: {
        invoiceNo: locInv, orderNo: ordC, partyCode: CUSTOMER,
        totalQty: '5', taxableValue: '2000', gstRate: '5',
      },
    })
    expect(res.ok).toBe(true)
    const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: locInv } })
    expect(inv!.billType).toBe('sales')
    expect(inv!.cgstRate).toBe(2.5) // cgst_sgst split
    expect(inv!.sgstRate).toBe(2.5)
    expect(inv!.igstRate).toBe(0)
    expect(inv!.invoiceType).toBe('domestic')
  })

  it('6. piece-jobwork variant: form door injects billType=jobwork', async () => {
    const res = await commitDocAction('piece-jobwork-invoice', {
      header: {
        invoiceNo: pcInv, orderNo: ordC, partyCode: CUSTOMER,
        totalQty: '50', taxableValue: '1500', gstRate: '5', gstType: 'igst',
      },
    })
    expect(res.ok).toBe(true)
    const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: pcInv } })
    expect(inv!.billType).toBe('jobwork')
    expect(inv!.igstRate).toBe(5)
  })

  it('7. variant configs delegate to the base service (no forks — §4 rule 1 source pin)', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync('src/lib/erp/doc-configs/invoice-variants.ts', 'utf8')
    expect(src).toContain('planInvoice')
    const supplierSrc = fs.readFileSync('src/lib/erp/doc-configs/supplier-order.ts', 'utf8')
    expect(supplierSrc).toContain('planSupplierOrder')
    // schemas relax ONLY the injected key
    const localParsed = localInvoiceConfig.schema.safeParse({
      orderNo: 'X', partyCode: 'P', totalQty: 1, taxableValue: 1, gstRate: 5, gstType: 'cgst_sgst',
    })
    expect(localParsed.success).toBe(true) // billType absent → ok
    const pieceParsed = pieceJobworkInvoiceConfig.schema.safeParse({
      orderNo: 'X', partyCode: 'P', totalQty: 1, taxableValue: 1, gstRate: 5, gstType: 'igst',
    })
    expect(pieceParsed.success).toBe(true)
  })

  afterAll(async () => {
    const sw = (p: Promise<unknown>) => p.catch(() => {})
    await sw(db.salesInvoice.deleteMany({ where: { invoiceNo: { in: [invA, invB, locInv, pcInv] } } }))
    // budgets + lines (lines cascade? no — delete lines first)
    const budgets = budgetIds.length ? await db.budget.findMany({ where: { id: { in: budgetIds } }, include: { BudgetLine: true } }) : []
    for (const b of budgets) {
      await sw(db.budgetLine.deleteMany({ where: { budgetId: b.id } }))
    }
    await sw(db.budget.deleteMany({ where: { orderId: { in: orderIds } } }))
    // supplier orders share the PO space (+ their auto-submitted approvals)
    const pos = await db.purchaseOrder.findMany({ where: { poNo: { in: [soA, soB] } } })
    for (const p of pos) {
      await sw(db.approval.deleteMany({ where: { entity: 'po', entityId: p.id } }))
      await sw(db.pOLine.deleteMany({ where: { poId: p.id } }))
      await sw(db.purchaseOrder.deleteMany({ where: { id: p.id } }))
    }
    // orders + styles
    await sw(db.order.deleteMany({ where: { id: { in: orderIds } } }))
    await sw(db.style.deleteMany({ where: { styleNo: { in: [styA, styB, styC] } } }))
  })
})

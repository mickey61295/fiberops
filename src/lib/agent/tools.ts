/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'

// ============== Agent Tool Registry ==============
// Each tool has: name, description, parameters (zod), execute function.
// Read tools return data directly. Write tools return a "plan" (proposed mutations)
// that the user must approve before commit.

import { z } from 'zod'
import { listUploadDir, extractDocument } from './docExtract'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { buildMasterSchema, planMasterCreate, planMasterUpdate } from '@/lib/erp/posting/master-service'

export type ToolResult = {
  text?: string
  json?: any
  // For write tools: proposed mutations; if present, the UI shows an approval card.
  plan?: {
    summary: string
    creates?: Array<{ table: string; data: any }>
    updates?: Array<{ table: string; id: string; data: any }>
    sideEffects?: string[]
    approvalId?: string
  }
  // For commit step: actually persist
  commit?: () => Promise<any>
}

export interface AgentTool {
  name: string
  description: string
  domain: string
  isWrite: boolean
  schema: z.ZodObject<any, any>
  execute: (args: any) => Promise<ToolResult>
}

// helper to safely query masters
async function listAll(model: string, where: any = {}) {
  const m = (db as any)[model]
  if (!m) throw new Error('Unknown model: ' + model)
  // Try orderBy code first, fallback to no orderBy
  try {
    return await m.findMany({ where, take: 100, orderBy: { code: 'asc' } })
  } catch {
    try {
      return await m.findMany({ where, take: 100 })
    } catch {
      return []
    }
  }
}

// ───────────── Stock posting helpers (industry chain) ─────────────
// SQLite gotcha (learned the hard way): NULL ≠ '' inside composite unique keys,
// so CurrentStock buckets MUST be matched with explicit nulls, never loose
// equality. findFirst with a fully-normalized key, then update by row id.

type StockKey = {
  itemType: string
  itemId: string
  godownId: string
  lotId?: string | null
  colourId?: string | null
  sizeId?: string | null
  deptId?: string | null
  orderId?: string | null
}

function normalizedStockKey(k: StockKey) {
  return {
    itemType: k.itemType,
    itemId: k.itemId,
    godownId: k.godownId,
    lotId: k.lotId ?? null,
    colourId: k.colourId ?? null,
    sizeId: k.sizeId ?? null,
    deptId: k.deptId ?? null,
    orderId: k.orderId ?? null,
  }
}

/** Increment/decrement a CurrentStock bucket (negative deltas allowed — the ERP
 *  warns on negative stock but never blocks, matching legacy Fiberpro). */
async function bumpStock(tx: any, k: StockKey, delta: { pcs?: number; kgs?: number; mtrs?: number; bags?: number; rate?: number }) {
  const key = normalizedStockKey(k)
  const existing = await tx.currentStock.findFirst({ where: key })
  if (existing) {
    await tx.currentStock.update({
      where: { id: existing.id },
      data: {
        pcs: { increment: delta.pcs || 0 },
        kgs: { increment: delta.kgs || 0 },
        mtrs: { increment: delta.mtrs || 0 },
        bags: { increment: delta.bags || 0 },
      },
    })
    return existing.id
  }
  const created = await tx.currentStock.create({
    data: { ...key, pcs: delta.pcs || 0, kgs: delta.kgs || 0, mtrs: delta.mtrs || 0, bags: delta.bags || 0, rate: delta.rate || 0 },
  })
  return created.id
}

/** Write one StockLedger movement row + bump CurrentStock, inside a transaction. */
async function postLedger(tx: any, m: {
  txnType: string
  itemType: string
  itemId: string
  godownId?: string
  deptId?: string | null
  orderId?: string | null
  docNo?: string
  docDate?: Date
  partyId?: string | null
  in?: { pcs?: number; kgs?: number; mtrs?: number; bags?: number }
  out?: { pcs?: number; kgs?: number; mtrs?: number; bags?: number }
  rate?: number
  notes?: string
}) {
  const finYear = '26-27'
  const row = await tx.stockLedger.create({
    data: {
      txnType: m.txnType,
      itemType: m.itemType,
      itemId: m.itemId,
      godownId: m.godownId ?? null,
      deptId: m.deptId ?? null,
      orderId: m.orderId ?? null,
      docNo: m.docNo ?? null,
      docDate: m.docDate ?? new Date(),
      finYear,
      partyId: m.partyId ?? null,
      inPcs: m.in?.pcs || 0, inKgs: m.in?.kgs || 0, inMtrs: m.in?.mtrs || 0, inBags: m.in?.bags || 0,
      outPcs: m.out?.pcs || 0, outKgs: m.out?.kgs || 0, outMtrs: m.out?.mtrs || 0, outBags: m.out?.bags || 0,
      rate: m.rate || 0,
      notes: m.notes ?? null,
    },
  })
  if (m.godownId) {
    // NOTE: the CurrentStock bucket key is (itemType, itemId, godownId) with
    // all other dims NULL. deptId/orderId live on the LEDGER row for reporting,
    // but must NOT fragment the stock bucket — otherwise the cut-in (dept null)
    // and line-out (dept D4) legs land in different buckets and never net out.
    await bumpStock(tx, {
      itemType: m.itemType, itemId: m.itemId, godownId: m.godownId,
      deptId: null, orderId: null,
    }, {
      pcs: (m.in?.pcs || 0) - (m.out?.pcs || 0),
      kgs: (m.in?.kgs || 0) - (m.out?.kgs || 0),
      mtrs: (m.in?.mtrs || 0) - (m.out?.mtrs || 0),
      bags: (m.in?.bags || 0) - (m.out?.bags || 0),
    })
  }
  return row.id
}

/** Next free sequential document number, e.g. nextNumber('cutOrder', 'cutNo', 'CUT-') → CUT-0007. */
async function nextNumber(model: string, field: string, prefix: string, pad = 4): Promise<string> {
  const m = (db as any)[model]
  const all = await m.findMany({ where: { [field]: { startsWith: prefix } } , select: { [field]: true } })
  const used = new Set(all.map((r: any) => r[field]))
  let n = 1
  while (used.has(`${prefix}${String(n).padStart(pad, '0')}`)) n++
  return `${prefix}${String(n).padStart(pad, '0')}`
}

/** Resolve a document number: honour an explicit user-supplied value if free, else auto-assign. */
async function resolveDocNo(model: string, field: string, prefix: string, desired?: string): Promise<string> {
  if (desired?.trim()) {
    const m = (db as any)[model]
    const exists = await m.findUnique({ where: { [field]: desired.trim() } }).catch(() => null)
    if (!exists) return desired.trim()
  }
  return nextNumber(model, field, prefix)
}

// Stage → department code mapping (Tirupur knitwear chain).
const STAGE_DEPT: Record<string, string> = {
  knitting: 'D1', dyeing: 'D2', printing: 'D2', embroidery: 'D2',
  cutting: 'D3', sewing: 'D4', finishing: 'D5', packing: 'D6',
}


// ───────────── READ TOOLS ─────────────

const readTools: AgentTool[] = [
  {
    name: 'list_orders',
    description: 'List sales orders. Optional filter by status (open|in_progress|completed|cancelled) or buyerId.',
    domain: 'orders',
    isWrite: false,
    schema: z.object({
      status: z.string().optional().describe('Filter by status'),
      buyerId: z.string().optional(),
      limit: z.number().optional().default(50),
    }),
    async execute(args) {
      const orders = await db.order.findMany({
        where: { status: args.status },
        take: args.limit,
        orderBy: { orderDate: 'desc' },
        include: { buyer: true, style: true },
      })
      return {
        text: `Found ${orders.length} orders.`,
        json: orders.map((o) => ({
          id: o.id, orderNo: o.orderNo, buyer: o.buyer?.name, style: o.style?.styleNo,
          totalPcs: o.totalPcs, totalValue: o.totalValue, status: o.status,
          deliveryDate: o.deliveryDate, orderDate: o.orderDate,
        })),
      }
    },
  },
  {
    name: 'get_order',
    description: 'Get a single sales order by orderNo (e.g. SO-1001) including all order lines.',
    domain: 'orders',
    isWrite: false,
    schema: z.object({
      orderNo: z.string().describe('Order number like SO-1001'),
    }),
    async execute(args) {
      const order = await db.order.findUnique({
        where: { orderNo: args.orderNo },
        include: {
          buyer: true, style: true,
          lines: { include: { style: true, colour: true, size: true } },
          poLines: true, cutOrders: { include: { bundles: true } },
          productionEntries: true, salesInvoices: true, costSheet: true,
        },
      })
      if (!order) return { text: `Order ${args.orderNo} not found.` }
      return { text: `Order ${order.orderNo} for ${order.buyer?.name}`, json: order }
    },
  },
  {
    name: 'list_purchase_orders',
    description: 'List purchase orders. Optional filter by status (open|partial|received|cancelled) or poType (yarn|fabric|accessory|general).',
    domain: 'procurement',
    isWrite: false,
    schema: z.object({
      status: z.string().optional(),
      poType: z.string().optional(),
    }),
    async execute(args) {
      const pos = await db.purchaseOrder.findMany({
        where: { status: args.status, poType: args.poType },
        orderBy: { orderDate: 'desc' },
        take: 50,
        include: { party: true, lines: true },
      })
      return {
        text: `Found ${pos.length} purchase orders.`,
        json: pos.map((p) => ({
          id: p.id, poNo: p.poNo, poType: p.poType, party: p.party?.name,
          orderDate: p.orderDate, deliveryDate: p.deliveryDate, status: p.status,
          totalQty: p.totalQty, totalValue: p.totalValue, lines: p.lines.length,
        })),
      }
    },
  },
  {
    name: 'get_purchase_order',
    description: 'Get a single PO by poNo with all lines.',
    domain: 'procurement',
    isWrite: false,
    schema: z.object({ poNo: z.string() }),
    async execute(args) {
      const po = await db.purchaseOrder.findUnique({
        where: { poNo: args.poNo },
        include: { party: true, lines: true, grns: { include: { lines: true } } },
      })
      if (!po) return { text: `PO ${args.poNo} not found.` }
      return { text: `PO ${po.poNo} - ${po.party?.name} - ${po.status}`, json: po }
    },
  },
  {
    name: 'get_stock',
    description: 'Get current stock by godown code (G1=Main, G2=FG, G3=Jobworker). Optional itemType filter (yarn|fabric|accessory|pcs).',
    domain: 'inventory',
    isWrite: false,
    schema: z.object({
      godownCode: z.string().optional().describe('Godown code. Defaults to all godowns.'),
      itemType: z.string().optional().describe('yarn|fabric|accessory|pcs'),
    }),
    async execute(args) {
      const where: any = {}
      if (args.itemType) where.itemType = args.itemType
      if (args.godownCode) {
        const g = await db.godown.findUnique({ where: { code: args.godownCode } })
        if (g) where.godownId = g.id
      }
      const stocks = await db.currentStock.findMany({
        where,
        include: { godown: true, colour: true, size: true, department: true },
      })
      return {
        text: `Found ${stocks.length} stock entries.`,
        json: stocks.map((s) => ({
          itemType: s.itemType,
          itemId: s.itemId,
          godown: s.godown?.code, dept: s.department?.code,
          kgs: s.kgs, mtrs: s.mtrs, pcs: s.pcs, bags: s.bags, rate: s.rate,
        })),
      }
    },
  },
  {
    name: 'get_stock_ledger',
    description: 'Get the stock ledger (all transactions) optionally filtered by item type, godown or date range.',
    domain: 'inventory',
    isWrite: false,
    schema: z.object({
      itemType: z.string().optional(),
      godownCode: z.string().optional(),
      limit: z.number().optional().default(50),
    }),
    async execute(args) {
      const where: any = {}
      if (args.itemType) where.itemType = args.itemType
      if (args.godownCode) {
        const g = await db.godown.findUnique({ where: { code: args.godownCode } })
        if (g) where.godownId = g.id
      }
      const ledger = await db.stockLedger.findMany({
        where, take: args.limit, orderBy: { docDate: 'desc' },
        include: { godown: true, party: true },
      })
      return {
        text: `Found ${ledger.length} ledger entries.`,
        json: ledger.map((l) => ({
          txnType: l.txnType, itemType: l.itemType,
          inKgs: l.inKgs, outKgs: l.outKgs, inPcs: l.inPcs, outPcs: l.outPcs,
          rate: l.rate, docNo: l.docNo, docDate: l.docDate,
          godown: l.godown?.code, party: l.party?.name,
        })),
      }
    },
  },
  {
    name: 'list_cut_orders',
    description: 'List cut orders with bundle counts.',
    domain: 'cutting',
    isWrite: false,
    schema: z.object({ status: z.string().optional() }),
    async execute(args) {
      const cuts = await db.cutOrder.findMany({
        where: { status: args.status },
        include: { order: { include: { buyer: true } }, bundles: true },
        orderBy: { cutDate: 'desc' },
      })
      return {
        text: `Found ${cuts.length} cut orders.`,
        json: cuts.map((c) => ({
          cutNo: c.cutNo, orderNo: c.order?.orderNo, buyer: c.order?.buyer?.name,
          cutDate: c.cutDate, fabricIssued: c.fabricIssued, totalPcs: c.totalPcs,
          bundles: c.bundles.length, status: c.status, efficiency: c.efficiency,
        })),
      }
    },
  },
  {
    name: 'get_line_status',
    description: 'Get production status by line/department for a given order (or all open orders).',
    domain: 'production',
    isWrite: false,
    schema: z.object({
      orderNo: z.string().optional().describe('Specific order number. If omitted, summarize all open orders.'),
    }),
    async execute(args) {
      if (args.orderNo) {
        const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
        if (!order) return { text: `Order ${args.orderNo} not found` }
        const entries = await db.productionEntry.findMany({
          where: { orderId: order.id },
          include: { operator: true, department: true },
          orderBy: { prodDate: 'desc' },
        })
        const totalPcs = entries.reduce((s, e) => s + e.qty, 0)
        return {
          text: `Production for ${args.orderNo}: ${totalPcs} pcs across ${entries.length} entries.`,
          json: {
            orderNo: order.orderNo, totalOrdered: order.totalPcs, totalProduced: totalPcs,
            balance: order.totalPcs - totalPcs,
            byDepartment: groupBy(entries, 'department.code'),
            recentEntries: entries.slice(0, 10).map((e) => ({
              date: e.prodDate, dept: e.department?.code, operator: e.operator?.name,
              bundle: e.bundleNo, qty: e.qty, rework: e.rework,
            })),
          },
        }
      }
      // All open orders summary
      const orders = await db.order.findMany({
        where: { status: { in: ['open', 'in_progress'] } },
        include: { _count: { select: { productionEntries: true } } },
      })
      const result: Array<{ orderNo: string; ordered: number; produced: number; balance: number; deliveryDate: Date | null }> = []
      for (const o of orders) {
        const entries = await db.productionEntry.findMany({
          where: { orderId: o.id }, select: { qty: true }
        })
        const produced = entries.reduce((s, e) => s + e.qty, 0)
        result.push({
          orderNo: o.orderNo, ordered: o.totalPcs, produced, balance: o.totalPcs - produced,
          deliveryDate: o.deliveryDate,
        })
      }
      return {
        text: `${result.length} open orders with production tracking.`,
        json: result,
      }
    },
  },
  {
    name: 'list_invoices',
    description: 'List sales invoices. Optional filter by status (draft|issued|paid|cancelled) or invoiceType (domestic|export).',
    domain: 'accounting',
    isWrite: false,
    schema: z.object({
      status: z.string().optional(),
      invoiceType: z.string().optional(),
    }),
    async execute(args) {
      const invs = await db.salesInvoice.findMany({
        where: { status: args.status, invoiceType: args.invoiceType },
        include: { party: true, order: true },
        orderBy: { invoiceDate: 'desc' },
      })
      return {
        text: `Found ${invs.length} invoices.`,
        json: invs.map((i) => ({
          invoiceNo: i.invoiceNo, party: i.party?.name, order: i.order?.orderNo,
          billAmount: i.billAmount, taxable: i.taxableValue,
          igst: i.igstAmt, cgst: i.cgstAmt, sgst: i.sgstAmt,
          status: i.status, date: i.invoiceDate,
        })),
      }
    },
  },
  {
    name: 'get_party_ledger',
    description: 'Get party ledger (invoices + journals) by party code.',
    domain: 'accounting',
    isWrite: false,
    schema: z.object({ partyCode: z.string() }),
    async execute(args) {
      const party = await db.party.findUnique({ where: { code: args.partyCode } })
      if (!party) return { text: `Party ${args.partyCode} not found` }
      const [invoices, journals, debitNotes] = await Promise.all([
        db.salesInvoice.findMany({ where: { partyId: party.id } }),
        db.journal.findMany({ where: { partyId: party.id } }),
        db.debitNote.findMany({ where: { partyId: party.id } }),
      ])
      const totalBilled = invoices.reduce((s, i) => s + i.billAmount, 0)
      const totalDebit = debitNotes.reduce((s, d) => s + d.amount, 0)
      const totalJournal = journals.reduce((s, j) => s + j.amount, 0)
      return {
        text: `Party ${party.name}: billed=${totalBilled}, debit notes=${totalDebit}, journals=${totalJournal}`,
        json: {
          party: { code: party.code, name: party.name, opening: party.openingBalance },
          invoices: invoices.length, totalBilled, totalDebit, totalJournal,
          recentInvoices: invoices.slice(0, 5).map((i) => ({
            invoiceNo: i.invoiceNo, date: i.invoiceDate, amount: i.billAmount, status: i.status,
          })),
        },
      }
    },
  },
  {
    name: 'list_parties',
    description: 'List parties (suppliers/customers). Optional filter by partyType (supplier|customer|both).',
    domain: 'masters',
    isWrite: false,
    schema: z.object({ partyType: z.string().optional() }),
    async execute(args) {
      const parties = await db.party.findMany({
        where: args.partyType ? { partyType: args.partyType } : {},
        orderBy: { name: 'asc' },
      })
      return {
        text: `Found ${parties.length} parties.`,
        json: parties.map((p) => ({
          code: p.code, name: p.name, partyType: p.partyType, gstin: p.gstin, city: p.city, state: p.state,
        })),
      }
    },
  },
  {
    name: 'list_buyers',
    description: 'List buyers.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const buyers = await db.buyer.findMany()
      return { text: `${buyers.length} buyers`, json: buyers }
    },
  },
  {
    name: 'list_styles',
    description: 'List styles with their buyer.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const styles = await db.style.findMany({ include: { buyer: true } })
      return { text: `${styles.length} styles`, json: styles.map((s) => ({
        styleNo: s.styleNo, description: s.description, buyer: s.buyer?.name, sam: s.sam, hsn: s.hsn,
      })) }
    },
  },
  {
    name: 'list_fabrics',
    description: 'List fabric masters.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const f = await listAll('fabric')
      return { text: `${f.length} fabrics`, json: f }
    },
  },
  {
    name: 'list_yarns',
    description: 'List yarn masters.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const y = await listAll('yarn')
      return { text: `${y.length} yarns`, json: y }
    },
  },
  {
    name: 'list_accessories',
    description: 'List accessory masters.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const a = await listAll('accessory')
      return { text: `${a.length} accessories`, json: a }
    },
  },
  {
    name: 'list_godowns',
    description: 'List godowns (warehouses).',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const g = await db.godown.findMany()
      return { text: `${g.length} godowns`, json: g }
    },
  },
  {
    name: 'list_departments',
    description: 'List departments.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const d = await db.department.findMany({ orderBy: { orderSno: 'asc' } })
      return { text: `${d.length} departments`, json: d }
    },
  },
  {
    name: 'get_cost_sheet',
    description: 'Get cost sheet for an order by orderNo.',
    domain: 'costing',
    isWrite: false,
    schema: z.object({ orderNo: z.string() }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const cs = await db.costSheet.findFirst({
        where: { orderId: order.id }, orderBy: { version: 'desc' },
      })
      if (!cs) return { text: `No cost sheet for ${args.orderNo}` }
      const margin = cs.sellingPrice - cs.totalCost
      return {
        text: `Cost sheet for ${args.orderNo}: cost=${cs.totalCost}, sell=${cs.sellingPrice}, margin=${margin}`,
        json: { ...cs, margin, marginPct: cs.sellingPrice ? (margin / cs.sellingPrice) * 100 : 0 },
      }
    },
  },
  {
    name: 'get_budget_vs_actual',
    description: 'Get budget vs actual for an order (PO + production cost).',
    domain: 'costing',
    isWrite: false,
    schema: z.object({ orderNo: z.string() }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const [poLines, prodEntries, costs] = await Promise.all([
        db.pOLine.findMany({ where: { orderId: order.id } }),
        db.productionEntry.findMany({ where: { orderId: order.id } }),
        db.costSheet.findMany({ where: { orderId: order.id } }),
      ])
      const poValue = poLines.reduce((s, p) => s + (p.qty * p.rate), 0)
      const prodCost = prodEntries.reduce((s, e) => s + e.amount, 0)
      const shiftWages = prodEntries.reduce((s, e) => s + e.shiftWages, 0)
      const budgetedCost = costs.reduce((s, c) => s + c.totalCost, 0)
      const actualCost = poValue + prodCost + shiftWages
      return {
        text: `${args.orderNo}: budgeted=${budgetedCost}, actual=${actualCost}, variance=${budgetedCost - actualCost}`,
        json: {
          orderNo: args.orderNo,
          budget: { total: budgetedCost, poBudget: poValue, prodBudget: prodCost },
          actual: { total: actualCost, poValue, prodCost, shiftWages },
          variance: budgetedCost - actualCost,
          pctVariance: budgetedCost ? ((budgetedCost - actualCost) / budgetedCost) * 100 : 0,
        },
      }
    },
  },
  {
    name: 'get_pending_approvals',
    description: 'Get all pending approvals (PO/invoice/etc waiting for sign-off).',
    domain: 'workflow',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const approvals = await db.approval.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
      })
      const enriched = await Promise.all(approvals.map(async (a) => {
        let entity: any = null
        if (a.entity === 'po') {
          entity = await db.purchaseOrder.findUnique({
            where: { id: a.entityId }, include: { party: true, lines: true },
          })
        }
        return { ...a, entity }
      }))
      return {
        text: `${enriched.length} pending approvals.`,
        json: enriched,
      }
    },
  },
  {
    name: 'list_employees',
    description: 'List employees with their department.',
    domain: 'hr',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const emps = await db.employee.findMany({ include: { department: true } })
      return {
        text: `${emps.length} employees`,
        json: emps.map((e) => ({
          code: e.code, name: e.name, dept: e.department?.name, role: e.role,
          pieceRate: e.pieceRate, dailyWage: e.dailyWage, active: e.active,
        })),
      }
    },
  },
  {
    name: 'get_dashboard_kpis',
    description: 'Get dashboard KPIs: open orders, pending POs, stock value, production today, pending approvals.',
    domain: 'meta',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const [openOrders, pendingPos, totalStock, todayProduction, pendingApprovals, openInvoices] = await Promise.all([
        db.order.count({ where: { status: { in: ['open', 'in_progress'] } } }),
        db.purchaseOrder.count({ where: { status: { in: ['open', 'partial'] } } }),
        db.currentStock.findMany(),
        db.productionEntry.findMany({
          where: { prodDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        }),
        db.approval.count({ where: { status: 'pending' } }),
        db.salesInvoice.count({ where: { status: 'issued' } }),
      ])
      const stockValue = totalStock.reduce((s, st) => {
        const v = (st.kgs + st.mtrs + st.pcs) * st.rate
        return s + v
      }, 0)
      const todayPcs = todayProduction.reduce((s, e) => s + e.qty, 0)
      return {
        text: `Dashboard: ${openOrders} open orders, ${pendingPos} pending POs, stock value ₹${stockValue.toFixed(0)}, ${todayPcs} pcs produced today, ${pendingApprovals} pending approvals, ${openInvoices} open invoices.`,
        json: {
          openOrders, pendingPos, stockValue, todayPcs, pendingApprovals, openInvoices,
        },
      }
    },
  },
  {
    name: 'summarize_open_orders',
    description: 'Summarize all open orders with buyer, style, qty, value, delivery.',
    domain: 'meta',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const orders = await db.order.findMany({
        where: { status: { in: ['open', 'in_progress'] } },
        include: { buyer: true, style: true, lines: true },
        orderBy: { deliveryDate: 'asc' },
      })
      const totalPcs = orders.reduce((s, o) => s + o.totalPcs, 0)
      const totalValue = orders.reduce((s, o) => s + o.totalValue, 0)
      return {
        text: `${orders.length} open orders, ${totalPcs} pcs total, ₹${totalValue.toLocaleString('en-IN')} total value.`,
        json: {
          summary: { count: orders.length, totalPcs, totalValue },
          orders: orders.map((o) => ({
            orderNo: o.orderNo, buyer: o.buyer?.name, style: o.style?.styleNo,
            totalPcs: o.totalPcs, totalValue: o.totalValue, deliveryDate: o.deliveryDate,
            status: o.status,
          })),
        },
      }
    },
  },

  // ───────────── ADDITIONAL READ TOOLS FOR MASTERS ─────────────
  // These exist so the agent can list/inspect UOMs, colours, sizes, lots, etc.
  // before calling create_yarn / create_fabric / create_accessory / create_order.

  {
    name: 'list_uoms',
    description: 'List all units of measure (KGS, MTR, PCS, BAG...). Use this before create_yarn / create_fabric / create_accessory to find the right uomCode.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const uoms = await db.uOM.findMany({ orderBy: { code: 'asc' } })
      return {
        text: `${uoms.length} UOMs`,
        json: uoms.map((u) => ({ code: u.code, name: u.name })),
      }
    },
  },
  {
    name: 'list_colours',
    description: 'List all colour masters.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const cols = await db.colour.findMany({ orderBy: { code: 'asc' } })
      return {
        text: `${cols.length} colours`,
        json: cols.map((c) => ({ code: c.code, name: c.name })),
      }
    },
  },
  {
    name: 'list_sizes',
    description: 'List all size masters.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const sz = await db.size.findMany({ orderBy: { sort: 'asc' } })
      return {
        text: `${sz.length} sizes`,
        json: sz.map((s) => ({ name: s.name, sort: s.sort })),
      }
    },
  },
  {
    name: 'list_dias',
    description: 'List all knitting machine dias (e.g. 30, 34).',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const ds = await db.dia.findMany()
      return {
        text: `${ds.length} dias`,
        json: ds.map((d) => ({ value: d.value })),
      }
    },
  },
  {
    name: 'list_lots',
    description: 'List all fabric/yarn lots with party.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const ls = await db.lot.findMany({ include: { party: true }, orderBy: { lotNo: 'asc' } })
      return {
        text: `${ls.length} lots`,
        json: ls.map((l) => ({ lotNo: l.lotNo, party: l.party?.name })),
      }
    },
  },
  {
    name: 'list_seasons',
    description: 'List all seasons.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const ss = await db.season.findMany()
      return {
        text: `${ss.length} seasons`,
        json: ss.map((s) => ({ code: s.code, name: s.name, startDate: s.startDate, endDate: s.endDate })),
      }
    },
  },
  {
    name: 'list_merchandisers',
    description: 'List all merchandisers.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const ms = await db.merchandiser.findMany()
      return {
        text: `${ms.length} merchandisers`,
        json: ms.map((m) => ({ name: m.name, email: m.email, phone: m.phone })),
      }
    },
  },
  {
    name: 'list_exporters',
    description: 'List all exporters (the exporting entities).',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const es = await db.exporter.findMany()
      return {
        text: `${es.length} exporters`,
        json: es.map((e) => ({ code: e.code, name: e.name, iec: e.iec, gstin: e.gstin })),
      }
    },
  },
  {
    name: 'list_lines',
    description: 'List all production lines with department and capacity.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const ls = await db.line.findMany({ include: { department: true } })
      return {
        text: `${ls.length} production lines`,
        json: ls.map((l) => ({ code: l.code, name: l.name, dept: l.department?.name, capacityPcsPerHour: l.capacityPcsPerHour })),
      }
    },
  },
  {
    name: 'list_fin_years',
    description: 'List all financial years with active flag.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const fs = await db.finYear.findMany({ orderBy: { code: 'desc' } })
      return {
        text: `${fs.length} financial years`,
        json: fs.map((f) => ({ code: f.code, name: f.name, start: f.start, end: f.end, active: f.active })),
      }
    },
  },
  {
    name: 'list_jobworks',
    description: 'List all jobwork DCs (material sent out to washing/dyeing/printing/embroidery). Filter by status with optional status arg.',
    domain: 'production',
    isWrite: false,
    schema: z.object({
      status: z.string().optional().describe('sent | received | billed'),
    }),
    async execute(args) {
      const jws = await db.jobworkOrder.findMany({
        where: args.status ? { status: args.status } : {},
        orderBy: { outDate: 'desc' },
        take: 50,
      })
      // Resolve jobworker party + order via separate lookups (schema declares plain FKs, not relations)
      const partyIds = [...new Set(jws.map((j) => j.jobworkerId))]
      const orderIds = [...new Set(jws.map((j) => j.orderId).filter(Boolean) as string[])]
      const [parties, orders] = await Promise.all([
        partyIds.length ? db.party.findMany({ where: { id: { in: partyIds } } }) : Promise.resolve([] as Awaited<ReturnType<typeof db.party.findMany>>),
        orderIds.length ? db.order.findMany({ where: { id: { in: orderIds } } }) : Promise.resolve([] as Awaited<ReturnType<typeof db.order.findMany>>),
      ])
      const partyMap = new Map(parties.map((p) => [p.id, p]))
      const orderMap = new Map(orders.map((o) => [o.id, o]))
      return {
        text: `${jws.length} jobwork DCs`,
        json: jws.map((j) => ({ dcNo: j.dcNo, jobworker: partyMap.get(j.jobworkerId)?.name, processType: j.processType, totalQty: j.totalQty, totalValue: j.totalValue, status: j.status, orderNo: j.orderId ? orderMap.get(j.orderId)?.orderNo : null, outDate: j.outDate, expectedInDate: j.expectedInDate, receivedDate: j.receivedDate })),
      }
    },
  },
  {
    name: 'list_despatches',
    description: 'List all finished-goods despatches (DCs to buyers).',
    domain: 'orders',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const ds = await db.pcsDespatch.findMany({ orderBy: { despatchDate: 'desc' }, take: 50 })
      const orderIds = [...new Set(ds.map((d) => d.orderId).filter(Boolean) as string[])]
      const buyerIds = [...new Set(ds.map((d) => d.buyerId).filter(Boolean) as string[])]
      const [orders, buyers] = await Promise.all([
        orderIds.length ? db.order.findMany({ where: { id: { in: orderIds } } }) : Promise.resolve([] as Awaited<ReturnType<typeof db.order.findMany>>),
        buyerIds.length ? db.buyer.findMany({ where: { id: { in: buyerIds } } }) : Promise.resolve([] as Awaited<ReturnType<typeof db.buyer.findMany>>),
      ])
      const orderMap = new Map(orders.map((o) => [o.id, o]))
      const buyerMap = new Map(buyers.map((b) => [b.id, b]))
      return {
        text: `${ds.length} despatches`,
        json: ds.map((d) => ({ dcNo: d.dcNo, orderNo: d.orderId ? orderMap.get(d.orderId)?.orderNo : null, buyer: d.buyerId ? buyerMap.get(d.buyerId)?.name : null, totalPcs: d.totalPcs, vehicleNo: d.vehicleNo, courierName: d.courierName, status: d.status, despatchDate: d.despatchDate })),
      }
    },
  },
  {
    name: 'list_journals',
    description: 'List accounting journal vouchers (receipt/payment/contra/journal). Filter by voucherType optional.',
    domain: 'accounting',
    isWrite: false,
    schema: z.object({
      voucherType: z.string().optional().describe('receipt | payment | contra | journal'),
    }),
    async execute(args) {
      const js = await db.journal.findMany({
        where: args.voucherType ? { voucherType: args.voucherType } : {},
        include: { party: true },
        orderBy: { date: 'desc' },
        take: 50,
      })
      return {
        text: `${js.length} vouchers`,
        json: js.map((j) => ({ voucherNo: j.voucherNo, type: j.voucherType, debit: j.debitAccount, credit: j.creditAccount, amount: j.amount, party: j.party?.name, date: j.date, narration: j.narration })),
      }
    },
  },
  {
    name: 'list_debit_notes',
    description: 'List all debit notes raised against parties.',
    domain: 'accounting',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const dns = await db.debitNote.findMany({ include: { party: true }, orderBy: { date: 'desc' }, take: 50 })
      return {
        text: `${dns.length} debit notes`,
        json: dns.map((d) => ({ noteNo: d.noteNo, type: d.noteType, party: d.party?.name, amount: d.amount, reason: d.reason, status: d.status, date: d.date })),
      }
    },
  },

  // ───────────── DOCUMENT INGESTION TOOLS ─────────────
  // These let the agent read files the user uploaded via the chat panel
  // (paperclip button → /api/upload → /home/z/my-project/upload/), extract
  // their text, and then create ERP records via the normal create_* tools.

  {
    name: 'list_documents',
    description: 'List uploaded documents available for ingestion (PDF, CSV, TXT, MD, JSON) with file sizes. Call this before extract_document to discover exact file names.',
    domain: 'documents',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const files = await listUploadDir()
      if (files.length === 0) {
        return { text: 'No documents in the upload folder. Attach a file via the paperclip button in the chat panel.' }
      }
      return {
        text: `${files.length} document(s) in upload folder`,
        json: files,
      }
    },
  },
  {
    name: 'extract_document',
    description: 'Extract the raw text of an uploaded document (PDF via OCR-free text layer, plus CSV/TXT/MD/JSON) so it can be parsed and ingested. Returns the full text plus metadata (pages/size/truncated flag). Optional maxChars (default 50000). Use list_documents first to get the exact file name.',
    domain: 'documents',
    isWrite: false,
    schema: z.object({
      fileName: z.string().describe('Exact file name from list_documents, e.g. "PO_696GJ_revised 21-04-25.pdf"'),
      maxChars: z.number().optional().describe('Max characters to extract (default 50000)'),
    }),
    async execute(args) {
      const r = await extractDocument(args.fileName, args.maxChars || 50000)
      const text = r.text && r.text.trim().length > 0
        ? r.text
        : '(no text layer found — the PDF is likely scanned images; OCR is not available)'
      return {
        text,
        json: r.meta,
      }
    },
  },
  {
    // Industry-workflow guide — the order→program→cut→production→despatch→
    // invoice→cost→collection chain. Inspects an order's current pipeline state
    // and returns the NEXT canonical step with a pre-filled args skeleton so the
    // user can immediately call the next tool. This is what makes the agent
    // walk users through the Tirupur knitwear job-work flow instead of stopping
    // after `create_order`.
    name: 'suggest_next_step',
    description: 'Given an order (SO-####), inspect its current pipeline state and return the NEXT canonical step in the Tirupur knitwear job-work flow (order → BOM → program → PO → GRN → jobwork → cut → issue-to-line → production → rework/rejection → despatch → invoice → cost sheet → collection). The response includes a pre-filled args skeleton the user can paste back. If no orderNo is given, returns the full pipeline template.',
    domain: 'workflow',
    isWrite: false,
    schema: z.object({
      orderNo: z.string().optional().describe('Sales order number like SO-1001. If omitted, returns the canonical pipeline template.'),
    }),
    async execute(args) {
      const PIPELINE: Array<{ step: number; name: string; tool: string; produces: string }> = [
        { step: 1, name: 'Order created (sales order from buyer PO)', tool: 'create_order', produces: 'order' },
        { step: 2, name: 'Bill of Materials (yarn/fabric/accessories per style)', tool: 'create_bom', produces: 'bom' },
        { step: 3, name: 'Program — production plan (yarn to knit / fabric to dye per order)', tool: 'create_program', produces: 'program' },
        { step: 4, name: 'Purchase order to supplier for materials', tool: 'create_purchase_order', produces: 'po' },
        { step: 5, name: 'GRN — receive material into godown', tool: 'receive_grn', produces: 'grn' },
        { step: 6, name: 'Jobwork DC out (knitting/dyeing/etc.)', tool: 'create_jobwork_order', produces: 'jobworkOut' },
        { step: 7, name: 'Jobwork receive back', tool: 'receive_jobwork', produces: 'jobworkIn' },
        { step: 8, name: 'Cut order (cut fabric to colour×size)', tool: 'create_cut_order', produces: 'cut' },
        { step: 9, name: 'Issue cut pieces to sewing line', tool: 'issue_to_line', produces: 'lineIssue' },
        { step: 10, name: 'Production entry (sewing output → PCS ledger)', tool: 'post_production_entry', produces: 'production' },
        { step: 11, name: 'Rework / rejection (defects)', tool: 'post_rejection', produces: 'rework' },
        { step: 12, name: 'Pcs despatch (finished goods DC out)', tool: 'create_pcs_despatch', produces: 'despatch' },
        { step: 13, name: 'Sales invoice (GST auto from HSN)', tool: 'create_sales_invoice', produces: 'invoice' },
        { step: 14, name: 'Cost sheet (budget vs actual)', tool: 'create_cost_sheet', produces: 'cost' },
        { step: 15, name: 'Payment collection', tool: 'record_payment', produces: 'payment' },
      ]

      if (!args.orderNo) {
        return {
          text: 'CANONICAL TIRUPUR KNITWEAR JOB-WORK PIPELINE\n' + PIPELINE.map((p) => `${p.step}. ${p.name} → ${p.tool}`).join('\n'),
          json: { pipeline: PIPELINE },
        }
      }

      const order = await db.order.findUnique({
        where: { orderNo: args.orderNo },
        include: {
          buyer: true, style: { include: { bomLines: true } },
          lines: { include: { colour: true, size: true } },
          programs: true,
          cutOrders: true,
          lineIssues: true,
          productionEntries: true,
          salesInvoices: true,
          costSheet: true,
          payments: true,
        },
      })
      if (!order) return { text: `Order ${args.orderNo} not found.` }

      const has = {
        bom: !!order.style?.bomLines?.length,
        program: (order.programs?.length ?? 0) > 0,
        cut: (order.cutOrders?.length ?? 0) > 0,
        lineIssue: (order.lineIssues?.length ?? 0) > 0,
        production: (order.productionEntries?.length ?? 0) > 0,
        invoice: (order.salesInvoices?.length ?? 0) > 0,
        cost: (order.costSheet?.length ?? 0) > 0,
        payment: (order.payments?.length ?? 0) > 0,
      }
      const produced = order.productionEntries?.filter((e: any) => !e.rework).reduce((s: number, e: any) => s + e.qty, 0) || 0
      const producedPct = order.totalPcs > 0 ? Math.round((produced / order.totalPcs) * 100) : 0

      let nextStep: typeof PIPELINE[number] = PIPELINE[2]
      let skeleton: Record<string, any> = {}
      const today = new Date().toISOString().slice(0, 10)

      if (!has.bom) {
        nextStep = PIPELINE[1]
        skeleton = {
          styleNo: order.style?.styleNo,
          components: [{ itemType: 'yarn', qty: Math.ceil(order.totalPcs * 0.25), uom: 'kg' }],
          notes: `BOM for order ${order.orderNo} (estimate: 0.25 kg/pc — adjust to actual GSM)`,
        }
      } else if (!has.program) {
        nextStep = PIPELINE[2]
        skeleton = {
          orderNo: order.orderNo,
          stage: 'knitting',
          requiredKgs: Math.ceil(order.totalPcs * 0.25),
          notes: `Knitting program for ${order.orderNo}`,
        }
      } else if (!has.cut) {
        nextStep = PIPELINE[7]
        skeleton = {
          orderNo: order.orderNo,
          fabricIssued: Math.ceil(order.totalPcs * 0.25),
          totalPcs: order.totalPcs,
          cutDate: today,
        }
      } else if (!has.lineIssue) {
        nextStep = PIPELINE[8]
        skeleton = {
          orderNo: order.orderNo,
          lineCode: 'L1',
          qty: order.totalPcs,
          issueDate: today,
        }
      } else if (!has.production) {
        nextStep = PIPELINE[9]
        skeleton = {
          orderNo: order.orderNo,
          deptCode: 'D4',
          prodDate: today,
          bundleNo: 'B1',
          operatorCode: '<operator-code>',
          qty: order.totalPcs,
          rate: 0,
        }
      } else if (!has.invoice) {
        nextStep = PIPELINE[12]
        skeleton = {
          orderNo: order.orderNo,
          invoiceType: 'domestic',
          invoiceDate: today,
        }
      } else if (!has.cost) {
        nextStep = PIPELINE[13]
        skeleton = { orderNo: order.orderNo }
      } else {
        nextStep = PIPELINE[14]
        const inv = order.salesInvoices?.[0]
        skeleton = {
          partyCode: order.buyer?.code,
          invoiceNo: inv?.invoiceNo,
          amount: inv?.billAmount,
          direction: 'in',
          mode: 'bank',
          payDate: today,
        }
        if (has.payment) {
          return {
            text: `Order ${order.orderNo} — ALL 15 STAGES COMPLETE (production ${producedPct}%, invoice ${inv?.invoiceNo || '-'} issued, payments received). Order lifecycle done.`,
            json: {
              orderNo: order.orderNo, buyer: order.buyer?.name, totalPcs: order.totalPcs,
              produced, producedPct, state: has, completed: PIPELINE.map((p) => p.step),
              nextStep: null, skeleton: null, pipelineComplete: true,
            },
          }
        }
      }

      const completed = PIPELINE.filter((p) => {
        if (p.produces === 'order') return true
        if (p.produces === 'bom') return has.bom
        if (p.produces === 'program') return has.program
        if (p.produces === 'cut') return has.cut
        if (p.produces === 'lineIssue') return has.lineIssue
        if (p.produces === 'production') return has.production
        if (p.produces === 'invoice') return has.invoice
        if (p.produces === 'cost') return has.cost
        if (p.produces === 'payment') return has.payment
        return false
      })

      return {
        text: `Order ${order.orderNo} (buyer ${order.buyer?.name || '-'}, ${order.totalPcs} pcs) — production ${producedPct}% (${produced}/${order.totalPcs}).\nNext step: ${nextStep.step}. ${nextStep.name}\n→ call ${nextStep.tool} with skeleton:\n${JSON.stringify(skeleton, null, 2)}\n\nProgress: ${completed.map((c) => '✓' + c.step).join(' ') || '✓1'} of 15 stages.`,
        json: {
          orderNo: order.orderNo,
          buyer: order.buyer?.name,
          totalPcs: order.totalPcs,
          produced,
          producedPct,
          state: has,
          completed: completed.map((c) => c.step),
          nextStep,
          skeleton,
        },
      }
    },
  },
  {
    // Program status — required vs actual per production program, with balances
    // computed from the StockLedger (source of truth), not from projector columns.
    name: 'get_program_status',
    description: 'Production program status for an order: each program (knitting/dyeing/...) with required qty, actual qty consumed/produced (from the stock ledger), and balance. Also shows yarn and fabric balances for the order.',
    domain: 'production',
    isWrite: false,
    schema: z.object({
      orderNo: z.string().describe('Sales order number like SO-1001'),
    }),
    async execute(args) {
      const order = await db.order.findUnique({
        where: { orderNo: args.orderNo },
        include: {
          programs: { include: { yarn: true, fabric: true, department: true } },
        },
      })
      if (!order) return { text: `Order ${args.orderNo} not found.` }

      // Aggregate the ledger for this order per (itemType, itemId).
      const ledger = await db.stockLedger.findMany({ where: { orderId: order.id } })
      const agg = new Map<string, { inKgs: number; outKgs: number; inMtrs: number; outMtrs: number; inPcs: number; outPcs: number }>()
      for (const r of ledger) {
        const key = `${r.itemType}:${r.itemId}`
        const a = agg.get(key) || { inKgs: 0, outKgs: 0, inMtrs: 0, outMtrs: 0, inPcs: 0, outPcs: 0 }
        a.inKgs += r.inKgs; a.outKgs += r.outKgs
        a.inMtrs += r.inMtrs; a.outMtrs += r.outMtrs
        a.inPcs += r.inPcs; a.outPcs += r.outPcs
        agg.set(key, a)
      }

      const produced = order.programs.map((p: any) => {
        const isYarn = !!p.yarnId
        const key = isYarn ? `yarn:${p.yarnId}` : `fabric:${p.fabricId}`
        const a = agg.get(key) || { inKgs: 0, outKgs: 0, inMtrs: 0, outMtrs: 0, inPcs: 0, outPcs: 0 }
        // Knitting program (yarn): actual = yarn consumed (out). Dyeing program (fabric): actual = fabric received in (in).
        const required = p.requiredKgs
        const actual = isYarn ? a.outKgs : a.inKgs
        return {
          programNo: p.programNo,
          stage: p.stage,
          dept: p.department?.code,
          item: isYarn ? p.yarn?.code : p.fabric?.code,
          requiredKgs: required,
          actualKgs: Math.round(actual * 100) / 100,
          balanceKgs: Math.round((required - actual) * 100) / 100,
          status: p.status,
          targetDate: p.targetDate,
        }
      })

      const lines = produced.length
        ? produced.map((p) => `${p.programNo} [${p.stage}${p.dept ? ' @' + p.dept : ''}] ${p.item || '-'}: required ${p.requiredKgs} kg, actual ${p.actualKgs} kg, balance ${p.balanceKgs} kg (${p.status})`)
        : ['No programs yet — call create_program to plan production for this order.']

      return {
        text: `Program status for ${order.orderNo}:\n` + lines.join('\n'),
        json: { orderNo: order.orderNo, programs: produced },
      }
    },
  },
]

// ───────────── WRITE TOOLS (plan-then-commit) ─────────────


// ───────────── MASTER CRUD TOOLS (SPEC-M2 §7) — thin delegates ─────────────
// ADR-001: ALL master business logic lives in src/lib/erp/posting/master-service.ts.
// These tools and the form server action (src/app/(erp)/masters/actions.ts) call
// the SAME plan/commit functions — form and agent behavior cannot drift.

function masterCreateTool(slug: string, description: string): AgentTool {
  const config = getMasterConfig(slug)!
  return {
    name: config.createTool,
    description,
    domain: 'masters',
    isWrite: true,
    schema: buildMasterSchema(config, 'create'),
    async execute(args) {
      const plan = await planMasterCreate(config, args)
      if (!plan.ok) return { text: plan.errors.join('; ') }
      return {
        text: plan.summary,
        plan: {
          summary: plan.summary,
          creates: plan.creates ? [plan.creates] : undefined,
          sideEffects: plan.sideEffects,
        },
        commit: plan.commit,
      }
    },
  }
}

function masterUpdateTool(slug: string, description: string): AgentTool {
  const config = getMasterConfig(slug)!
  return {
    name: config.updateTool,
    description,
    domain: 'masters',
    isWrite: true,
    schema: buildMasterSchema(config, 'update'),
    async execute(args) {
      const plan = await planMasterUpdate(config, args)
      if (!plan.ok) return { text: plan.errors.join('; ') }
      return {
        text: plan.summary,
        plan: {
          summary: plan.summary,
          updates: plan.updates ? [plan.updates] : undefined,
          sideEffects: plan.sideEffects,
        },
        commit: plan.commit,
      }
    },
  }
}

const masterCreateTools: AgentTool[] = [
  masterCreateTool('party', 'Create a party master (customer / supplier / both). code is optional — auto-assigned PRT-#### if omitted or taken. Required: name, partyType (supplier|customer|both). Optional: gstin, pan, address, city, state, phone, email, openingBalance.'),
  masterCreateTool('buyer', 'Create a buyer master (the customer department / brand). code is optional — auto-assigned B-#### if omitted or taken. Required: name. Optional: dept, merchandiser.'),
  masterCreateTool('style', 'Create a style master. styleNo is optional — auto-assigned STY-#### if omitted or taken. Required: description. Optional: buyerCode, category (woven|knit), sam, hsn.'),
  masterCreateTool('yarn', 'Create a yarn master. code is optional — auto-assigned Y-#### if omitted or taken. Required: count, uomCode. Optional: blend, rate.'),
  masterCreateTool('fabric', 'Create a fabric master. code is optional — auto-assigned F-#### if omitted or taken. Required: uomCode. Optional: construction, gsm, width, diaValue (creates Dia if missing), rate.'),
  masterCreateTool('accessory', 'Create an accessory master (zipper, button, label, etc). code is optional — auto-assigned A-#### if omitted or taken. Required: name, uomCode. Optional: category, rate.'),
  masterCreateTool('godown', 'Create a godown (warehouse). code is optional — auto-assigned G#### if omitted or taken. Required: name. Optional: location.'),
  masterCreateTool('department', 'Create a department / process. code is optional — auto-assigned D#### if omitted or taken. Required: name. Optional: orderSno, isProcess.'),
  masterCreateTool('employee', 'Create an employee master. code is optional — auto-assigned EMP-#### if omitted or taken. Required: name. Optional: deptCode, role (operator|supervisor|helper), pieceRate, dailyWage, active.'),
  masterCreateTool('colour', 'Create a colour master. Required: name, code (e.g. RED, BLK, NAV). If colour exists, returns it.'),
  masterCreateTool('size', 'Create a size master. Required: name (e.g. S, M, L, XL, 32, 34). Optional: sort order.'),
  masterCreateTool('uom', 'Create a unit of measure master. Required: name (KGS, MTR, PCS, BAG), code (matching). If exists, returns it.'),
  masterCreateTool('dia', 'Create a dia (machine diameter) master. Required: value (e.g. "30", "34"). If exists, returns it.'),
  masterCreateTool('lot', 'Create a lot master. lotNo is optional — auto-assigned LOT-#### if omitted or taken. Optional: partyCode.'),
  masterCreateTool('season', 'Create a season master. Required: code, name. Optional: startDate, endDate.'),
  masterCreateTool('merchandiser', 'Create a merchandiser master. Required: name. Optional: email, phone.'),
  masterCreateTool('exporter', 'Create an exporter master (the exporting entity). Required: code, name. Optional: iec, gstin.'),
  masterCreateTool('fin-year', 'Create a financial year. Required: code, name, start, end. Optional: active (set true for current FY — deactivates other years).'),
  masterCreateTool('line', 'Create a production line. Required: code, name. Optional: deptCode, capacityPcsPerHour.'),
  masterCreateTool('size-group', 'Create a size group master. Required: name, sizes (CSV of size names). Resolves each size name to a Size row.'),
  masterCreateTool('part', 'Create a garment part master. Required: name (e.g. Front Panel, Sleeve, Collar).'),
  masterCreateTool('component', 'Create a component master. Required: name (e.g. Self Fabric, Contrast Panel).'),
  masterCreateTool('design', 'Create a design master. Required: code, name.'),
  masterCreateTool('govt-holiday', 'Create a government holiday. Required: date (ISO), name.'),
]

const masterUpdateTools: AgentTool[] = [
  masterUpdateTool('party', 'Update an existing party master by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('buyer', 'Update an existing buyer by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('style', 'Update an existing style by styleNo. All fields optional; only provided fields are updated (buyerCode resolves the buyer by code or name).'),
  masterUpdateTool('yarn', 'Update an existing yarn by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('fabric', 'Update an existing fabric by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('accessory', 'Update an existing accessory by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('godown', 'Update an existing godown by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('department', 'Update an existing department by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('employee', 'Update an existing employee by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('colour', 'Update an existing colour by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('size', 'Update an existing size by name. All fields optional; only provided fields are updated.'),
  masterUpdateTool('size-group', 'Update an existing size group by name. All fields optional; sizes = CSV/array of size names.'),
  masterUpdateTool('dia', 'Update an existing dia by value. (Dia has a single field — to change it, create a new dia.)'),
  masterUpdateTool('uom', 'Update an existing UOM by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('lot', 'Update an existing lot by lotNo. All fields optional; only provided fields are updated.'),
  masterUpdateTool('season', 'Update an existing season by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('merchandiser', 'Update an existing merchandiser by name. All fields optional; only provided fields are updated.'),
  masterUpdateTool('exporter', 'Update an existing exporter by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('fin-year', 'Update an existing financial year by code. All fields optional. Setting active=true makes it the current FY and deactivates other years.'),
  masterUpdateTool('line', 'Update an existing production line by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('part', 'Update an existing garment part by name. (Part has a single field — to rename, create a new part.)'),
  masterUpdateTool('component', 'Update an existing component by name. (Component has a single field — to rename, create a new component.)'),
  masterUpdateTool('design', 'Update an existing design by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('govt-holiday', 'Update an existing govt holiday by date (ISO). Provide name to rename it.'),
]

// new master LIST tools (SPEC-M2 §3 — entities that had no list tool)
const masterNewListTools: AgentTool[] = [
  {
    name: 'list_size_groups',
    description: 'List size groups with their size names resolved.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const groups = await db.sizeGroup.findMany()
      const sizes = await db.size.findMany()
      const byId = new Map(sizes.map((s: any) => [s.id, s.name]))
      return {
        text: `${groups.length} size groups`,
        json: groups.map((g: any) => ({
          name: g.name,
          sizes: String(g.sizes || '').split(',').filter(Boolean).map((id: string) => byId.get(id) || id).join(', '),
        })),
      }
    },
  },
  {
    name: 'list_parts',
    description: 'List garment parts (e.g. Front Panel, Sleeve).',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.part.findMany({ take: 200 })
      return { text: `${rows.length} parts`, json: rows.map((p: any) => ({ name: p.name })) }
    },
  },
  {
    name: 'list_components',
    description: 'List components (e.g. Self Fabric, Contrast Panel).',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.component.findMany({ take: 200 })
      return { text: `${rows.length} components`, json: rows.map((c: any) => ({ name: c.name })) }
    },
  },
  {
    name: 'list_designs',
    description: 'List designs.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.design.findMany({ take: 200 })
      return { text: `${rows.length} designs`, json: rows.map((d: any) => ({ code: d.code, name: d.name })) }
    },
  },
  {
    name: 'list_govt_holidays',
    description: 'List government holidays.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.govtHoliday.findMany({ orderBy: { date: 'desc' }, take: 400 })
      return {
        text: `${rows.length} holidays`,
        json: rows.map((h: any) => ({ date: h.date instanceof Date ? h.date.toISOString().slice(0, 10) : h.date, name: h.name })),
      }
    },
  },
]

const writeTools: AgentTool[] = [
  {
    name: 'create_order',
    description: 'Create a sales order with header + line matrix. orderNo is optional — if omitted or already taken, the next free SO-#### is auto-assigned (pass the buyer\'s own PO number when ingesting buyer POs). Required: buyerCode, styleNo, deliveryDate, lines (array of {colourName, sizeName, qty, rate}). Optional: orderDate, finYear (defaults to current 26-27; use e.g. "24-25" for historical documents), notes.',
    domain: 'orders',
    isWrite: true,
    schema: z.object({
      orderNo: z.string().optional(),
      buyerCode: z.string(),
      styleNo: z.string(),
      orderDate: z.string().optional(),
      deliveryDate: z.string(),
      lines: z.array(z.object({
        colourName: z.string(),
        sizeName: z.string(),
        qty: z.number(),
        rate: z.number(),
      })).min(1),
      notes: z.string().optional(),
      finYear: z.string().optional(),
    }),
    async execute(args) {
      // Accept either the buyer code (B-0001 / B001) or the buyer name ("LPP SA")
      const buyer = (await db.buyer.findUnique({ where: { code: args.buyerCode } }))
        || (await db.buyer.findFirst({ where: { name: args.buyerCode } }))
      if (!buyer) return { text: `Buyer ${args.buyerCode} not found (tried code and name). Use list_buyers first.` }
      const style = await db.style.findUnique({ where: { styleNo: args.styleNo } })
      if (!style) return { text: `Style ${args.styleNo} not found. Use list_styles first.` }

      const totalPcs = args.lines.reduce((s, l) => s + l.qty, 0)
      const totalValue = args.lines.reduce((s, l) => s + l.qty * l.rate, 0)
      const finYear = args.finYear || '26-27'

      // Resolve colour/size ids (case-insensitive match — "NAVY" ≡ "Navy")
      const [allColours, allSizes] = await Promise.all([db.colour.findMany(), db.size.findMany()])
      const colourByName = new Map(allColours.map((c) => [c.name.toLowerCase(), c]))
      const sizeByName = new Map(allSizes.map((s) => [s.name.toLowerCase(), s]))
      const linesData = args.lines.map((l) => {
        const colour = colourByName.get(String(l.colourName).toLowerCase())
        const size = sizeByName.get(String(l.sizeName).toLowerCase())
        return { colourId: colour?.id || '', sizeId: size?.id || '', qty: l.qty, rate: l.rate }
      })

      // Resolve a free order number (auto-increment if not provided / collision)
      const resolvedOrderNo = await (async () => {
        const desired = args.orderNo?.trim()
        if (desired) {
          const exists = await db.order.findUnique({ where: { orderNo: desired } })
          if (!exists) return desired
        }
        // Find next free SO-####
        const all = await db.order.findMany({ where: { orderNo: { startsWith: 'SO-' } } })
        const used = new Set(all.map((o) => o.orderNo))
        let n = 1001
        while (used.has(`SO-${n}`)) n++
        return `SO-${n}`
      })()

      return {
        text: `Proposed order ${resolvedOrderNo} for ${buyer.name}, style ${style.styleNo}, ${totalPcs} pcs, ₹${totalValue}.`,
        plan: {
          summary: `Create order ${resolvedOrderNo} for ${buyer.name} | style ${style.styleNo} | ${totalPcs} pcs | ₹${totalValue} | delivery ${args.deliveryDate}`,
          creates: [
            { table: 'order', data: { orderNo: resolvedOrderNo, buyerId: buyer.id, styleId: style.id, orderDate: args.orderDate ? new Date(args.orderDate) : new Date(), deliveryDate: new Date(args.deliveryDate), finYear, totalPcs, totalValue, status: 'open', notes: args.notes } },
            ...linesData.map((l) => ({ table: 'orderLine', data: { ...l, styleId: style.id, orderId: '<pending>' } })),
          ],
          sideEffects: ['Stock reservation will be calculated when fabric is issued'],
        },
        async commit() {
          const created = await db.order.create({
            data: {
              orderNo: resolvedOrderNo, buyerId: buyer.id, styleId: style.id,
              orderDate: args.orderDate ? new Date(args.orderDate) : new Date(),
              deliveryDate: new Date(args.deliveryDate),
              finYear, totalPcs, totalValue, status: 'open', notes: args.notes,
              lines: { create: linesData.map((l) => ({ ...l, styleId: style.id })) },
            },
          })
          return { id: created.id, orderNo: created.orderNo }
        },
      }
    },
  },
  {
    name: 'create_purchase_order',
    description: 'Create a purchase order. poNo is optional — if omitted or already taken, the next free PO-{Y|F|A}-{seq} is auto-assigned based on poType. Required: poType (yarn|fabric|accessory|general), partyCode, deliveryDate, lines (array of {itemType, itemCode, qty, rate}).',
    domain: 'procurement',
    isWrite: true,
    schema: z.object({
      poNo: z.string().optional(),
      poType: z.string(),
      partyCode: z.string(),
      orderDate: z.string().optional(),
      deliveryDate: z.string(),
      lines: z.array(z.object({
        itemType: z.string(),
        itemCode: z.string(),
        qty: z.number(),
        rate: z.number(),
      })).min(1),
      notes: z.string().optional(),
    }),
    async execute(args) {
      const party = await db.party.findUnique({ where: { code: args.partyCode } })
      if (!party) return { text: `Party ${args.partyCode} not found` }

      const totalQty = args.lines.reduce((s, l) => s + l.qty, 0)
      const totalValue = args.lines.reduce((s, l) => s + l.qty * l.rate, 0)
      const finYear = '26-27'

      // Resolve item ids
      const linesResolved = await Promise.all(args.lines.map(async (l) => {
        let item: any
        if (l.itemType === 'yarn') item = await db.yarn.findUnique({ where: { code: l.itemCode } })
        else if (l.itemType === 'fabric') item = await db.fabric.findUnique({ where: { code: l.itemCode } })
        else if (l.itemType === 'accessory') item = await db.accessory.findUnique({ where: { code: l.itemCode } })
        if (!item) throw new Error(`${l.itemType} ${l.itemCode} not found`)
        return { ...l, itemId: item.id, uomId: item.uomId, amount: l.qty * l.rate }
      }))

      // Resolve a free PO number
      const prefix = args.poType === 'yarn' ? 'PO-Y-' : args.poType === 'fabric' ? 'PO-F-' : args.poType === 'accessory' ? 'PO-A-' : 'PO-G-'
      const resolvedPoNo = await (async () => {
        const desired = args.poNo?.trim()
        if (desired) {
          const exists = await db.purchaseOrder.findUnique({ where: { poNo: desired } })
          if (!exists) return desired
        }
        const all = await db.purchaseOrder.findMany({ where: { poNo: { startsWith: prefix } } })
        const used = new Set(all.map((p) => p.poNo))
        let n = 1
        while (used.has(`${prefix}${String(n).padStart(3, '0')}`)) n++
        return `${prefix}${String(n).padStart(3, '0')}`
      })()

      return {
        text: `Proposed PO ${resolvedPoNo} (${args.poType}) to ${party.name}, ${totalQty} units, ₹${totalValue}.`,
        plan: {
          summary: `Create PO ${resolvedPoNo} | ${args.poType} | ${party.name} | ${totalQty} units | ₹${totalValue} | delivery ${args.deliveryDate}`,
          creates: [
            { table: 'purchaseOrder', data: { poNo: resolvedPoNo, poType: args.poType, partyId: party.id, orderDate: args.orderDate ? new Date(args.orderDate) : new Date(), deliveryDate: new Date(args.deliveryDate), finYear, totalQty, totalValue, status: 'open', notes: args.notes } },
            ...linesResolved.map((l) => ({ table: 'poLine', data: { ...l, poId: '<pending>' } })),
          ],
          sideEffects: ['Auto-submits for approval workflow; status=open until approved'],
        },
        async commit() {
          const created = await db.purchaseOrder.create({
            data: {
              poNo: resolvedPoNo, poType: args.poType, partyId: party.id,
              orderDate: args.orderDate ? new Date(args.orderDate) : new Date(),
              deliveryDate: new Date(args.deliveryDate),
              finYear, totalQty, totalValue, status: 'open', notes: args.notes,
              lines: { create: linesResolved },
            },
          })
          // auto-submit for approval
          await db.approval.create({
            data: { entity: 'po', entityId: created.id, step: 1, requestedBy: 'agent', status: 'pending' },
          })
          return { id: created.id, poNo: created.poNo }
        },
      }
    },
  },
  {
    name: 'receive_grn',
    description: 'Receive a GRN against a PO. grnNo is optional — auto-assigned GRN-#### if omitted or colliding. Required: poNo, godownCode, receivedQty (per line in order). Optional: partyDcRef, deptCode.',
    domain: 'procurement',
    isWrite: true,
    schema: z.object({
      grnNo: z.string().optional(),
      poNo: z.string(),
      godownCode: z.string(),
      partyDcRef: z.string().optional(),
      deptCode: z.string().optional(),
      receivedQty: z.number().describe('Qty received (uses PO rate).'),
      grnDate: z.string().optional(),
    }),
    async execute(args) {
      const po = await db.purchaseOrder.findUnique({
        where: { poNo: args.poNo }, include: { party: true, lines: true },
      })
      if (!po) return { text: `PO ${args.poNo} not found` }
      const godown = await db.godown.findUnique({ where: { code: args.godownCode } })
      if (!godown) return { text: `Godown ${args.godownCode} not found` }
      let dept: any = null
      if (args.deptCode) dept = await db.department.findUnique({ where: { code: args.deptCode } })
      const line = po.lines[0]
      if (!line) return { text: `PO has no lines` }
      const actualQty = args.receivedQty
      const totalValue = actualQty * line.rate
      const finYear = '26-27'

      // Resolve a free GRN number
      const resolvedGrnNo = await (async () => {
        const desired = args.grnNo?.trim()
        if (desired) {
          const exists = await db.gRN.findUnique({ where: { grnNo: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.gRN.findMany({ where: { grnNo: { startsWith: 'GRN-' } } })
        const used = new Set(all.map((g) => g.grnNo))
        let n = 1
        while (used.has(`GRN-${String(n).padStart(4, '0')}`)) n++
        return `GRN-${String(n).padStart(4, '0')}`
      })()

      return {
        text: `Proposed GRN ${resolvedGrnNo} against ${args.poNo}, ${actualQty} units, ₹${totalValue}.`,
        plan: {
          summary: `Receive GRN ${resolvedGrnNo} against ${args.poNo} | ${actualQty} ${line.uomId || 'units'} | ₹${totalValue} | into ${godown.code}`,
          creates: [
            { table: 'grn', data: { grnNo: resolvedGrnNo, grnType: 'purchase', poId: po.id, partyId: po.partyId, godownId: godown.id, deptId: dept?.id, grnDate: args.grnDate ? new Date(args.grnDate) : new Date(), finYear, partyDcRef: args.partyDcRef, totalQty: actualQty, totalValue } },
            { table: 'grnLine', data: { itemType: line.itemType, itemId: line.itemId, qty: actualQty, rate: line.rate, amount: totalValue } },
            { table: 'stockLedger', data: { txnType: 'purchase_grn', itemType: line.itemType, itemId: line.itemId, godownId: godown.id, deptId: dept?.id, docNo: resolvedGrnNo, docDate: args.grnDate ? new Date(args.grnDate) : new Date(), finYear, inKgs: line.itemType === 'fabric' || line.itemType === 'yarn' ? actualQty : 0, inPcs: line.itemType === 'accessory' ? actualQty : 0, rate: line.rate, partyId: po.partyId, refId: '<pending>' } },
            { table: 'currentStock', data: { itemType: line.itemType, itemId: line.itemId, godownId: godown.id, deptId: dept?.id, kgs: line.itemType === 'fabric' || line.itemType === 'yarn' ? actualQty : 0, pcs: line.itemType === 'accessory' ? actualQty : 0, rate: line.rate } },
          ],
          updates: [
            { table: 'purchaseOrder', id: po.id, data: { status: actualQty >= po.totalQty ? 'received' : 'partial' } },
            { table: 'poLine', id: line.id, data: { receivedQty: { increment: actualQty } } },
          ],
          sideEffects: ['Stock increases', 'PO status becomes received/partial', 'Party ledger will reflect this GRN'],
        },
        async commit() {
          return await db.$transaction(async (tx) => {
            const grn = await tx.gRN.create({
              data: {
                grnNo: resolvedGrnNo, grnType: 'purchase', poId: po.id, partyId: po.partyId,
                godownId: godown.id, deptId: dept?.id, grnDate: args.grnDate ? new Date(args.grnDate) : new Date(),
                finYear, partyDcRef: args.partyDcRef, totalQty: actualQty, totalValue,
                lines: { create: { itemType: line.itemType, itemId: line.itemId, qty: actualQty, rate: line.rate, amount: totalValue } },
              },
            })
            await tx.stockLedger.create({
              data: {
                txnType: 'purchase_grn', itemType: line.itemType, itemId: line.itemId,
                godownId: godown.id, deptId: dept?.id, docNo: resolvedGrnNo,
                docDate: args.grnDate ? new Date(args.grnDate) : new Date(),
                finYear, inKgs: line.itemType === 'fabric' || line.itemType === 'yarn' ? actualQty : 0,
                inPcs: line.itemType === 'accessory' ? actualQty : 0,
                rate: line.rate, partyId: po.partyId, refId: grn.id,
              },
            })
            // Upsert current stock
            const csWhere = {
              itemType_itemId_godownId_lotId_colourId_sizeId_deptId_orderId: {
                itemType: line.itemType, itemId: line.itemId, godownId: godown.id,
                lotId: '', colourId: '', sizeId: '', deptId: dept?.id || '', orderId: '',
              },
            }
            const existing = await tx.currentStock.findUnique({ where: csWhere as any }).catch(() => null)
            if (existing) {
              await tx.currentStock.update({
                where: csWhere as any,
                data: {
                  kgs: { increment: line.itemType === 'fabric' || line.itemType === 'yarn' ? actualQty : 0 },
                  pcs: { increment: line.itemType === 'accessory' ? actualQty : 0 },
                },
              })
            } else {
              await tx.currentStock.create({
                data: {
                  itemType: line.itemType, itemId: line.itemId, godownId: godown.id,
                  deptId: dept?.id || '',
                  kgs: line.itemType === 'fabric' || line.itemType === 'yarn' ? actualQty : 0,
                  pcs: line.itemType === 'accessory' ? actualQty : 0,
                  rate: line.rate,
                },
              })
            }
            // Update PO + POLine
            await tx.purchaseOrder.update({
              where: { id: po.id },
              data: { status: actualQty >= po.totalQty ? 'received' : 'partial' },
            })
            await tx.pOLine.update({
              where: { id: line.id },
              data: { receivedQty: { increment: actualQty } },
            })
            return { id: grn.id, grnNo: grn.grnNo }
          })
        },
      }
    },
  },
  {
    name: 'create_sales_invoice',
    description: 'Create a sales invoice against an order. invoiceNo is optional — auto-assigned INV-#### if omitted or colliding. Required: orderNo, partyCode, billType (sales|jobwork|yarn_sales|fab_sales), totalQty, taxableValue, gstRate, gstType (cgst_sgst for intra-state OR igst for inter-state).',
    domain: 'accounting',
    isWrite: true,
    schema: z.object({
      invoiceNo: z.string().optional(),
      orderNo: z.string(),
      partyCode: z.string().describe('Customer party code'),
      billType: z.string(),
      totalQty: z.number(),
      taxableValue: z.number(),
      gstRate: z.number().describe('e.g. 5 for 5%'),
      gstType: z.string().describe('cgst_sgst | igst'),
      invoiceDate: z.string().optional(),
      notes: z.string().optional(),
    }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const party = await db.party.findUnique({ where: { code: args.partyCode } })
      if (!party) return { text: `Party ${args.partyCode} not found` }
      const finYear = '26-27'
      const gstAmt = (args.taxableValue * args.gstRate) / 100
      const billAmount = args.taxableValue + gstAmt
      const cgstRate = args.gstType === 'cgst_sgst' ? args.gstRate / 2 : 0
      const sgstRate = args.gstType === 'cgst_sgst' ? args.gstRate / 2 : 0
      const igstRate = args.gstType === 'igst' ? args.gstRate : 0
      const cgstAmt = (args.taxableValue * cgstRate) / 100
      const sgstAmt = (args.taxableValue * sgstRate) / 100
      const igstAmt = (args.taxableValue * igstRate) / 100

      // Resolve a free invoice number
      const resolvedInvoiceNo = await (async () => {
        const desired = args.invoiceNo?.trim()
        if (desired) {
          const exists = await db.salesInvoice.findUnique({ where: { invoiceNo: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.salesInvoice.findMany({ where: { invoiceNo: { startsWith: 'INV-' } } })
        const used = new Set(all.map((i) => i.invoiceNo))
        let n = 1
        while (used.has(`INV-${String(n).padStart(4, '0')}`)) n++
        return `INV-${String(n).padStart(4, '0')}`
      })()

      return {
        text: `Proposed invoice ${resolvedInvoiceNo} for ₹${billAmount} (${args.taxableValue} + ${args.gstRate}% ${args.gstType}).`,
        plan: {
          summary: `Create invoice ${resolvedInvoiceNo} | ${party.name} | order ${args.orderNo} | qty ${args.totalQty} | taxable ₹${args.taxableValue} | GST ${args.gstRate}% ${args.gstType} | total ₹${billAmount}`,
          creates: [
            { table: 'salesInvoice', data: { invoiceNo: resolvedInvoiceNo, invoiceType: 'domestic', orderId: order.id, partyId: party.id, invoiceDate: args.invoiceDate ? new Date(args.invoiceDate) : new Date(), finYear, billType: args.billType, totalQty: args.totalQty, taxableValue: args.taxableValue, cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, billAmount, status: 'issued' } },
          ],
          sideEffects: ['Party AR increases', 'GST payable will be set up', 'Stock will be reduced when despatch is created'],
        },
        async commit() {
          const inv = await db.salesInvoice.create({
            data: {
              invoiceNo: resolvedInvoiceNo, invoiceType: 'domestic', orderId: order.id, partyId: party.id,
              invoiceDate: args.invoiceDate ? new Date(args.invoiceDate) : new Date(),
              finYear, billType: args.billType, totalQty: args.totalQty, taxableValue: args.taxableValue,
              cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, billAmount, status: 'issued',
            },
          })
          return { id: inv.id, invoiceNo: inv.invoiceNo, billAmount: inv.billAmount }
        },
      }
    },
  },
  {
    name: 'create_cut_order',
    description: 'Create a cut order against an order. cutNo is optional — auto-assigned CUT-#### if omitted or colliding. Required: orderNo, fabricIssued (kgs), totalPcs, markerLength, noOfPlies, efficiency.',
    domain: 'cutting',
    isWrite: true,
    schema: z.object({
      cutNo: z.string().optional(),
      orderNo: z.string(),
      fabricIssued: z.number(),
      totalPcs: z.number(),
      markerLength: z.number().optional(),
      noOfPlies: z.number().optional(),
      efficiency: z.number().optional(),
      cutDate: z.string().optional(),
    }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }

      // Resolve a free cut number
      const resolvedCutNo = await (async () => {
        const desired = args.cutNo?.trim()
        if (desired) {
          const exists = await db.cutOrder.findUnique({ where: { cutNo: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.cutOrder.findMany({ where: { cutNo: { startsWith: 'CUT-' } } })
        const used = new Set(all.map((c) => c.cutNo))
        let n = 1
        while (used.has(`CUT-${String(n).padStart(4, '0')}`)) n++
        return `CUT-${String(n).padStart(4, '0')}`
      })()

      return {
        text: `Proposed cut order ${resolvedCutNo} for ${args.orderNo}, ${args.fabricIssued} kgs → ${args.totalPcs} pcs.`,
        plan: {
          summary: `Create cut order ${resolvedCutNo} | order ${args.orderNo} | fabric ${args.fabricIssued} kgs | ${args.totalPcs} pcs | efficiency ${args.efficiency || 'n/a'}%`,
          creates: [{ table: 'cutOrder', data: { cutNo: resolvedCutNo, orderId: order.id, cutDate: args.cutDate ? new Date(args.cutDate) : new Date(), fabricIssued: args.fabricIssued, totalPcs: args.totalPcs, markerLength: args.markerLength, noOfPlies: args.noOfPlies, efficiency: args.efficiency, status: 'planned' } }],
          sideEffects: ['Auto-generates cut bundles with barcodes if efficiency provided'],
        },
        async commit() {
          return await db.$transaction(async (tx) => {
            const cut = await tx.cutOrder.create({
              data: { cutNo: resolvedCutNo, orderId: order.id, cutDate: args.cutDate ? new Date(args.cutDate) : new Date(), fabricIssued: args.fabricIssued, totalPcs: args.totalPcs, markerLength: args.markerLength, noOfPlies: args.noOfPlies, efficiency: args.efficiency, status: 'planned' },
            })
            // Auto-generate bundles
            const bundles = Math.ceil(args.totalPcs / 100)
            for (let i = 1; i <= bundles; i++) {
              await tx.cutBundle.create({
                data: {
                  cutOrderId: cut.id, bundleNo: `${resolvedCutNo}/B${i}`,
                  barcode: `*${resolvedCutNo.replace(/[^A-Z0-9]/gi, '')}B${String(i).padStart(3, '0')}*`,
                  qty: Math.min(100, args.totalPcs - (i - 1) * 100),
                  status: 'in_cutting',
                },
              })
            }
            // Industry chain: cut pieces enter G1 (Main) — ready_to_cut_in.
            const g1 = await tx.godown.findUnique({ where: { code: 'G1' } })
            if (g1) {
              await postLedger(tx, {
                txnType: 'ready_to_cut_in', itemType: 'pcs', itemId: order.id,
                godownId: g1.id, deptId: null, orderId: order.id,
                docNo: resolvedCutNo, docDate: args.cutDate ? new Date(args.cutDate) : new Date(),
                in: { pcs: args.totalPcs },
                notes: `Cut order ${resolvedCutNo} output`,
              })
            }
            return { id: cut.id, cutNo: cut.cutNo, bundlesCreated: bundles }
          })
        },
      }
    },
  },
  {
    name: 'post_production_entry',
    description: 'Post a production entry. Required: orderNo, deptCode, prodDate, bundleNo, operatorCode, qty, rate. Optional: styleNo, colourName, sizeName, lineId.',
    domain: 'production',
    isWrite: true,
    schema: z.object({
      orderNo: z.string(),
      deptCode: z.string(),
      prodDate: z.string(),
      bundleNo: z.string(),
      operatorCode: z.string(),
      qty: z.number(),
      rate: z.number(),
      styleNo: z.string().optional(),
      colourName: z.string().optional(),
      sizeName: z.string().optional(),
      lineId: z.string().optional(),
    }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const dept = await db.department.findUnique({ where: { code: args.deptCode } })
      if (!dept) return { text: `Dept ${args.deptCode} not found` }
      const operator = await db.employee.findUnique({ where: { code: args.operatorCode } })
      if (!operator) return { text: `Operator ${args.operatorCode} not found` }
      const amount = args.qty * args.rate
      return {
        text: `Proposed production entry: ${args.qty} pcs by ${operator.name} on bundle ${args.bundleNo}, ₹${amount}.`,
        plan: {
          summary: `Post production | order ${args.orderNo} | dept ${dept.code} | ${args.qty} pcs | bundle ${args.bundleNo} | operator ${operator.name} | ₹${amount}`,
          creates: [{ table: 'productionEntry', data: { orderId: order.id, deptId: dept.id, prodDate: new Date(args.prodDate), bundleNo: args.bundleNo, operatorId: operator.id, styleNo: args.styleNo || order.styleId, qty: args.qty, rate: args.rate, amount, lineId: args.lineId } }],
          sideEffects: ['WIP increases', 'Operator piece-rate earnings increase'],
        },
        async commit() {
          return await db.$transaction(async (tx) => {
            const e = await tx.productionEntry.create({
              data: {
                orderId: order.id, deptId: dept.id, prodDate: new Date(args.prodDate),
                bundleNo: args.bundleNo, operatorId: operator.id, styleNo: args.styleNo,
                qty: args.qty, rate: args.rate, amount, lineId: args.lineId,
              },
            })
            // Industry chain: good output enters G2 (Finished Goods) — production_in.
            // Rework entries do NOT move stock (pieces are re-sewn in WIP).
            const g2 = await tx.godown.findUnique({ where: { code: 'G2' } })
            if (g2) {
              await postLedger(tx, {
                txnType: 'production_in', itemType: 'pcs', itemId: order.id,
                godownId: g2.id, deptId: dept.id, orderId: order.id,
                docNo: args.bundleNo, docDate: new Date(args.prodDate),
                in: { pcs: args.qty },
                notes: `Production ${dept.code} bundle ${args.bundleNo}`,
              })
            }
            return { id: e.id }
          })
        },
      }
    },
  },
  {
    name: 'approve_pending',
    description: 'Approve a pending approval. Required: approvalId (use get_pending_approvals first).',
    domain: 'workflow',
    isWrite: true,
    schema: z.object({
      approvalId: z.string(),
      comments: z.string().optional(),
    }),
    async execute(args) {
      const ap = await db.approval.findUnique({ where: { id: args.approvalId } })
      if (!ap) return { text: `Approval ${args.approvalId} not found` }
      if (ap.status !== 'pending') return { text: `Approval already ${ap.status}` }
      return {
        text: `Proposed approval of ${ap.entity} ${ap.entityId}.`,
        plan: {
          summary: `Approve ${ap.entity} (id: ${ap.entityId}) - requested by ${ap.requestedBy}`,
          updates: [{ table: 'approval', id: ap.id, data: { status: 'approved', approvedBy: 'agent', approvedAt: new Date(), comments: args.comments } }],
          sideEffects: ['Entity becomes approved', 'If PO, status becomes "open" (already open) and ready to receive'],
        },
        async commit() {
          await db.approval.update({
            where: { id: ap.id },
            data: { status: 'approved', approvedBy: 'agent', approvedAt: new Date(), comments: args.comments },
          })
          return { id: ap.id, status: 'approved' }
        },
      }
    },
  },
  {
    name: 'adjust_stock',
    description: 'Adjust stock (Add or Less). Required: godownCode, itemType, itemCode, qty (kgs), action (add|less), reason.',
    domain: 'inventory',
    isWrite: true,
    schema: z.object({
      godownCode: z.string(),
      itemType: z.string(),
      itemCode: z.string(),
      qty: z.number().describe('Quantity to adjust (positive number, kgs for yarn/fabric, pcs for accessory'),
      action: z.string().describe('add | less'),
      reason: z.string(),
      docNo: z.string().optional(),
    }),
    async execute(args) {
      const godown = await db.godown.findUnique({ where: { code: args.godownCode } })
      if (!godown) return { text: `Godown ${args.godownCode} not found` }
      let item: any
      if (args.itemType === 'yarn') item = await db.yarn.findUnique({ where: { code: args.itemCode } })
      else if (args.itemType === 'fabric') item = await db.fabric.findUnique({ where: { code: args.itemCode } })
      else if (args.itemType === 'accessory') item = await db.accessory.findUnique({ where: { code: args.itemCode } })
      if (!item) return { text: `${args.itemType} ${args.itemCode} not found` }
      const finYear = '26-27'
      const isPcs = args.itemType === 'accessory'
      const isAdd = args.action === 'add'
      return {
        text: `Proposed stock ${args.action === 'add' ? 'addition' : 'reduction'} of ${args.qty} ${isPcs ? 'pcs' : 'kgs'} of ${args.itemCode} at ${args.godownCode}.`,
        plan: {
          summary: `${isAdd ? 'Add to' : 'Reduce from'} stock | ${args.itemType} ${args.itemCode} | ${args.qty} ${isPcs ? 'pcs' : 'kgs'} | godown ${args.godownCode} | reason: ${args.reason}`,
          creates: [
            { table: 'stockLedger', data: { txnType: isAdd ? 'stock_adjustment_add' : 'stock_adjustment_less', itemType: args.itemType, itemId: item.id, godownId: godown.id, docNo: args.docNo || `ADJ-${Date.now()}`, docDate: new Date(), finYear, inKgs: isAdd && !isPcs ? args.qty : 0, outKgs: !isAdd && !isPcs ? args.qty : 0, inPcs: isAdd && isPcs ? args.qty : 0, outPcs: !isAdd && isPcs ? args.qty : 0, rate: item.rate, notes: args.reason } },
          ],
          sideEffects: ['Current stock will be updated'],
        },
        async commit() {
          const ledger = await db.stockLedger.create({
            data: { txnType: isAdd ? 'stock_adjustment_add' : 'stock_adjustment_less', itemType: args.itemType, itemId: item.id, godownId: godown.id, docNo: args.docNo || `ADJ-${Date.now()}`, docDate: new Date(), finYear, inKgs: isAdd && !isPcs ? args.qty : 0, outKgs: !isAdd && !isPcs ? args.qty : 0, inPcs: isAdd && isPcs ? args.qty : 0, outPcs: !isAdd && isPcs ? args.qty : 0, rate: item.rate, notes: args.reason },
          })
          // Upsert current stock
          const csWhere = { itemType_itemId_godownId_lotId_colourId_sizeId_deptId_orderId: { itemType: args.itemType, itemId: item.id, godownId: godown.id, lotId: '', colourId: '', sizeId: '', deptId: '', orderId: '' } }
          const existing = await db.currentStock.findUnique({ where: csWhere as any }).catch(() => null)
          if (existing) {
            await db.currentStock.update({
              where: csWhere as any,
              data: {
                kgs: { increment: isAdd && !isPcs ? args.qty : !isAdd && !isPcs ? -args.qty : 0 },
                pcs: { increment: isAdd && isPcs ? args.qty : !isAdd && isPcs ? -args.qty : 0 },
              },
            })
          } else if (isAdd) {
            await db.currentStock.create({
              data: { itemType: args.itemType, itemId: item.id, godownId: godown.id, kgs: isPcs ? 0 : args.qty, pcs: isPcs ? args.qty : 0, rate: item.rate },
            })
          }
          return { id: ledger.id }
        },
      }
    },
  },
  {
    name: 'cancel_order',
    description: 'Cancel an order by orderNo (sets status=cancelled).',
    domain: 'orders',
    isWrite: true,
    schema: z.object({
      orderNo: z.string(),
      reason: z.string().optional(),
    }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      return {
        text: `Proposed cancellation of ${args.orderNo}.`,
        plan: {
          summary: `Cancel order ${args.orderNo} (was ${order.status}) | reason: ${args.reason || 'not specified'}`,
          updates: [{ table: 'order', id: order.id, data: { status: 'cancelled', notes: args.reason } }],
          sideEffects: ['POs linked to this order remain open', 'Production entries are not deleted'],
        },
        async commit() {
          await db.order.update({ where: { id: order.id }, data: { status: 'cancelled', notes: args.reason } })
          return { id: order.id, status: 'cancelled' }
        },
      }
    },
  },

  // ───────────── MASTER CREATE TOOLS ─────────────
  // These close the "agent cannot create masters" gap. Every entity in the
  // schema is now reachable from chat — parties, buyers, styles, items,
  // godowns, departments, employees, colours, sizes, UOMs, etc.

  // ───────────── MASTER CRUD TOOLS (SPEC-M2 §7) — thin delegates to master-service ─────────────
  ...masterCreateTools,
  ...masterUpdateTools,
  ...masterNewListTools,
  {
    name: 'create_sizes',
    description: 'Batch-create a full size scale in ONE call (preferred over repeated create_size when ingesting documents). Pass every size name of the scale via "names", e.g. names=["104","110","116","122","128","134","140"] or names=["XS","S","M","L","XL"]. Sizes that already exist are skipped automatically.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      names: z.array(z.string()).min(1).optional().describe('All size names of the scale, in sort order'),
      sizes: z.array(z.string()).min(1).optional().describe('Alias for names'),
    }),
    async execute(args) {
      const requested = (args.names || args.sizes || []) as string[]
      if (requested.length === 0) {
        return { text: 'No sizes provided. Pass names=[...] with at least one size name.' }
      }
      const all = await db.size.findMany()
      const existingNames = new Set(all.map((s) => s.name))
      const maxSort = all.reduce((m, s) => Math.max(m, s.sort), 0)
      const missing = requested.filter((n) => n && !existingNames.has(n))
      if (missing.length === 0) {
        return { text: `All ${requested.length} sizes already exist.` }
      }
      let sort = maxSort
      const toCreate = missing.map((n) => {
        sort += 1
        return { name: n, sort }
      })
      return {
        text: `Proposed ${toCreate.length} new sizes: ${toCreate.map((s) => s.name).join(', ')} (${requested.length - toCreate.length} already exist).`,
        plan: {
          summary: `Create ${toCreate.length} size masters | ${toCreate.map((s) => s.name).join(', ')}`,
          creates: toCreate.map((s) => ({ table: 'size', data: s })),
          sideEffects: ['Sizes can now be used on order lines, stock, cut bundles'],
        },
        async commit() {
          await db.size.createMany({ data: toCreate })
          return { created: toCreate.length, names: toCreate.map((s) => s.name) }
        },
      }
    },
  },
  {
    name: 'create_bom',
    description: 'Create a Bill of Materials line for a style. Required: styleNo, lines (array of {itemType (yarn|fabric|accessory), itemCode, qty, rate}). Optional: uomCode.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      styleNo: z.string(),
      lines: z.array(z.object({
        itemType: z.string(),
        itemCode: z.string(),
        qty: z.number(),
        rate: z.number().optional(),
      })).min(1),
    }),
    async execute(args) {
      const style = await db.style.findUnique({ where: { styleNo: args.styleNo } })
      if (!style) return { text: `Style ${args.styleNo} not found` }
      const resolved = await Promise.all(args.lines.map(async (l) => {
        let item: any
        if (l.itemType === 'yarn') item = await db.yarn.findUnique({ where: { code: l.itemCode } })
        else if (l.itemType === 'fabric') item = await db.fabric.findUnique({ where: { code: l.itemCode } })
        else if (l.itemType === 'accessory') item = await db.accessory.findUnique({ where: { code: l.itemCode } })
        if (!item) throw new Error(`${l.itemType} ${l.itemCode} not found`)
        return { ...l, itemId: item.id, uomId: item.uomId, rate: l.rate ?? item.rate }
      }))
      const totalCost = resolved.reduce((s, l) => s + l.qty * l.rate, 0)
      return {
        text: `Proposed BOM for ${args.styleNo} — ${resolved.length} lines, total material cost ₹${totalCost}.`,
        plan: {
          summary: `Create BOM | style ${args.styleNo} | ${resolved.length} lines | total material ₹${totalCost}`,
          creates: resolved.map((l) => ({ table: 'bomLine', data: { styleId: style.id, itemType: l.itemType, itemId: l.itemId, qty: l.qty, uomId: l.uomId, rate: l.rate } })),
          sideEffects: ['Costing will pull from this BOM'],
        },
        async commit() {
          await db.bomLine.createMany({ data: resolved.map((l) => ({ styleId: style.id, itemType: l.itemType, itemId: l.itemId, qty: l.qty, uomId: l.uomId, rate: l.rate })) })
          return { styleId: style.id, lines: resolved.length }
        },
      }
    },
  },

  // ───────────── TRANSACTIONAL WRITE TOOLS (gaps) ─────────────

  {
    name: 'create_jobwork_order',
    description: 'Send material out to a jobworker (washing/dyeing/printing/embroidery). dcNo is optional — auto-assigned JW-#### if omitted or taken. Required: jobworkerCode (party), processType, totalQty, totalValue. Optional: orderId, expectedInDate.',
    domain: 'production',
    isWrite: true,
    schema: z.object({
      dcNo: z.string().optional(),
      jobworkerCode: z.string(),
      processType: z.string(),
      totalQty: z.number(),
      totalValue: z.number().optional(),
      orderNo: z.string().optional(),
      expectedInDate: z.string().optional(),
      outDate: z.string().optional(),
    }),
    async execute(args) {
      const party = await db.party.findUnique({ where: { code: args.jobworkerCode } })
      if (!party) return { text: `Party ${args.jobworkerCode} not found` }
      let order: any = null
      if (args.orderNo) {
        order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
        if (!order) return { text: `Order ${args.orderNo} not found` }
      }
      const resolvedDcNo = await (async () => {
        const desired = args.dcNo?.trim()
        if (desired) {
          const exists = await db.jobworkOrder.findUnique({ where: { dcNo: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.jobworkOrder.findMany({ where: { dcNo: { startsWith: 'JW-' } } })
        const used = new Set(all.map((j) => j.dcNo))
        let n = 1
        while (used.has(`JW-${String(n).padStart(4, '0')}`)) n++
        return `JW-${String(n).padStart(4, '0')}`
      })()
      const totalValue = args.totalValue ?? 0
      return {
        text: `Proposed jobwork DC ${resolvedDcNo} → ${party.name} (${args.processType}), ${args.totalQty} units, ₹${totalValue}.`,
        plan: {
          summary: `Create jobwork DC ${resolvedDcNo} | ${party.name} | ${args.processType} | ${args.totalQty} units | ₹${totalValue} | expected in ${args.expectedInDate || '-'}`,
          creates: [{ table: 'jobworkOrder', data: { dcNo: resolvedDcNo, jobworkerId: party.id, processType: args.processType, totalQty: args.totalQty, totalValue, orderId: order?.id, expectedInDate: args.expectedInDate ? new Date(args.expectedInDate) : null, outDate: args.outDate ? new Date(args.outDate) : new Date(), status: 'sent' } }],
          sideEffects: ['Material leaves main godown', 'Pending receipt at jobworker', 'ITC-04 line generated'],
        },
        async commit() {
          const j = await db.jobworkOrder.create({ data: { dcNo: resolvedDcNo, jobworkerId: party.id, processType: args.processType, totalQty: args.totalQty, totalValue, orderId: order?.id, expectedInDate: args.expectedInDate ? new Date(args.expectedInDate) : null, outDate: args.outDate ? new Date(args.outDate) : new Date(), status: 'sent' } })
          return { id: j.id, dcNo: j.dcNo }
        },
      }
    },
  },
  {
    name: 'create_pcs_despatch',
    description: 'Despatch finished goods (pieces) to a buyer. dcNo is optional — auto-assigned DC-#### if omitted or taken. Required: orderNo, totalPcs. Optional: buyerCode (defaults from order), vehicleNo, courierName, lines (array of {styleNo, colourName, sizeName, qty, rate}).',
    domain: 'orders',
    isWrite: true,
    schema: z.object({
      dcNo: z.string().optional(),
      orderNo: z.string(),
      totalPcs: z.number(),
      vehicleNo: z.string().optional(),
      courierName: z.string().optional(),
      despatchDate: z.string().optional(),
      lines: z.array(z.object({
        styleNo: z.string(),
        colourName: z.string().optional(),
        sizeName: z.string().optional(),
        qty: z.number(),
        rate: z.number().optional(),
      })).optional(),
    }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo }, include: { buyer: true } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const finYear = '26-27'
      const resolvedDcNo = await (async () => {
        const desired = args.dcNo?.trim()
        if (desired) {
          const exists = await db.pcsDespatch.findUnique({ where: { dcNo: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.pcsDespatch.findMany({ where: { dcNo: { startsWith: 'DC-' } } })
        const used = new Set(all.map((d) => d.dcNo))
        let n = 1
        while (used.has(`DC-${String(n).padStart(4, '0')}`)) n++
        return `DC-${String(n).padStart(4, '0')}`
      })()
      const lines = args.lines || []
      return {
        text: `Proposed despatch DC ${resolvedDcNo} for ${order.orderNo} — ${args.totalPcs} pcs.`,
        plan: {
          summary: `Create despatch DC ${resolvedDcNo} | order ${order.orderNo} | buyer ${order.buyer?.name || '-'} | ${args.totalPcs} pcs | vehicle ${args.vehicleNo || '-'} | courier ${args.courierName || '-'}`,
          creates: [
            { table: 'pcsDespatch', data: { dcNo: resolvedDcNo, orderId: order.id, buyerId: order.buyerId, despatchDate: args.despatchDate ? new Date(args.despatchDate) : new Date(), finYear, totalPcs: args.totalPcs, vehicleNo: args.vehicleNo, courierName: args.courierName, status: 'despatched' } },
            ...lines.map((l) => ({ table: 'pcsDespatchLine', data: { pcsDespatchId: '<pending>', styleNo: l.styleNo, qty: l.qty, rate: l.rate || 0 } })),
          ],
          sideEffects: ['Finished goods stock reduces', 'Order completion % increases'],
        },
        async commit() {
          return await db.$transaction(async (tx) => {
            const d = await tx.pcsDespatch.create({
              data: {
                dcNo: resolvedDcNo, orderId: order.id, buyerId: order.buyerId,
                despatchDate: args.despatchDate ? new Date(args.despatchDate) : new Date(),
                finYear, totalPcs: args.totalPcs, vehicleNo: args.vehicleNo, courierName: args.courierName, status: 'despatched',
                lines: { create: lines.map((l) => ({ styleNo: l.styleNo, qty: l.qty, rate: l.rate || 0 })) },
              },
            })
            // Industry chain: despatched pcs leave G2 (Finished Goods) — sales_delivery.
            const g2 = await tx.godown.findUnique({ where: { code: 'G2' } })
            if (g2) {
              await postLedger(tx, {
                txnType: 'sales_delivery', itemType: 'pcs', itemId: order.id,
                godownId: g2.id, deptId: null, orderId: order.id,
                docNo: resolvedDcNo, docDate: args.despatchDate ? new Date(args.despatchDate) : new Date(),
                out: { pcs: args.totalPcs },
                notes: `Despatch DC ${resolvedDcNo} → ${order.buyer?.name || 'buyer'}`,
              })
            }
            return { id: d.id, dcNo: d.dcNo }
          })
        },
      }
    },
  },
  {
    name: 'create_debit_note',
    description: 'Raise a debit note against a party. noteNo is optional — auto-assigned DN-#### if omitted or taken. Required: noteType (acc|fabric|yarn|pcs|comm), partyCode, amount. Optional: reason.',
    domain: 'accounting',
    isWrite: true,
    schema: z.object({
      noteNo: z.string().optional(),
      noteType: z.string(),
      partyCode: z.string(),
      amount: z.number(),
      reason: z.string().optional(),
      date: z.string().optional(),
    }),
    async execute(args) {
      const party = await db.party.findUnique({ where: { code: args.partyCode } })
      if (!party) return { text: `Party ${args.partyCode} not found` }
      const finYear = '26-27'
      const resolvedNoteNo = await (async () => {
        const desired = args.noteNo?.trim()
        if (desired) {
          const exists = await db.debitNote.findUnique({ where: { noteNo: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.debitNote.findMany({ where: { noteNo: { startsWith: 'DN-' } } })
        const used = new Set(all.map((d) => d.noteNo))
        let n = 1
        while (used.has(`DN-${String(n).padStart(4, '0')}`)) n++
        return `DN-${String(n).padStart(4, '0')}`
      })()
      return {
        text: `Proposed debit note ${resolvedNoteNo} — ₹${args.amount} against ${party.name}.`,
        plan: {
          summary: `Raise debit note ${resolvedNoteNo} | ${args.noteType} | ${party.name} | ₹${args.amount} | reason: ${args.reason || '-'}`,
          creates: [{ table: 'debitNote', data: { noteNo: resolvedNoteNo, noteType: args.noteType, partyId: party.id, date: args.date ? new Date(args.date) : new Date(), finYear, amount: args.amount, reason: args.reason, status: 'raised' } }],
          sideEffects: ['Party AR increases by ₹' + args.amount],
        },
        async commit() {
          const d = await db.debitNote.create({ data: { noteNo: resolvedNoteNo, noteType: args.noteType, partyId: party.id, date: args.date ? new Date(args.date) : new Date(), finYear, amount: args.amount, reason: args.reason, status: 'raised' } })
          return { id: d.id, noteNo: d.noteNo }
        },
      }
    },
  },
  {
    name: 'create_journal',
    description: 'Post a journal voucher (receipt | payment | contra | journal). voucherNo is optional — auto-assigned V-#### if omitted or taken. Required: voucherType, debitAccount, creditAccount, amount. Optional: partyCode, narration, date.',
    domain: 'accounting',
    isWrite: true,
    schema: z.object({
      voucherNo: z.string().optional(),
      voucherType: z.string(),
      debitAccount: z.string(),
      creditAccount: z.string(),
      amount: z.number(),
      partyCode: z.string().optional(),
      narration: z.string().optional(),
      date: z.string().optional(),
    }),
    async execute(args) {
      let party: any = null
      if (args.partyCode) {
        party = await db.party.findUnique({ where: { code: args.partyCode } })
        if (!party) return { text: `Party ${args.partyCode} not found` }
      }
      const finYear = '26-27'
      const resolvedVoucherNo = await (async () => {
        const desired = args.voucherNo?.trim()
        if (desired) {
          const exists = await db.journal.findUnique({ where: { voucherNo: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.journal.findMany({ where: { voucherNo: { startsWith: 'V-' } } })
        const used = new Set(all.map((j) => j.voucherNo))
        let n = 1
        while (used.has(`V-${String(n).padStart(4, '0')}`)) n++
        return `V-${String(n).padStart(4, '0')}`
      })()
      return {
        text: `Proposed ${args.voucherType} voucher ${resolvedVoucherNo} — Dr ${args.debitAccount} / Cr ${args.creditAccount} ₹${args.amount}.`,
        plan: {
          summary: `Post ${args.voucherType} voucher ${resolvedVoucherNo} | Dr ${args.debitAccount} | Cr ${args.creditAccount} | ₹${args.amount} | party ${party?.name || '-'} | narration: ${args.narration || '-'}`,
          creates: [{ table: 'journal', data: { voucherNo: resolvedVoucherNo, voucherType: args.voucherType, partyId: party?.id, date: args.date ? new Date(args.date) : new Date(), finYear, debitAccount: args.debitAccount, creditAccount: args.creditAccount, amount: args.amount, narration: args.narration } }],
          sideEffects: ['Party ledger updated', 'Cash/bank balance updated'],
        },
        async commit() {
          const j = await db.journal.create({ data: { voucherNo: resolvedVoucherNo, voucherType: args.voucherType, partyId: party?.id, date: args.date ? new Date(args.date) : new Date(), finYear, debitAccount: args.debitAccount, creditAccount: args.creditAccount, amount: args.amount, narration: args.narration } })
          return { id: j.id, voucherNo: j.voucherNo }
        },
      }
    },
  },
  {
    name: 'create_cost_sheet',
    description: 'Create / update a cost sheet for an order. version defaults to 1; if a sheet exists, the next version is auto-assigned. Required: orderNo. All cost fields optional — fabricCost, trimCost, cmCost, washingCost, packingCost, overheads, commissionPct, marginPct, sellingPrice.',
    domain: 'costing',
    isWrite: true,
    schema: z.object({
      orderNo: z.string(),
      fabricCost: z.number().optional(),
      trimCost: z.number().optional(),
      cmCost: z.number().optional(),
      washingCost: z.number().optional(),
      packingCost: z.number().optional(),
      overheads: z.number().optional(),
      commissionPct: z.number().optional(),
      marginPct: z.number().optional(),
      sellingPrice: z.number().optional(),
    }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const existing = await db.costSheet.findMany({ where: { orderId: order.id }, orderBy: { version: 'desc' } })
      const version = (existing[0]?.version || 0) + 1
      const totalCost = (args.fabricCost || 0) + (args.trimCost || 0) + (args.cmCost || 0) + (args.washingCost || 0) + (args.packingCost || 0) + (args.overheads || 0)
      return {
        text: `Proposed cost sheet v${version} for ${order.orderNo} — total ₹${totalCost}, selling ₹${args.sellingPrice || 0}.`,
        plan: {
          summary: `Create cost sheet v${version} | order ${order.orderNo} | fabric ₹${args.fabricCost || 0} | trim ₹${args.trimCost || 0} | CM ₹${args.cmCost || 0} | wash ₹${args.washingCost || 0} | pack ₹${args.packingCost || 0} | OH ₹${args.overheads || 0} | comm ${args.commissionPct || 0}% | margin ${args.marginPct || 0}% | total ₹${totalCost} | sell ₹${args.sellingPrice || 0}`,
          creates: [{ table: 'costSheet', data: { orderId: order.id, version, fabricCost: args.fabricCost || 0, trimCost: args.trimCost || 0, cmCost: args.cmCost || 0, washingCost: args.washingCost || 0, packingCost: args.packingCost || 0, overheads: args.overheads || 0, commissionPct: args.commissionPct || 0, marginPct: args.marginPct || 0, totalCost, sellingPrice: args.sellingPrice || 0 } }],
          sideEffects: ['Margin % recalculated', 'Order totalValue may be revised'],
        },
        async commit() {
          const cs = await db.costSheet.create({ data: { orderId: order.id, version, fabricCost: args.fabricCost || 0, trimCost: args.trimCost || 0, cmCost: args.cmCost || 0, washingCost: args.washingCost || 0, packingCost: args.packingCost || 0, overheads: args.overheads || 0, commissionPct: args.commissionPct || 0, marginPct: args.marginPct || 0, totalCost, sellingPrice: args.sellingPrice || 0 } })
          return { id: cs.id, version: cs.version }
        },
      }
    },
  },

  // ───────────── UPDATE / CANCEL TOOLS ─────────────

  {
    name: 'cancel_purchase_order',
    description: 'Cancel a purchase order by poNo (sets status=cancelled).',
    domain: 'procurement',
    isWrite: true,
    schema: z.object({
      poNo: z.string(),
      reason: z.string().optional(),
    }),
    async execute(args) {
      const po = await db.purchaseOrder.findUnique({ where: { poNo: args.poNo } })
      if (!po) return { text: `PO ${args.poNo} not found` }
      return {
        text: `Proposed cancellation of ${args.poNo}.`,
        plan: {
          summary: `Cancel PO ${args.poNo} (was ${po.status}) | reason: ${args.reason || 'not specified'}`,
          updates: [{ table: 'purchaseOrder', id: po.id, data: { status: 'cancelled', notes: args.reason } }],
          sideEffects: ['No GRNs can be received against this PO', 'Linked order PO balance is reopened'],
        },
        async commit() {
          await db.purchaseOrder.update({ where: { id: po.id }, data: { status: 'cancelled', notes: args.reason } })
          return { id: po.id, status: 'cancelled' }
        },
      }
    },
  },
  {
    name: 'cancel_invoice',
    description: 'Cancel a sales invoice by invoiceNo (sets status=cancelled).',
    domain: 'accounting',
    isWrite: true,
    schema: z.object({
      invoiceNo: z.string(),
      reason: z.string().optional(),
    }),
    async execute(args) {
      const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: args.invoiceNo } })
      if (!inv) return { text: `Invoice ${args.invoiceNo} not found` }
      return {
        text: `Proposed cancellation of ${args.invoiceNo}.`,
        plan: {
          summary: `Cancel invoice ${args.invoiceNo} (was ${inv.status}) | reason: ${args.reason || 'not specified'}`,
          updates: [{ table: 'salesInvoice', id: inv.id, data: { status: 'cancelled' } }],
          sideEffects: ['Party AR reduces', 'GST liability reverses'],
        },
        async commit() {
          await db.salesInvoice.update({ where: { id: inv.id }, data: { status: 'cancelled' } })
          return { id: inv.id, status: 'cancelled' }
        },
      }
    },
  },
  {
    name: 'update_order',
    description: 'Update an existing order by orderNo. Updatable: deliveryDate, status (open|in_progress|completed|cancelled), notes. Cannot change orderNo or buyerId.',
    domain: 'orders',
    isWrite: true,
    schema: z.object({
      orderNo: z.string(),
      deliveryDate: z.string().optional(),
      status: z.string().optional(),
      notes: z.string().optional(),
    }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const patch: any = {}
      if (args.deliveryDate) patch.deliveryDate = new Date(args.deliveryDate)
      if (args.status) patch.status = args.status
      if (args.notes !== undefined) patch.notes = args.notes
      return {
        text: `Proposed update to order ${args.orderNo}.`,
        plan: {
          summary: `Update order ${args.orderNo} | fields: ${Object.keys(patch).join(', ') || 'none'}`,
          updates: [{ table: 'order', id: order.id, data: patch }],
          sideEffects: ['Order master updated'],
        },
        async commit() {
          await db.order.update({ where: { id: order.id }, data: patch })
          return { id: order.id, orderNo: order.orderNo }
        },
      }
    },
  },
  {
    name: 'receive_jobwork',
    description: 'Mark a jobwork DC as received back from the jobworker. Required: dcNo. Optional: receivedDate, receivedQty (defaults to sent qty).',
    domain: 'production',
    isWrite: true,
    schema: z.object({
      dcNo: z.string(),
      receivedDate: z.string().optional(),
      receivedQty: z.number().optional(),
    }),
    async execute(args) {
      const jw = await db.jobworkOrder.findUnique({ where: { dcNo: args.dcNo } })
      if (!jw) return { text: `Jobwork DC ${args.dcNo} not found` }
      if (jw.status === 'received') return { text: `Already received on ${jw.receivedDate}` }
      return {
        text: `Proposed receipt of jobwork ${args.dcNo} — ${args.receivedQty || jw.totalQty} units.`,
        plan: {
          summary: `Receive jobwork DC ${args.dcNo} | qty ${args.receivedQty || jw.totalQty} | date ${args.receivedDate || 'today'}`,
          updates: [{ table: 'jobworkOrder', id: jw.id, data: { status: 'received', receivedDate: args.receivedDate ? new Date(args.receivedDate) : new Date(), totalQty: args.receivedQty ?? jw.totalQty } }],
          sideEffects: ['Material back in main godown', 'Jobwork cost booked'],
        },
        async commit() {
          await db.jobworkOrder.update({ where: { id: jw.id }, data: { status: 'received', receivedDate: args.receivedDate ? new Date(args.receivedDate) : new Date(), totalQty: args.receivedQty ?? jw.totalQty } })
          return { id: jw.id, dcNo: jw.dcNo }
        },
      }
    },
  },
  {
    // ── Industry chain: PROGRAM — the "order → program" step. ──
    name: 'create_program',
    description: 'Create a production PROGRAM for an order — the production plan step right after BOM. For a knitting program pass stage=knitting + yarnCode + requiredKgs; for a dyeing program pass stage=dyeing + fabricCode + requiredKgs; for sewing/finishing/packing pass requiredPcs. programNo auto-assigned PGM-####. Dept auto-maps from stage (knitting→D1, dyeing→D2, sewing→D4, finishing→D5, packing→D6) unless deptCode given. Also updates the legacy ProgBalanceYarn/ProgBalanceFabric projector rows.',
    domain: 'production',
    isWrite: true,
    schema: z.object({
      programNo: z.string().optional(),
      orderNo: z.string(),
      stage: z.string().describe('knitting | dyeing | printing | embroidery | sewing | finishing | packing'),
      yarnCode: z.string().optional().describe('Yarn code (knitting programs — yarn to consume)'),
      fabricCode: z.string().optional().describe('Fabric code (dyeing programs — fabric to process)'),
      requiredKgs: z.number().optional(),
      requiredMtrs: z.number().optional(),
      requiredPcs: z.number().optional(),
      deptCode: z.string().optional(),
      targetDate: z.string().optional(),
      notes: z.string().optional(),
    }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const yarn = args.yarnCode ? await db.yarn.findUnique({ where: { code: args.yarnCode } }) : null
      if (args.yarnCode && !yarn) return { text: `Yarn ${args.yarnCode} not found` }
      const fabric = args.fabricCode ? await db.fabric.findUnique({ where: { code: args.fabricCode } }) : null
      if (args.fabricCode && !fabric) return { text: `Fabric ${args.fabricCode} not found` }
      const deptCode = args.deptCode || STAGE_DEPT[args.stage]
      const dept = deptCode ? await db.department.findUnique({ where: { code: deptCode } }) : null
      if (deptCode && !dept) return { text: `Department ${deptCode} not found` }
      if (!args.requiredKgs && !args.requiredMtrs && !args.requiredPcs) {
        return { text: 'Provide at least one of requiredKgs / requiredMtrs / requiredPcs.' }
      }
      const programNo = await resolveDocNo('program', 'programNo', 'PGM-', args.programNo)

      return {
        text: `Proposed program ${programNo} for ${order.orderNo}: ${args.stage}${dept ? ' @' + dept.code : ''} — ${args.requiredKgs || 0} kg / ${args.requiredMtrs || 0} mtr / ${args.requiredPcs || 0} pcs.`,
        plan: {
          summary: `Create program ${programNo} | order ${order.orderNo} | stage ${args.stage}${dept ? ' @' + dept.code : ''} | req ${args.requiredKgs || 0}kg ${args.requiredMtrs || 0}mtr ${args.requiredPcs || 0}pcs | target ${args.targetDate || '-'} | item ${yarn?.code || fabric?.code || '-'}`,
          creates: [{ table: 'program', data: { programNo, orderId: order.id, stage: args.stage, deptId: dept?.id, yarnId: yarn?.id, fabricId: fabric?.id, requiredKgs: args.requiredKgs || 0, requiredMtrs: args.requiredMtrs || 0, requiredPcs: args.requiredPcs || 0, targetDate: args.targetDate ? new Date(args.targetDate) : null, notes: args.notes, status: 'open' } }],
          sideEffects: [
            yarn ? `ProgBalanceYarn.reqKgs +${args.requiredKgs || 0} kg (order ${order.orderNo})` : null,
            fabric ? `ProgBalanceFabric.reqKgs +${args.requiredKgs || 0} kg (order ${order.orderNo})` : null,
          ].filter((s): s is string => Boolean(s)),
        },
        async commit() {
          return await db.$transaction(async (tx) => {
            const prog = await tx.program.create({
              data: { programNo, orderId: order.id, stage: args.stage, deptId: dept?.id, yarnId: yarn?.id, fabricId: fabric?.id, requiredKgs: args.requiredKgs || 0, requiredMtrs: args.requiredMtrs || 0, requiredPcs: args.requiredPcs || 0, targetDate: args.targetDate ? new Date(args.targetDate) : null, notes: args.notes, status: 'open' },
            })
            // Legacy projector rows: required quantities per order+dept+item.
            if (yarn && dept) {
              const existing = await tx.progBalanceYarn.findFirst({ where: { orderId: order.id, deptId: dept.id, countId: yarn.id } })
              if (existing) await tx.progBalanceYarn.update({ where: { id: existing.id }, data: { reqKgs: { increment: args.requiredKgs || 0 } } })
              else await tx.progBalanceYarn.create({ data: { orderId: order.id, deptId: dept.id, countId: yarn.id, reqKgs: args.requiredKgs || 0 } })
            }
            if (fabric && dept) {
              const existing = await tx.progBalanceFabric.findFirst({ where: { orderId: order.id, deptId: dept.id, fabricId: fabric.id } })
              if (existing) await tx.progBalanceFabric.update({ where: { id: existing.id }, data: { reqKgs: { increment: args.requiredKgs || 0 } } })
              else await tx.progBalanceFabric.create({ data: { orderId: order.id, deptId: dept.id, fabricId: fabric.id, reqKgs: args.requiredKgs || 0 } })
            }
            return { id: prog.id, programNo: prog.programNo }
          })
        },
      }
    },
  },
  {
    // ── Industry chain: ISSUE TO LINE — cut pieces from cutting floor to sewing line. ──
    name: 'issue_to_line',
    description: 'Issue cut pieces from the main godown (G1) to a sewing line. issueNo auto-assigned LI-####. Required: orderNo, lineCode, qty. Moves pcs out of G1 in the stock ledger (txn ready_to_cut_out).',
    domain: 'production',
    isWrite: true,
    schema: z.object({
      issueNo: z.string().optional(),
      orderNo: z.string(),
      lineCode: z.string(),
      qty: z.number(),
      issueDate: z.string().optional(),
      styleNo: z.string().optional(),
      notes: z.string().optional(),
    }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const line = await db.line.findUnique({ where: { code: args.lineCode } })
      if (!line) return { text: `Line ${args.lineCode} not found (create it with create_line)` }
      const g1 = await db.godown.findUnique({ where: { code: 'G1' } })
      if (!g1) return { text: 'Godown G1 (Main) not found — create it with create_godown' }
      const issueNo = await resolveDocNo('lineIssue', 'issueNo', 'LI-', args.issueNo)
      const issueDate = args.issueDate ? new Date(args.issueDate) : new Date()

      // Warn (never block) if G1 pcs would go negative — legacy Fiberpro behaviour.
      const bucket = await db.currentStock.findFirst({ where: { itemType: 'pcs', itemId: order.id, godownId: g1.id, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null } })
      const onHand = bucket?.pcs || 0
      const warn = onHand < args.qty ? [`⚠ G1 pcs balance is ${onHand}; issuing ${args.qty} makes it negative (cut order not yet booked?)`] : []

      return {
        text: `Proposed line issue ${issueNo}: ${args.qty} pcs of ${order.orderNo} to line ${line.code} (${line.name}).`,
        plan: {
          summary: `Issue to line ${issueNo} | order ${order.orderNo} | line ${line.code} | ${args.qty} pcs | ${issueDate.toISOString().slice(0, 10)}`,
          creates: [{ table: 'lineIssue', data: { issueNo, orderId: order.id, lineId: line.id, issueDate, qty: args.qty, styleNo: args.styleNo || null, notes: args.notes, status: 'issued' } }],
          sideEffects: [
            `StockLedger: ${args.qty} pcs OUT of G1 (ready_to_cut_out)`,
            `Line ${line.code} WIP increases`,
            ...warn,
          ],
        },
        async commit() {
          return await db.$transaction(async (tx) => {
            const li = await tx.lineIssue.create({
              data: { issueNo, orderId: order.id, lineId: line.id, issueDate, qty: args.qty, styleNo: args.styleNo || null, notes: args.notes, status: 'issued' },
            })
            await postLedger(tx, {
              txnType: 'ready_to_cut_out', itemType: 'pcs', itemId: order.id,
              godownId: g1.id, deptId: line.deptId, orderId: order.id,
              docNo: issueNo, docDate: issueDate,
              out: { pcs: args.qty },
              notes: `Issued to line ${line.code}`,
            })
            return { id: li.id, issueNo: li.issueNo }
          })
        },
      }
    },
  },
  {
    // ── Industry chain: REJECTION — QA rejects pieces out of finished stock. ──
    name: 'post_rejection',
    description: 'Post a QA rejection for an order. rejNo auto-assigned REJ-####. Required: orderNo, qty. Optional: rejType (stitch_fault | size_fault | fabric_fault | shade_fault | damage | other), action (scrap | rework | return_to_party), deptCode, notes. Scrap/return actions move qty OUT of G2 (Finished Goods) in the stock ledger; rework action is document-only (pieces go back to the line via post_production_entry with rework).',
    domain: 'production',
    isWrite: true,
    schema: z.object({
      rejNo: z.string().optional(),
      orderNo: z.string(),
      qty: z.number(),
      rejType: z.string().optional(),
      action: z.string().optional(),
      deptCode: z.string().optional(),
      rejDate: z.string().optional(),
      notes: z.string().optional(),
    }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const dept = args.deptCode ? await db.department.findUnique({ where: { code: args.deptCode } }) : null
      if (args.deptCode && !dept) return { text: `Department ${args.deptCode} not found` }
      const rejNo = await resolveDocNo('rejectionEntry', 'rejNo', 'REJ-', args.rejNo)
      const rejDate = args.rejDate ? new Date(args.rejDate) : new Date()
      const action = args.action || 'scrap'
      const rejType = args.rejType || 'stitch_fault'
      const movesStock = action === 'scrap' || action === 'return_to_party'

      return {
        text: `Proposed rejection ${rejNo}: ${args.qty} pcs of ${order.orderNo} — ${rejType}, action ${action}.`,
        plan: {
          summary: `Rejection ${rejNo} | order ${order.orderNo} | ${args.qty} pcs | type ${rejType} | action ${action}${dept ? ' @' + dept.code : ''}`,
          creates: [{ table: 'rejectionEntry', data: { rejNo, orderId: order.id, deptId: dept?.id, rejDate, qty: args.qty, rejType, action, notes: args.notes } }],
          sideEffects: movesStock
            ? [`StockLedger: ${args.qty} pcs OUT of G2 Finished Goods (rejection_out)`]
            : ['Document only — pieces stay in WIP for re-sewing (post_production_entry with rework)'],
        },
        async commit() {
          return await db.$transaction(async (tx) => {
            const rej = await tx.rejectionEntry.create({
              data: { rejNo, orderId: order.id, deptId: dept?.id, rejDate, qty: args.qty, rejType, action, notes: args.notes },
            })
            if (movesStock) {
              const g2 = await tx.godown.findUnique({ where: { code: 'G2' } })
              if (g2) {
                await postLedger(tx, {
                  txnType: 'rejection_out', itemType: 'pcs', itemId: order.id,
                  godownId: g2.id, deptId: dept?.id ?? null, orderId: order.id,
                  docNo: rejNo, docDate: rejDate,
                  out: { pcs: args.qty },
                  notes: `QA rejection (${rejType}) → ${action}`,
                })
              }
            }
            return { id: rej.id, rejNo: rej.rejNo }
          })
        },
      }
    },
  },
  {
    // ── Industry chain: REWORK — defective pieces re-sewn, output booked again. ──
    name: 'post_rework',
    description: 'Post a rework production entry — defective pieces re-processed through a department. Required: orderNo, deptCode, qty, bundleNo. Creates a ProductionEntry with rework=true (kept separate from first-pass output in line status). Document-only: no stock movement.',
    domain: 'production',
    isWrite: true,
    schema: z.object({
      orderNo: z.string(),
      deptCode: z.string(),
      qty: z.number(),
      bundleNo: z.string(),
      prodDate: z.string().optional(),
      operatorCode: z.string().optional(),
      rate: z.number().optional(),
      notes: z.string().optional(),
    }),
    async execute(args) {
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const dept = await db.department.findUnique({ where: { code: args.deptCode } })
      if (!dept) return { text: `Dept ${args.deptCode} not found` }
      const operator = args.operatorCode ? await db.employee.findUnique({ where: { code: args.operatorCode } }) : null
      if (args.operatorCode && !operator) return { text: `Operator ${args.operatorCode} not found` }
      const prodDate = args.prodDate ? new Date(args.prodDate) : new Date()
      const rate = args.rate || 0
      const amount = args.qty * rate

      return {
        text: `Proposed rework entry: ${args.qty} pcs of ${order.orderNo} re-processed @ ${dept.code}.`,
        plan: {
          summary: `Rework | order ${order.orderNo} | dept ${dept.code} | ${args.qty} pcs | bundle ${args.bundleNo}${operator ? ' | operator ' + operator.name : ''} | ₹${amount}`,
          creates: [{ table: 'productionEntry', data: { orderId: order.id, deptId: dept.id, prodDate, bundleNo: args.bundleNo, operatorId: operator?.id, qty: args.qty, rate, amount, rework: true, styleNo: order.styleId } }],
          sideEffects: ['Rework tracked separately from first-pass output', 'Piece-rate earnings accrue to the operator'],
        },
        async commit() {
          const e = await db.productionEntry.create({
            data: { orderId: order.id, deptId: dept.id, prodDate, bundleNo: args.bundleNo, operatorId: operator?.id, qty: args.qty, rate, amount, rework: true },
          })
          return { id: e.id }
        },
      }
    },
  },
  {
    // ── Industry chain: PAYMENT — buyer collection / supplier payment. ──
    name: 'record_payment',
    description: 'Record a payment: buyer collection (direction=in) against a sales invoice, or supplier payment (direction=out). voucherNo auto-assigned RCP-#### (in) / PMT-#### (out). Required: partyCode, amount, direction. Optional: invoiceNo (marks the invoice paid when fully collected), orderNo, mode (cash|bank|cheque|upi), reference (UTR/cheque no), payDate, notes. Also writes a receipt/payment journal voucher.',
    domain: 'accounting',
    isWrite: true,
    schema: z.object({
      voucherNo: z.string().optional(),
      partyCode: z.string(),
      amount: z.number(),
      direction: z.string().optional().describe('in = receipt from buyer (default) | out = payment to supplier'),
      invoiceNo: z.string().optional(),
      orderNo: z.string().optional(),
      mode: z.string().optional(),
      reference: z.string().optional(),
      payDate: z.string().optional(),
      notes: z.string().optional(),
    }),
    async execute(args) {
      const party = await db.party.findUnique({ where: { code: args.partyCode } })
      if (!party) return { text: `Party ${args.partyCode} not found` }
      const direction = args.direction === 'out' ? 'out' : 'in'
      const invoice = args.invoiceNo ? await db.salesInvoice.findUnique({ where: { invoiceNo: args.invoiceNo } }) : null
      if (args.invoiceNo && !invoice) return { text: `Invoice ${args.invoiceNo} not found` }
      const order = args.orderNo ? await db.order.findUnique({ where: { orderNo: args.orderNo } }) : null
      if (args.orderNo && !order) return { text: `Order ${args.orderNo} not found` }
      const voucherNo = await resolveDocNo('payment', 'voucherNo', direction === 'in' ? 'RCP-' : 'PMT-', args.voucherNo)
      const payDate = args.payDate ? new Date(args.payDate) : new Date()
      const mode = args.mode || 'bank'
      const settlesInvoice = invoice && direction === 'in' && args.amount >= invoice.billAmount - 0.01

      return {
        text: `Proposed payment ${voucherNo}: ${direction === 'in' ? 'RECEIVE' : 'PAY'} ₹${args.amount} ${direction === 'in' ? 'from' : 'to'} ${party.name}${invoice ? ' against invoice ' + invoice.invoiceNo : ''}.`,
        plan: {
          summary: `${direction === 'in' ? 'Receipt' : 'Payment'} ${voucherNo} | ${party.name} | ₹${args.amount} | ${mode}${invoice ? ' | invoice ' + invoice.invoiceNo + ' (₹' + invoice.billAmount + ')' : ''}${args.reference ? ' | ref ' + args.reference : ''}`,
          creates: [{ table: 'payment', data: { voucherNo, partyId: party.id, orderId: order?.id, invoiceId: invoice?.id, payDate, finYear: '26-27', direction, amount: args.amount, mode, reference: args.reference, notes: args.notes } }],
          updates: settlesInvoice ? [{ table: 'salesInvoice', id: invoice!.id, data: { status: 'paid' } }] : undefined,
          sideEffects: [
            direction === 'in' ? 'Party receivable reduces' : 'Party payable reduces',
            'Journal voucher written (receipt/payment)',
            settlesInvoice ? `Invoice ${invoice!.invoiceNo} marked paid` : null,
          ].filter((s): s is string => Boolean(s)),
        },
        async commit() {
          return await db.$transaction(async (tx) => {
            const pay = await tx.payment.create({
              data: { voucherNo, partyId: party.id, orderId: order?.id, invoiceId: invoice?.id, payDate, finYear: '26-27', direction, amount: args.amount, mode, reference: args.reference, notes: args.notes },
            })
            await tx.journal.create({
              data: {
                voucherNo: `JV-${voucherNo}`,
                voucherType: direction === 'in' ? 'receipt' : 'payment',
                partyId: party.id,
                date: payDate,
                finYear: '26-27',
                debitAccount: direction === 'in' ? 'Cash/Bank' : party.name,
                creditAccount: direction === 'in' ? party.name : 'Cash/Bank',
                amount: args.amount,
                narration: `${direction === 'in' ? 'Collection' : 'Payment'} ${voucherNo}${invoice ? ' against ' + invoice.invoiceNo : ''}${args.reference ? ' ref ' + args.reference : ''}`,
              },
            })
            if (settlesInvoice) {
              await tx.salesInvoice.update({ where: { id: invoice!.id }, data: { status: 'paid' } })
            }
            return { id: pay.id, voucherNo: pay.voucherNo, invoiceSettled: settlesInvoice }
          })
        },
      }
    },
  },
]


export const allTools: AgentTool[] = [...readTools, ...writeTools]

export function getTool(name: string): AgentTool | undefined {
  return allTools.find((t) => t.name === name)
}

export function toolsForLlm() {
  // Convert to AI SDK tool specs
  return allTools.map((t) => ({
    type: 'function' as const,
    name: t.name,
    description: t.description,
    parameters: t.schema,
  }))
}

function groupBy(arr: any[], path: string) {
  const out: Record<string, number> = {}
  for (const item of arr) {
    const keys = path.split('.')
    let val: any = item
    for (const k of keys) val = val?.[k]
    const key = String(val || 'unknown')
    out[key] = (out[key] || 0) + (item.qty || 0)
  }
  return out
}

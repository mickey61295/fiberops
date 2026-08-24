/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'

// ============== Agent Tool Registry ==============
// Each tool has: name, description, parameters (zod), execute function.
// Read tools return data directly. Write tools return a "plan" (proposed mutations)
// that the user must approve before commit.

import { z } from 'zod'

export type ToolResult = {
  text?: string
  json?: any
  // For write tools: proposed mutations; if present, the UI shows an approval card.
  plan?: {
    summary: string
    creates: Array<{ table: string; data: any }>
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
      const result = []
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
]

// ───────────── WRITE TOOLS (plan-then-commit) ─────────────

const writeTools: AgentTool[] = [
  {
    name: 'create_order',
    description: 'Create a sales order with header + line matrix. Required: orderNo, buyerCode, styleNo, deliveryDate, lines (array of {colourName, sizeName, qty, rate}).',
    domain: 'orders',
    isWrite: true,
    schema: z.object({
      orderNo: z.string(),
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
    }),
    async execute(args) {
      const buyer = await db.buyer.findUnique({ where: { code: args.buyerCode } })
      if (!buyer) return { text: `Buyer ${args.buyerCode} not found. Use list_buyers first.` }
      const style = await db.style.findUnique({ where: { styleNo: args.styleNo } })
      if (!style) return { text: `Style ${args.styleNo} not found. Use list_styles first.` }

      const totalPcs = args.lines.reduce((s, l) => s + l.qty, 0)
      const totalValue = args.lines.reduce((s, l) => s + l.qty * l.rate, 0)
      const finYear = '26-27'

      // Resolve colour/size ids
      const linesData = await Promise.all(args.lines.map(async (l) => {
        const colour = await db.colour.findUnique({ where: { name: l.colourName } })
        const size = await db.size.findUnique({ where: { name: l.sizeName } })
        return { colourId: colour?.id || '', sizeId: size?.id || '', qty: l.qty, rate: l.rate }
      }))

      return {
        text: `Proposed order ${args.orderNo} for ${buyer.name}, style ${style.styleNo}, ${totalPcs} pcs, ₹${totalValue}.`,
        plan: {
          summary: `Create order ${args.orderNo} for ${buyer.name} | style ${style.styleNo} | ${totalPcs} pcs | ₹${totalValue} | delivery ${args.deliveryDate}`,
          creates: [
            { table: 'order', data: { orderNo: args.orderNo, buyerId: buyer.id, styleId: style.id, orderDate: args.orderDate ? new Date(args.orderDate) : new Date(), deliveryDate: new Date(args.deliveryDate), finYear, totalPcs, totalValue, status: 'open', notes: args.notes } },
            ...linesData.map((l) => ({ table: 'orderLine', data: { ...l, styleId: style.id, orderId: '<pending>' } })),
          ],
          sideEffects: ['Stock reservation will be calculated when fabric is issued'],
        },
        async commit() {
          const created = await db.order.create({
            data: {
              orderNo: args.orderNo, buyerId: buyer.id, styleId: style.id,
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
    description: 'Create a purchase order. Required: poNo, poType (yarn|fabric|accessory|general), partyCode, deliveryDate, lines (array of {itemType, itemCode, qty, rate}).',
    domain: 'procurement',
    isWrite: true,
    schema: z.object({
      poNo: z.string(),
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

      return {
        text: `Proposed PO ${args.poNo} (${args.poType}) to ${party.name}, ${totalQty} units, ₹${totalValue}.`,
        plan: {
          summary: `Create PO ${args.poNo} | ${args.poType} | ${party.name} | ${totalQty} units | ₹${totalValue} | delivery ${args.deliveryDate}`,
          creates: [
            { table: 'purchaseOrder', data: { poNo: args.poNo, poType: args.poType, partyId: party.id, orderDate: args.orderDate ? new Date(args.orderDate) : new Date(), deliveryDate: new Date(args.deliveryDate), finYear, totalQty, totalValue, status: 'open', notes: args.notes } },
            ...linesResolved.map((l) => ({ table: 'poLine', data: { ...l, poId: '<pending>' } })),
          ],
          sideEffects: ['Auto-submits for approval workflow; status=open until approved'],
        },
        async commit() {
          const created = await db.purchaseOrder.create({
            data: {
              poNo: args.poNo, poType: args.poType, partyId: party.id,
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
    description: 'Receive a GRN against a PO. Required: grnNo, poNo, godownCode, receivedQty (per line in order). Optional: partyDcRef, deptCode.',
    domain: 'procurement',
    isWrite: true,
    schema: z.object({
      grnNo: z.string(),
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

      return {
        text: `Proposed GRN ${args.grnNo} against ${args.poNo}, ${actualQty} units, ₹${totalValue}.`,
        plan: {
          summary: `Receive GRN ${args.grnNo} against ${args.poNo} | ${actualQty} ${line.uomId || 'units'} | ₹${totalValue} | into ${godown.code}`,
          creates: [
            { table: 'grn', data: { grnNo: args.grnNo, grnType: 'purchase', poId: po.id, partyId: po.partyId, godownId: godown.id, deptId: dept?.id, grnDate: args.grnDate ? new Date(args.grnDate) : new Date(), finYear, partyDcRef: args.partyDcRef, totalQty: actualQty, totalValue } },
            { table: 'grnLine', data: { itemType: line.itemType, itemId: line.itemId, qty: actualQty, rate: line.rate, amount: totalValue } },
            { table: 'stockLedger', data: { txnType: 'purchase_grn', itemType: line.itemType, itemId: line.itemId, godownId: godown.id, deptId: dept?.id, docNo: args.grnNo, docDate: args.grnDate ? new Date(args.grnDate) : new Date(), finYear, inKgs: line.itemType === 'fabric' || line.itemType === 'yarn' ? actualQty : 0, inPcs: line.itemType === 'accessory' ? actualQty : 0, rate: line.rate, partyId: po.partyId, refId: '<pending>' } },
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
                grnNo: args.grnNo, grnType: 'purchase', poId: po.id, partyId: po.partyId,
                godownId: godown.id, deptId: dept?.id, grnDate: args.grnDate ? new Date(args.grnDate) : new Date(),
                finYear, partyDcRef: args.partyDcRef, totalQty: actualQty, totalValue,
                lines: { create: { itemType: line.itemType, itemId: line.itemId, qty: actualQty, rate: line.rate, amount: totalValue } },
              },
            })
            await tx.stockLedger.create({
              data: {
                txnType: 'purchase_grn', itemType: line.itemType, itemId: line.itemId,
                godownId: godown.id, deptId: dept?.id, docNo: args.grnNo,
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
    description: 'Create a sales invoice against an order. Required: invoiceNo, orderNo, partyCode, billType (sales|jobwork|yarn_sales|fab_sales), totalQty, taxableValue, gstRate, gstType (cgst_sgst for intra-state OR igst for inter-state).',
    domain: 'accounting',
    isWrite: true,
    schema: z.object({
      invoiceNo: z.string(),
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

      return {
        text: `Proposed invoice ${args.invoiceNo} for ₹${billAmount} (${args.taxableValue} + ${args.gstRate}% ${args.gstType}).`,
        plan: {
          summary: `Create invoice ${args.invoiceNo} | ${party.name} | order ${args.orderNo} | qty ${args.totalQty} | taxable ₹${args.taxableValue} | GST ${args.gstRate}% ${args.gstType} | total ₹${billAmount}`,
          creates: [
            { table: 'salesInvoice', data: { invoiceNo: args.invoiceNo, invoiceType: 'domestic', orderId: order.id, partyId: party.id, invoiceDate: args.invoiceDate ? new Date(args.invoiceDate) : new Date(), finYear, billType: args.billType, totalQty: args.totalQty, taxableValue: args.taxableValue, cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, billAmount, status: 'issued' } },
          ],
          sideEffects: ['Party AR increases', 'GST payable will be set up', 'Stock will be reduced when despatch is created'],
        },
        async commit() {
          const inv = await db.salesInvoice.create({
            data: {
              invoiceNo: args.invoiceNo, invoiceType: 'domestic', orderId: order.id, partyId: party.id,
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
    description: 'Create a cut order against an order. Required: cutNo, orderNo, fabricIssued (kgs), totalPcs, markerLength, noOfPlies, efficiency.',
    domain: 'cutting',
    isWrite: true,
    schema: z.object({
      cutNo: z.string(),
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
      return {
        text: `Proposed cut order ${args.cutNo} for ${args.orderNo}, ${args.fabricIssued} kgs → ${args.totalPcs} pcs.`,
        plan: {
          summary: `Create cut order ${args.cutNo} | order ${args.orderNo} | fabric ${args.fabricIssued} kgs | ${args.totalPcs} pcs | efficiency ${args.efficiency || 'n/a'}%`,
          creates: [{ table: 'cutOrder', data: { cutNo: args.cutNo, orderId: order.id, cutDate: args.cutDate ? new Date(args.cutDate) : new Date(), fabricIssued: args.fabricIssued, totalPcs: args.totalPcs, markerLength: args.markerLength, noOfPlies: args.noOfPlies, efficiency: args.efficiency, status: 'planned' } }],
          sideEffects: ['Auto-generates cut bundles with barcodes if efficiency provided'],
        },
        async commit() {
          const cut = await db.cutOrder.create({
            data: { cutNo: args.cutNo, orderId: order.id, cutDate: args.cutDate ? new Date(args.cutDate) : new Date(), fabricIssued: args.fabricIssued, totalPcs: args.totalPcs, markerLength: args.markerLength, noOfPlies: args.noOfPlies, efficiency: args.efficiency, status: 'planned' },
          })
          // Auto-generate bundles
          const bundles = Math.ceil(args.totalPcs / 100)
          for (let i = 1; i <= bundles; i++) {
            await db.cutBundle.create({
              data: {
                cutOrderId: cut.id, bundleNo: `${args.cutNo}/B${i}`,
                barcode: `*${args.cutNo.replace(/[^A-Z0-9]/gi, '')}B${String(i).padStart(3, '0')}*`,
                qty: Math.min(100, args.totalPcs - (i - 1) * 100),
                status: 'in_cutting',
              },
            })
          }
          return { id: cut.id, cutNo: cut.cutNo, bundlesCreated: bundles }
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
          const e = await db.productionEntry.create({
            data: {
              orderId: order.id, deptId: dept.id, prodDate: new Date(args.prodDate),
              bundleNo: args.bundleNo, operatorId: operator.id, styleNo: args.styleNo,
              qty: args.qty, rate: args.rate, amount, lineId: args.lineId,
            },
          })
          return { id: e.id }
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

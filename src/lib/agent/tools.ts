/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'

// ============== Agent Tool Registry ==============
// Each tool has: name, description, parameters (zod), execute function.
// Read tools return data directly. Write tools return a "plan" (proposed mutations)
// that the user must approve before commit.

import { z } from 'zod'
import { listUploadDir, extractDocument } from './docExtract'

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
]

// ───────────── WRITE TOOLS (plan-then-commit) ─────────────

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
          const cut = await db.cutOrder.create({
            data: { cutNo: resolvedCutNo, orderId: order.id, cutDate: args.cutDate ? new Date(args.cutDate) : new Date(), fabricIssued: args.fabricIssued, totalPcs: args.totalPcs, markerLength: args.markerLength, noOfPlies: args.noOfPlies, efficiency: args.efficiency, status: 'planned' },
          })
          // Auto-generate bundles
          const bundles = Math.ceil(args.totalPcs / 100)
          for (let i = 1; i <= bundles; i++) {
            await db.cutBundle.create({
              data: {
                cutOrderId: cut.id, bundleNo: `${resolvedCutNo}/B${i}`,
                barcode: `*${resolvedCutNo.replace(/[^A-Z0-9]/gi, '')}B${String(i).padStart(3, '0')}*`,
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

  // ───────────── MASTER CREATE TOOLS ─────────────
  // These close the "agent cannot create masters" gap. Every entity in the
  // schema is now reachable from chat — parties, buyers, styles, items,
  // godowns, departments, employees, colours, sizes, UOMs, etc.

  {
    name: 'create_party',
    description: 'Create a party master (customer / supplier / both). code is optional — auto-assigned PRT-#### if omitted or taken. Required: name, partyType (supplier|customer|both). Optional: gstin, pan, address, city, state, phone, email, openingBalance.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string().optional(),
      name: z.string(),
      partyType: z.string().default('supplier'),
      gstin: z.string().optional(),
      pan: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      openingBalance: z.number().optional(),
    }),
    async execute(args) {
      const resolvedCode = await (async () => {
        const desired = args.code?.trim()
        if (desired) {
          const exists = await db.party.findUnique({ where: { code: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.party.findMany({ where: { code: { startsWith: 'PRT-' } } })
        const used = new Set(all.map((p) => p.code))
        let n = 1
        while (used.has(`PRT-${String(n).padStart(4, '0')}`)) n++
        return `PRT-${String(n).padStart(4, '0')}`
      })()

      return {
        text: `Proposed party ${resolvedCode} — ${args.name} (${args.partyType}).`,
        plan: {
          summary: `Create party ${resolvedCode} | ${args.name} | type ${args.partyType} | city ${args.city || '-'} | GSTIN ${args.gstin || '-'} | opening ₹${args.openingBalance || 0}`,
          creates: [{ table: 'party', data: { code: resolvedCode, name: args.name, partyType: args.partyType, gstin: args.gstin, pan: args.pan, address: args.address, city: args.city, state: args.state, phone: args.phone, email: args.email, openingBalance: args.openingBalance || 0 } }],
          sideEffects: ['Party ledger opening balance created', 'Can now be referenced on orders, POs, invoices, GRNs'],
        },
        async commit() {
          const p = await db.party.create({
            data: { code: resolvedCode, name: args.name, partyType: args.partyType, gstin: args.gstin, pan: args.pan, address: args.address, city: args.city, state: args.state, phone: args.phone, email: args.email, openingBalance: args.openingBalance || 0 },
          })
          return { id: p.id, code: p.code }
        },
      }
    },
  },
  {
    name: 'create_buyer',
    description: 'Create a buyer master (the customer department / brand). code is optional — auto-assigned B-#### if omitted or taken. Required: name. Optional: dept, merchandiser.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string().optional(),
      name: z.string(),
      dept: z.string().optional(),
      merchandiser: z.string().optional(),
    }),
    async execute(args) {
      const resolvedCode = await (async () => {
        const desired = args.code?.trim()
        if (desired) {
          const exists = await db.buyer.findUnique({ where: { code: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.buyer.findMany({ where: { code: { startsWith: 'B-' } } })
        const used = new Set(all.map((b) => b.code))
        let n = 1
        while (used.has(`B-${String(n).padStart(4, '0')}`)) n++
        return `B-${String(n).padStart(4, '0')}`
      })()

      return {
        text: `Proposed buyer ${resolvedCode} — ${args.name}.`,
        plan: {
          summary: `Create buyer ${resolvedCode} | ${args.name} | dept ${args.dept || '-'} | merchandiser ${args.merchandiser || '-'}`,
          creates: [{ table: 'buyer', data: { code: resolvedCode, name: args.name, dept: args.dept, merchandiser: args.merchandiser } }],
          sideEffects: ['Buyer can now be referenced on sales orders and styles'],
        },
        async commit() {
          const b = await db.buyer.create({ data: { code: resolvedCode, name: args.name, dept: args.dept, merchandiser: args.merchandiser } })
          return { id: b.id, code: b.code }
        },
      }
    },
  },
  {
    name: 'create_style',
    description: 'Create a style master. styleNo is optional — auto-assigned STY-#### if omitted or taken. Required: description. Optional: buyerCode, category (woven|knit), sam, hsn.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      styleNo: z.string().optional(),
      description: z.string(),
      buyerCode: z.string().optional(),
      category: z.string().optional(),
      sam: z.number().optional(),
      hsn: z.string().optional(),
    }),
    async execute(args) {
      let buyer: any = null
      if (args.buyerCode) {
        // Accept either the buyer code (B-0001) or the buyer name ("LPP SA")
        buyer = (await db.buyer.findUnique({ where: { code: args.buyerCode } }))
          || (await db.buyer.findFirst({ where: { name: args.buyerCode } }))
        if (!buyer) return { text: `Buyer ${args.buyerCode} not found (tried code and name). Use list_buyers first.` }
      }
      const resolvedStyleNo = await (async () => {
        const desired = args.styleNo?.trim()
        if (desired) {
          const exists = await db.style.findUnique({ where: { styleNo: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.style.findMany({ where: { styleNo: { startsWith: 'STY-' } } })
        const used = new Set(all.map((s) => s.styleNo))
        let n = 1
        while (used.has(`STY-${String(n).padStart(4, '0')}`)) n++
        return `STY-${String(n).padStart(4, '0')}`
      })()

      return {
        text: `Proposed style ${resolvedStyleNo} — ${args.description}.`,
        plan: {
          summary: `Create style ${resolvedStyleNo} | ${args.description} | buyer ${buyer?.name || '-'} | category ${args.category || '-'} | SAM ${args.sam || '-'} | HSN ${args.hsn || '-'}`,
          creates: [{ table: 'style', data: { styleNo: resolvedStyleNo, description: args.description, buyerId: buyer?.id, category: args.category, sam: args.sam, hsn: args.hsn } }],
          sideEffects: ['Style can now be used on sales orders and BOMs'],
        },
        async commit() {
          const s = await db.style.create({ data: { styleNo: resolvedStyleNo, description: args.description, buyerId: buyer?.id, category: args.category, sam: args.sam, hsn: args.hsn } })
          return { id: s.id, styleNo: s.styleNo }
        },
      }
    },
  },
  {
    name: 'create_yarn',
    description: 'Create a yarn master. code is optional — auto-assigned Y-#### if omitted or taken. Required: count, uomCode. Optional: blend, rate.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string().optional(),
      count: z.string(),
      blend: z.string().optional(),
      uomCode: z.string(),
      rate: z.number().optional(),
    }),
    async execute(args) {
      const uom = await db.uOM.findUnique({ where: { code: args.uomCode } })
      if (!uom) return { text: `UOM ${args.uomCode} not found. Use list_uoms first (or create_uom).` }
      const resolvedCode = await (async () => {
        const desired = args.code?.trim()
        if (desired) {
          const exists = await db.yarn.findUnique({ where: { code: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.yarn.findMany({ where: { code: { startsWith: 'Y-' } } })
        const used = new Set(all.map((y) => y.code))
        let n = 1
        while (used.has(`Y-${String(n).padStart(4, '0')}`)) n++
        return `Y-${String(n).padStart(4, '0')}`
      })()

      return {
        text: `Proposed yarn ${resolvedCode} — ${args.count} ${args.blend || ''}.`,
        plan: {
          summary: `Create yarn ${resolvedCode} | count ${args.count} | blend ${args.blend || '-'} | UOM ${uom.name} | rate ₹${args.rate || 0}`,
          creates: [{ table: 'yarn', data: { code: resolvedCode, count: args.count, blend: args.blend, uomId: uom.id, rate: args.rate || 0 } }],
          sideEffects: ['Yarn can now appear on POs, BOMs, GRNs, stock'],
        },
        async commit() {
          const y = await db.yarn.create({ data: { code: resolvedCode, count: args.count, blend: args.blend, uomId: uom.id, rate: args.rate || 0 } })
          return { id: y.id, code: y.code }
        },
      }
    },
  },
  {
    name: 'create_fabric',
    description: 'Create a fabric master. code is optional — auto-assigned F-#### if omitted or taken. Required: uomCode. Optional: construction, gsm, width, diaValue (creates Dia if missing), rate.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string().optional(),
      construction: z.string().optional(),
      gsm: z.number().optional(),
      width: z.number().optional(),
      diaValue: z.string().optional(),
      uomCode: z.string(),
      rate: z.number().optional(),
    }),
    async execute(args) {
      const uom = await db.uOM.findUnique({ where: { code: args.uomCode } })
      if (!uom) return { text: `UOM ${args.uomCode} not found` }
      let dia: any = null
      if (args.diaValue) {
        dia = await db.dia.findUnique({ where: { value: args.diaValue } })
        if (!dia) dia = await db.dia.create({ data: { value: args.diaValue } })
      }
      const resolvedCode = await (async () => {
        const desired = args.code?.trim()
        if (desired) {
          const exists = await db.fabric.findUnique({ where: { code: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.fabric.findMany({ where: { code: { startsWith: 'F-' } } })
        const used = new Set(all.map((f) => f.code))
        let n = 1
        while (used.has(`F-${String(n).padStart(4, '0')}`)) n++
        return `F-${String(n).padStart(4, '0')}`
      })()

      return {
        text: `Proposed fabric ${resolvedCode} — ${args.construction || ''} ${args.gsm ? args.gsm + 'gsm' : ''}.`,
        plan: {
          summary: `Create fabric ${resolvedCode} | construction ${args.construction || '-'} | gsm ${args.gsm || '-'} | width ${args.width || '-'} | dia ${args.diaValue || '-'} | UOM ${uom.name} | rate ₹${args.rate || 0}`,
          creates: [{ table: 'fabric', data: { code: resolvedCode, construction: args.construction, gsm: args.gsm, width: args.width, diaId: dia?.id, uomId: uom.id, rate: args.rate || 0 } }],
          sideEffects: ['Fabric can now appear on POs, BOMs, GRNs, stock, cut orders'],
        },
        async commit() {
          const f = await db.fabric.create({ data: { code: resolvedCode, construction: args.construction, gsm: args.gsm, width: args.width, diaId: dia?.id, uomId: uom.id, rate: args.rate || 0 } })
          return { id: f.id, code: f.code }
        },
      }
    },
  },
  {
    name: 'create_accessory',
    description: 'Create an accessory master (zipper, button, label, etc). code is optional — auto-assigned A-#### if omitted or taken. Required: name, uomCode. Optional: category, rate.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string().optional(),
      name: z.string(),
      category: z.string().optional(),
      uomCode: z.string(),
      rate: z.number().optional(),
    }),
    async execute(args) {
      const uom = await db.uOM.findUnique({ where: { code: args.uomCode } })
      if (!uom) return { text: `UOM ${args.uomCode} not found` }
      const resolvedCode = await (async () => {
        const desired = args.code?.trim()
        if (desired) {
          const exists = await db.accessory.findUnique({ where: { code: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.accessory.findMany({ where: { code: { startsWith: 'A-' } } })
        const used = new Set(all.map((a) => a.code))
        let n = 1
        while (used.has(`A-${String(n).padStart(4, '0')}`)) n++
        return `A-${String(n).padStart(4, '0')}`
      })()

      return {
        text: `Proposed accessory ${resolvedCode} — ${args.name}.`,
        plan: {
          summary: `Create accessory ${resolvedCode} | ${args.name} | category ${args.category || '-'} | UOM ${uom.name} | rate ₹${args.rate || 0}`,
          creates: [{ table: 'accessory', data: { code: resolvedCode, name: args.name, category: args.category, uomId: uom.id, rate: args.rate || 0 } }],
          sideEffects: ['Accessory can now appear on POs, BOMs, GRNs, stock'],
        },
        async commit() {
          const a = await db.accessory.create({ data: { code: resolvedCode, name: args.name, category: args.category, uomId: uom.id, rate: args.rate || 0 } })
          return { id: a.id, code: a.code }
        },
      }
    },
  },
  {
    name: 'create_godown',
    description: 'Create a godown (warehouse). code is optional — auto-assigned G#### if omitted or taken. Required: name. Optional: location.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string().optional(),
      name: z.string(),
      location: z.string().optional(),
    }),
    async execute(args) {
      const resolvedCode = await (async () => {
        const desired = args.code?.trim()
        if (desired) {
          const exists = await db.godown.findUnique({ where: { code: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.godown.findMany({ where: { code: { startsWith: 'G' } } })
        const used = new Set(all.map((g) => g.code))
        let n = 1
        while (used.has(`G${n}`)) n++
        return `G${n}`
      })()

      return {
        text: `Proposed godown ${resolvedCode} — ${args.name}.`,
        plan: {
          summary: `Create godown ${resolvedCode} | ${args.name} | location ${args.location || '-'}`,
          creates: [{ table: 'godown', data: { code: resolvedCode, name: args.name, location: args.location } }],
          sideEffects: ['Godown can now hold stock and receive GRNs'],
        },
        async commit() {
          const g = await db.godown.create({ data: { code: resolvedCode, name: args.name, location: args.location } })
          return { id: g.id, code: g.code }
        },
      }
    },
  },
  {
    name: 'create_department',
    description: 'Create a department / process. code is optional — auto-assigned D#### if omitted or taken. Required: name. Optional: orderSno, isProcess.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string().optional(),
      name: z.string(),
      orderSno: z.number().optional(),
      isProcess: z.boolean().optional(),
    }),
    async execute(args) {
      const resolvedCode = await (async () => {
        const desired = args.code?.trim()
        if (desired) {
          const exists = await db.department.findUnique({ where: { code: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.department.findMany({ where: { code: { startsWith: 'D' } } })
        const used = new Set(all.map((d) => d.code))
        let n = 1
        while (used.has(`D${n}`)) n++
        return `D${n}`
      })()

      return {
        text: `Proposed department ${resolvedCode} — ${args.name}.`,
        plan: {
          summary: `Create department ${resolvedCode} | ${args.name} | isProcess ${args.isProcess || false} | order ${args.orderSno || 0}`,
          creates: [{ table: 'department', data: { code: resolvedCode, name: args.name, orderSno: args.orderSno || 0, isProcess: args.isProcess || false } }],
          sideEffects: ['Department can now hold employees, production entries, stock'],
        },
        async commit() {
          const d = await db.department.create({ data: { code: resolvedCode, name: args.name, orderSno: args.orderSno || 0, isProcess: args.isProcess || false } })
          return { id: d.id, code: d.code }
        },
      }
    },
  },
  {
    name: 'create_employee',
    description: 'Create an employee master. code is optional — auto-assigned EMP-#### if omitted or taken. Required: name. Optional: deptCode, role (operator|supervisor|helper), pieceRate, dailyWage, active.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string().optional(),
      name: z.string(),
      deptCode: z.string().optional(),
      role: z.string().optional(),
      pieceRate: z.number().optional(),
      dailyWage: z.number().optional(),
      active: z.boolean().optional(),
    }),
    async execute(args) {
      let dept: any = null
      if (args.deptCode) {
        dept = await db.department.findUnique({ where: { code: args.deptCode } })
        if (!dept) return { text: `Dept ${args.deptCode} not found` }
      }
      const resolvedCode = await (async () => {
        const desired = args.code?.trim()
        if (desired) {
          const exists = await db.employee.findUnique({ where: { code: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.employee.findMany({ where: { code: { startsWith: 'EMP-' } } })
        const used = new Set(all.map((e) => e.code))
        let n = 1
        while (used.has(`EMP-${String(n).padStart(4, '0')}`)) n++
        return `EMP-${String(n).padStart(4, '0')}`
      })()

      return {
        text: `Proposed employee ${resolvedCode} — ${args.name}.`,
        plan: {
          summary: `Create employee ${resolvedCode} | ${args.name} | dept ${dept?.code || '-'} | role ${args.role || '-'} | piece-rate ₹${args.pieceRate || 0} | daily wage ₹${args.dailyWage || 0}`,
          creates: [{ table: 'employee', data: { code: resolvedCode, name: args.name, deptId: dept?.id, role: args.role, pieceRate: args.pieceRate || 0, dailyWage: args.dailyWage || 0, active: args.active ?? true } }],
          sideEffects: ['Employee can now be assigned to production entries'],
        },
        async commit() {
          const e = await db.employee.create({ data: { code: resolvedCode, name: args.name, deptId: dept?.id, role: args.role, pieceRate: args.pieceRate || 0, dailyWage: args.dailyWage || 0, active: args.active ?? true } })
          return { id: e.id, code: e.code }
        },
      }
    },
  },
  {
    name: 'create_colour',
    description: 'Create a colour master. Required: name, code (e.g. RED, BLK, NAV). If colour exists, returns it.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      name: z.string(),
      code: z.string(),
    }),
    async execute(args) {
      const existing = await db.colour.findUnique({ where: { name: args.name } }).catch(() => null)
      if (existing) return { text: `Colour ${args.name} already exists (code ${existing.code}).` }
      return {
        text: `Proposed colour ${args.code} — ${args.name}.`,
        plan: {
          summary: `Create colour ${args.code} | ${args.name}`,
          creates: [{ table: 'colour', data: { name: args.name, code: args.code } }],
          sideEffects: ['Colour can now be used on order lines, stock, cut bundles'],
        },
        async commit() {
          const c = await db.colour.create({ data: { name: args.name, code: args.code } })
          return { id: c.id, code: c.code }
        },
      }
    },
  },
  {
    name: 'create_size',
    description: 'Create a size master. Required: name (e.g. S, M, L, XL, 32, 34). Optional: sort order.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      name: z.string(),
      sort: z.number().optional(),
    }),
    async execute(args) {
      const existing = await db.size.findUnique({ where: { name: args.name } }).catch(() => null)
      if (existing) return { text: `Size ${args.name} already exists.` }
      return {
        text: `Proposed size ${args.name}.`,
        plan: {
          summary: `Create size ${args.name} | sort ${args.sort || 0}`,
          creates: [{ table: 'size', data: { name: args.name, sort: args.sort || 0 } }],
          sideEffects: ['Size can now be used on order lines, stock, cut bundles'],
        },
        async commit() {
          const s = await db.size.create({ data: { name: args.name, sort: args.sort || 0 } })
          return { id: s.id }
        },
      }
    },
  },
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
    name: 'create_uom',
    description: 'Create a unit of measure master. Required: name (KGS, MTR, PCS, BAG), code (matching). If exists, returns it.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      name: z.string(),
      code: z.string(),
    }),
    async execute(args) {
      const existing = await db.uOM.findUnique({ where: { code: args.code } }).catch(() => null)
      if (existing) return { text: `UOM ${args.code} already exists.` }
      return {
        text: `Proposed UOM ${args.code} — ${args.name}.`,
        plan: {
          summary: `Create UOM ${args.code} | ${args.name}`,
          creates: [{ table: 'uom', data: { name: args.name, code: args.code } }],
          sideEffects: ['UOM can now be used on yarn, fabric, accessory masters'],
        },
        async commit() {
          const u = await db.uOM.create({ data: { name: args.name, code: args.code } })
          return { id: u.id }
        },
      }
    },
  },
  {
    name: 'create_dia',
    description: 'Create a dia (machine diameter) master. Required: value (e.g. "30", "34"). If exists, returns it.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      value: z.string(),
    }),
    async execute(args) {
      const existing = await db.dia.findUnique({ where: { value: args.value } }).catch(() => null)
      if (existing) return { text: `Dia ${args.value} already exists.` }
      return {
        text: `Proposed dia ${args.value}.`,
        plan: {
          summary: `Create dia ${args.value}`,
          creates: [{ table: 'dia', data: { value: args.value } }],
          sideEffects: ['Dia can now be used on fabric masters'],
        },
        async commit() {
          const d = await db.dia.create({ data: { value: args.value } })
          return { id: d.id }
        },
      }
    },
  },
  {
    name: 'create_lot',
    description: 'Create a lot master. lotNo is optional — auto-assigned LOT-#### if omitted or taken. Optional: partyCode.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      lotNo: z.string().optional(),
      partyCode: z.string().optional(),
    }),
    async execute(args) {
      let party: any = null
      if (args.partyCode) {
        party = await db.party.findUnique({ where: { code: args.partyCode } })
        if (!party) return { text: `Party ${args.partyCode} not found` }
      }
      const resolvedLotNo = await (async () => {
        const desired = args.lotNo?.trim()
        if (desired) {
          const exists = await db.lot.findUnique({ where: { lotNo: desired } }).catch(() => null)
          if (!exists) return desired
        }
        const all = await db.lot.findMany({ where: { lotNo: { startsWith: 'LOT-' } } })
        const used = new Set(all.map((l) => l.lotNo))
        let n = 1
        while (used.has(`LOT-${String(n).padStart(4, '0')}`)) n++
        return `LOT-${String(n).padStart(4, '0')}`
      })()

      return {
        text: `Proposed lot ${resolvedLotNo}.`,
        plan: {
          summary: `Create lot ${resolvedLotNo} | party ${party?.code || '-'}`,
          creates: [{ table: 'lot', data: { lotNo: resolvedLotNo, partyId: party?.id } }],
          sideEffects: ['Lot can now be assigned to GRNs and stock'],
        },
        async commit() {
          const l = await db.lot.create({ data: { lotNo: resolvedLotNo, partyId: party?.id } })
          return { id: l.id }
        },
      }
    },
  },
  {
    name: 'create_season',
    description: 'Create a season master. Required: code, name. Optional: startDate, endDate.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string(),
      name: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
    async execute(args) {
      const existing = await db.season.findUnique({ where: { code: args.code } }).catch(() => null)
      if (existing) return { text: `Season ${args.code} already exists.` }
      return {
        text: `Proposed season ${args.code} — ${args.name}.`,
        plan: {
          summary: `Create season ${args.code} | ${args.name} | ${args.startDate || '?'} → ${args.endDate || '?'}`,
          creates: [{ table: 'season', data: { code: args.code, name: args.name, startDate: args.startDate ? new Date(args.startDate) : null, endDate: args.endDate ? new Date(args.endDate) : null } }],
          sideEffects: ['Season can now be referenced on orders'],
        },
        async commit() {
          const s = await db.season.create({ data: { code: args.code, name: args.name, startDate: args.startDate ? new Date(args.startDate) : null, endDate: args.endDate ? new Date(args.endDate) : null } })
          return { id: s.id }
        },
      }
    },
  },
  {
    name: 'create_merchandiser',
    description: 'Create a merchandiser master. Required: name. Optional: email, phone.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
    }),
    async execute(args) {
      const existing = await db.merchandiser.findUnique({ where: { name: args.name } }).catch(() => null)
      if (existing) return { text: `Merchandiser ${args.name} already exists.` }
      return {
        text: `Proposed merchandiser ${args.name}.`,
        plan: {
          summary: `Create merchandiser ${args.name} | email ${args.email || '-'} | phone ${args.phone || '-'}`,
          creates: [{ table: 'merchandiser', data: { name: args.name, email: args.email, phone: args.phone } }],
          sideEffects: ['Merchandiser can be assigned to buyers'],
        },
        async commit() {
          const m = await db.merchandiser.create({ data: { name: args.name, email: args.email, phone: args.phone } })
          return { id: m.id }
        },
      }
    },
  },
  {
    name: 'create_exporter',
    description: 'Create an exporter master (the exporting entity). Required: code, name. Optional: iec, gstin.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string(),
      name: z.string(),
      iec: z.string().optional(),
      gstin: z.string().optional(),
    }),
    async execute(args) {
      const existing = await db.exporter.findUnique({ where: { code: args.code } }).catch(() => null)
      if (existing) return { text: `Exporter ${args.code} already exists.` }
      return {
        text: `Proposed exporter ${args.code} — ${args.name}.`,
        plan: {
          summary: `Create exporter ${args.code} | ${args.name} | IEC ${args.iec || '-'} | GSTIN ${args.gstin || '-'}`,
          creates: [{ table: 'exporter', data: { code: args.code, name: args.name, iec: args.iec, gstin: args.gstin } }],
          sideEffects: ['Exporter can be referenced on export invoices / shipping bills'],
        },
        async commit() {
          const e = await db.exporter.create({ data: { code: args.code, name: args.name, iec: args.iec, gstin: args.gstin } })
          return { id: e.id }
        },
      }
    },
  },
  {
    name: 'create_fin_year',
    description: 'Create a financial year. Required: code, name, start, end. Optional: active (set true for current FY).',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string(),
      name: z.string(),
      start: z.string(),
      end: z.string(),
      active: z.boolean().optional(),
    }),
    async execute(args) {
      const existing = await db.finYear.findUnique({ where: { code: args.code } }).catch(() => null)
      if (existing) return { text: `FinYear ${args.code} already exists.` }
      return {
        text: `Proposed FinYear ${args.code} — ${args.name}.`,
        plan: {
          summary: `Create FinYear ${args.code} | ${args.name} | ${args.start} → ${args.end} | active ${args.active || false}`,
          creates: [{ table: 'finYear', data: { code: args.code, name: args.name, start: new Date(args.start), end: new Date(args.end), active: args.active || false } }],
          sideEffects: ['If active=true, all transactions will post to this FY'],
        },
        async commit() {
          const f = await db.finYear.create({ data: { code: args.code, name: args.name, start: new Date(args.start), end: new Date(args.end), active: args.active || false } })
          return { id: f.id }
        },
      }
    },
  },
  {
    name: 'create_line',
    description: 'Create a production line. Required: code, name. Optional: deptCode, capacityPcsPerHour.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string(),
      name: z.string(),
      deptCode: z.string().optional(),
      capacityPcsPerHour: z.number().optional(),
    }),
    async execute(args) {
      let dept: any = null
      if (args.deptCode) {
        dept = await db.department.findUnique({ where: { code: args.deptCode } })
        if (!dept) return { text: `Dept ${args.deptCode} not found` }
      }
      const existing = await db.line.findUnique({ where: { code: args.code } }).catch(() => null)
      if (existing) return { text: `Line ${args.code} already exists.` }
      return {
        text: `Proposed line ${args.code} — ${args.name}.`,
        plan: {
          summary: `Create line ${args.code} | ${args.name} | dept ${dept?.code || '-'} | cap ${args.capacityPcsPerHour || 0} pcs/hr`,
          creates: [{ table: 'line', data: { code: args.code, name: args.name, deptId: dept?.id, capacityPcsPerHour: args.capacityPcsPerHour || 0 } }],
          sideEffects: ['Line can be assigned to production entries'],
        },
        async commit() {
          const l = await db.line.create({ data: { code: args.code, name: args.name, deptId: dept?.id, capacityPcsPerHour: args.capacityPcsPerHour || 0 } })
          return { id: l.id }
        },
      }
    },
  },
  {
    name: 'create_size_group',
    description: 'Create a size group master. Required: name, sizes (CSV of size names). Resolves each size name to a Size row.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      name: z.string(),
      sizes: z.array(z.string()),
    }),
    async execute(args) {
      const existing = await db.sizeGroup.findUnique({ where: { name: args.name } }).catch(() => null)
      if (existing) return { text: `Size group ${args.name} already exists.` }
      const sizes = await Promise.all(args.sizes.map(async (n) => db.size.findUnique({ where: { name: n } })))
      const ids = sizes.filter(Boolean).map((s: any) => s.id)
      return {
        text: `Proposed size group ${args.name} with ${ids.length} sizes.`,
        plan: {
          summary: `Create size group ${args.name} | sizes: ${args.sizes.join(', ')}`,
          creates: [{ table: 'sizeGroup', data: { name: args.name, sizes: ids.join(',') } }],
          sideEffects: ['Size group can be applied to styles'],
        },
        async commit() {
          const sg = await db.sizeGroup.create({ data: { name: args.name, sizes: ids.join(',') } })
          return { id: sg.id }
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
          const d = await db.pcsDespatch.create({
            data: {
              dcNo: resolvedDcNo, orderId: order.id, buyerId: order.buyerId,
              despatchDate: args.despatchDate ? new Date(args.despatchDate) : new Date(),
              finYear, totalPcs: args.totalPcs, vehicleNo: args.vehicleNo, courierName: args.courierName, status: 'despatched',
              lines: { create: lines.map((l) => ({ styleNo: l.styleNo, qty: l.qty, rate: l.rate || 0 })) },
            },
          })
          return { id: d.id, dcNo: d.dcNo }
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
    name: 'update_party',
    description: 'Update an existing party master by code. All fields optional; only provided fields are updated.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string(),
      name: z.string().optional(),
      partyType: z.string().optional(),
      gstin: z.string().optional(),
      pan: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      openingBalance: z.number().optional(),
    }),
    async execute(args) {
      const party = await db.party.findUnique({ where: { code: args.code } })
      if (!party) return { text: `Party ${args.code} not found` }
      const { code: _code, ...patch } = args
      return {
        text: `Proposed update to party ${args.code}.`,
        plan: {
          summary: `Update party ${args.code} | fields: ${Object.keys(patch).join(', ') || 'none'}`,
          updates: [{ table: 'party', id: party.id, data: patch }],
          sideEffects: ['Party master updated'],
        },
        async commit() {
          await db.party.update({ where: { id: party.id }, data: patch })
          return { id: party.id, code: party.code }
        },
      }
    },
  },
  {
    name: 'update_employee',
    description: 'Update an existing employee by code. All fields optional; only provided fields are updated.',
    domain: 'masters',
    isWrite: true,
    schema: z.object({
      code: z.string(),
      name: z.string().optional(),
      deptCode: z.string().optional(),
      role: z.string().optional(),
      pieceRate: z.number().optional(),
      dailyWage: z.number().optional(),
      active: z.boolean().optional(),
    }),
    async execute(args) {
      const emp = await db.employee.findUnique({ where: { code: args.code } })
      if (!emp) return { text: `Employee ${args.code} not found` }
      const { code: _code, deptCode, ...patch } = args
      let deptId: string | undefined
      if (deptCode) {
        const dept = await db.department.findUnique({ where: { code: deptCode } })
        if (!dept) return { text: `Dept ${deptCode} not found` }
        deptId = dept.id
      }
      const data: any = { ...patch }
      if (deptId !== undefined) data.deptId = deptId
      return {
        text: `Proposed update to employee ${args.code}.`,
        plan: {
          summary: `Update employee ${args.code} | fields: ${Object.keys(data).join(', ') || 'none'}`,
          updates: [{ table: 'employee', id: emp.id, data }],
          sideEffects: ['Employee master updated'],
        },
        async commit() {
          await db.employee.update({ where: { id: emp.id }, data })
          return { id: emp.id, code: emp.code }
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

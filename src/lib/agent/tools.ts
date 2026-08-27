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
// SPEC-M4 — register read tools delegate to the shared register services
// (the read-side twin of ADR-001): same query path as the register screens.
import { queryStockLedger } from '@/lib/erp/registers/stock-ledger'
import { queryDailyInOut } from '@/lib/erp/registers/daily-inout'
import { queryOrderRegister } from '@/lib/erp/registers/order-register'
// SPEC-M3 Wave A — the transaction write tools are now THIN delegates over the
// posting services (ADR-001 at transaction scale). Schemas move VERBATIM into
// src/lib/erp/schemas/ (the agent prompt contract must not drift); the chain
// definition lives in src/lib/erp/chain.ts (ADR-007).
import { CHAIN, CHAIN_ORDER_INCLUDE, computeChainState, resolveStageUrl } from '@/lib/erp/chain'
import type { DocPlanResult } from '@/lib/erp/posting/types'
import { ORDER_SCHEMA } from '@/lib/erp/schemas/order'
import { BOM_SCHEMA } from '@/lib/erp/schemas/bom'
import { PROGRAM_SCHEMA } from '@/lib/erp/schemas/program'
import { PURCHASE_ORDER_SCHEMA } from '@/lib/erp/schemas/purchase-order'
import { GRN_SCHEMA } from '@/lib/erp/schemas/grn'
import { JOBWORK_OUT_SCHEMA, JOBWORK_IN_SCHEMA } from '@/lib/erp/schemas/jobwork'
import { CUT_ORDER_SCHEMA } from '@/lib/erp/schemas/cut'
import { LINE_ISSUE_SCHEMA } from '@/lib/erp/schemas/line-issue'
import { PRODUCTION_ENTRY_SCHEMA, REWORK_SCHEMA } from '@/lib/erp/schemas/production'
import { REJECTION_SCHEMA } from '@/lib/erp/schemas/rejection'
import { DESPATCH_SCHEMA } from '@/lib/erp/schemas/despatch'
import { INVOICE_SCHEMA } from '@/lib/erp/schemas/invoice'
import { DEBIT_NOTE_SCHEMA } from '@/lib/erp/schemas/debit-note'
import { JOURNAL_SCHEMA } from '@/lib/erp/schemas/journal'
import { COST_SHEET_SCHEMA } from '@/lib/erp/schemas/cost-sheet'
import { PAYMENT_SCHEMA } from '@/lib/erp/schemas/payment'
import { STOCK_ADJ_SCHEMA } from '@/lib/erp/schemas/stock-adj'
import { TRANSFER_SCHEMA } from '@/lib/erp/schemas/transfer'
import { CANCEL_ORDER_SCHEMA, CANCEL_PO_SCHEMA, CANCEL_INVOICE_SCHEMA } from '@/lib/erp/schemas/cancel'
import { planOrder } from '@/lib/erp/posting/order'
import { planBom } from '@/lib/erp/posting/bom'
import { planProgram } from '@/lib/erp/posting/program'
import { planPurchaseOrder } from '@/lib/erp/posting/purchase-order'
import { planGrn } from '@/lib/erp/posting/grn'
import { planJobworkOut, planJobworkIn } from '@/lib/erp/posting/jobwork'
import { planCutOrder } from '@/lib/erp/posting/cut'
import { planLineIssue } from '@/lib/erp/posting/line-issue'
import { planProductionEntry, planReworkEntry } from '@/lib/erp/posting/production'
import { planRejection } from '@/lib/erp/posting/rejection'
import { planPcsDespatch } from '@/lib/erp/posting/despatch'
import { planInvoice } from '@/lib/erp/posting/invoice'
import { planDebitNote } from '@/lib/erp/posting/debit-note'
import { planJournal } from '@/lib/erp/posting/journal'
import { planCostSheet } from '@/lib/erp/posting/cost-sheet'
import { planPayment } from '@/lib/erp/posting/payment'
import { planStockAdjustment } from '@/lib/erp/posting/stock-adj'
import { planTransfer } from '@/lib/erp/posting/transfer'
import { planCancelOrder, planCancelPo, planCancelInvoice } from '@/lib/erp/posting/cancel'

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
      // Delegates to the shared register service (SPEC-M4 §5) — the same read
      // path the /orders/register screen uses. json shape frozen (M3 contract);
      // buyerId stays ignored exactly as before (verbatim behavior).
      const res = await queryOrderRegister({
        status: args.status,
        limit: args.limit ?? 50,
        page: 1,
      })
      return {
        text: `Found ${res.rows.length} orders.`,
        json: res.rows.map((o) => ({
          id: o.id, orderNo: o.orderNo, buyer: o.buyer, style: o.style,
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
      // Delegates to the shared register service (SPEC-M4 §5) — the same read
      // path the /inventory/ledger screen uses. json shape frozen (M3 contract).
      const res = await queryStockLedger({
        itemType: args.itemType,
        godown: args.godownCode,
        limit: args.limit ?? 50,
        page: 1,
      })
      return {
        text: `Found ${res.rows.length} ledger entries.`,
        json: res.rows.map((l) => ({
          txnType: l.txnType, itemType: l.itemType,
          inKgs: l.inKgs, outKgs: l.outKgs, inPcs: l.inPcs, outPcs: l.outPcs,
          rate: l.rate, docNo: l.docNo, docDate: l.docDate,
          godown: l.godown, party: l.party,
        })),
      }
    },
  },
  {
    name: 'get_daily_in_out',
    description: 'Get the daily stock in/out day-book (all movements) optionally filtered by date and godown. Totals are per-uom.',
    domain: 'inventory',
    isWrite: false,
    schema: z.object({
      date: z.string().optional().describe('YYYY-MM-DD — movements for this day'),
      godownCode: z.string().optional(),
    }),
    async execute(args) {
      const day = args.date ? new Date(args.date) : undefined
      const res = await queryDailyInOut({
        from: day && !isNaN(day.getTime()) ? day : undefined,
        to: day && !isNaN(day.getTime()) ? day : undefined,
        godown: args.godownCode,
        limit: 200,
        page: 1,
      })
      const t = res.totals?.map((t) => `${t.label} ${typeof t.value === 'number' ? t.value.toLocaleString('en-IN') : t.value}`).join(', ') ?? ''
      return {
        text: `${res.count} movements. ${t}`,
        json: res.rows.map((l) => ({
          date: l.docDate, godown: l.godown, txnType: l.txnType, docNo: l.docNo,
          itemCode: l.itemCode, party: l.party,
          inKgs: l.inKgs, outKgs: l.outKgs, inPcs: l.inPcs, outPcs: l.outPcs,
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
        // Keep `entity` as the type string; the fetched record goes under `entityData`.
        let entityData: any = null
        if (a.entity === 'po') {
          entityData = await db.purchaseOrder.findUnique({
            where: { id: a.entityId }, include: { party: true, lines: true },
          })
        }
        return { ...a, entityData }
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
    // SPEC-M3 §4: the pipeline definition now lives in src/lib/erp/chain.ts
    // (ADR-007 single source — the DocScreen chain bar reads the same CHAIN).
    name: 'suggest_next_step',
    description: 'Given an order (SO-####), inspect its current pipeline state and return the NEXT canonical step in the Tirupur knitwear job-work flow (order → BOM → program → PO → GRN → jobwork → cut → issue-to-line → production → rework/rejection → despatch → invoice → cost sheet → collection). The response includes a pre-filled args skeleton the user can paste back. If no orderNo is given, returns the full pipeline template.',
    domain: 'workflow',
    isWrite: false,
    schema: z.object({
      orderNo: z.string().optional().describe('Sales order number like SO-1001. If omitted, returns the canonical pipeline template.'),
    }),
    async execute(args) {
      if (!args.orderNo) {
        return {
          text: 'CANONICAL TIRUPUR KNITWEAR JOB-WORK PIPELINE\n' + CHAIN.map((p) => `${p.step}. ${p.name} → ${p.tool}`).join('\n'),
          json: { pipeline: CHAIN },
        }
      }

      const order = await db.order.findUnique({
        where: { orderNo: args.orderNo },
        include: CHAIN_ORDER_INCLUDE,
      })
      if (!order) return { text: `Order ${args.orderNo} not found.` }

      const has = computeChainState(order)
      const produced = order.productionEntries?.filter((e: any) => !e.rework).reduce((s: number, e: any) => s + e.qty, 0) || 0
      const producedPct = order.totalPcs > 0 ? Math.round((produced / order.totalPcs) * 100) : 0

      let nextStep: typeof CHAIN[number] = CHAIN[2]
      let skeleton: Record<string, any> = {}
      const today = new Date().toISOString().slice(0, 10)
      const inv = order.salesInvoices?.[0] // hoisted: nextFormUrl (§9.5) + payment skeleton share it

      if (!has.bom) {
        nextStep = CHAIN[1]
        skeleton = {
          styleNo: order.style?.styleNo,
          components: [{ itemType: 'yarn', qty: Math.ceil(order.totalPcs * 0.25), uom: 'kg' }],
          notes: `BOM for order ${order.orderNo} (estimate: 0.25 kg/pc — adjust to actual GSM)`,
        }
      } else if (!has.program) {
        nextStep = CHAIN[2]
        skeleton = {
          orderNo: order.orderNo,
          stage: 'knitting',
          requiredKgs: Math.ceil(order.totalPcs * 0.25),
          notes: `Knitting program for ${order.orderNo}`,
        }
      } else if (!has.cut) {
        nextStep = CHAIN[7]
        skeleton = {
          orderNo: order.orderNo,
          fabricIssued: Math.ceil(order.totalPcs * 0.25),
          totalPcs: order.totalPcs,
          cutDate: today,
        }
      } else if (!has.lineIssue) {
        nextStep = CHAIN[8]
        skeleton = {
          orderNo: order.orderNo,
          lineCode: 'L1',
          qty: order.totalPcs,
          issueDate: today,
        }
      } else if (!has.production) {
        nextStep = CHAIN[9]
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
        nextStep = CHAIN[12]
        skeleton = {
          orderNo: order.orderNo,
          invoiceType: 'domestic',
          invoiceDate: today,
        }
      } else if (!has.cost) {
        nextStep = CHAIN[13]
        skeleton = { orderNo: order.orderNo }
      } else {
        nextStep = CHAIN[14]
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
              produced, producedPct, state: has, completed: CHAIN.map((p) => p.step),
              nextStep: null, skeleton: null, nextFormUrl: null, pipelineComplete: true,
            },
          }
        }
      }

      const completed = CHAIN.filter((p) => {
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

      // W1's agent-side twin (SPEC-M3 §9.5): the ready-to-click form route for
      // the next step. The agent panel renders it as an "Open form" button.
      const nextFormUrl = resolveStageUrl(nextStep, {
        orderNo: order.orderNo,
        id: order.id,
        invoiceNo: inv?.invoiceNo,
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
          nextFormUrl,
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

// ───────────── TRANSACTION DOC TOOLS (SPEC-M3 §5) — thin delegates ─────────────
// ADR-001 at transaction scale: ALL business logic lives in
// src/lib/erp/posting/<op>.ts. These tools and the form server actions (Wave B)
// call the SAME plan/commit functions — form and agent behavior cannot drift.
// Schemas are imported VERBATIM from src/lib/erp/schemas/ (the agent's
// tool-calling contract). Non-chain writes that are NOT in the SPEC-M3 §5
// inventory (approve_pending, adjust_stock, update_order, create_sizes) stay
// inline below until their own extraction decision.

function docTool(
  name: string,
  description: string,
  domain: string,
  schema: z.ZodObject<any, any>,
  plan: (input: any) => Promise<DocPlanResult>,
): AgentTool {
  return {
    name,
    description,
    domain,
    isWrite: true,
    schema,
    async execute(args) {
      const result = await plan(args)
      if (!result.ok) return { text: result.error }
      return {
        text: result.text,
        plan: {
          summary: result.summary,
          creates: result.creates,
          updates: result.updates,
          sideEffects: result.sideEffects,
        },
        commit: result.commit,
      }
    },
  }
}

const docTools: AgentTool[] = [
  docTool(
    'create_order',
    'Create a sales order with header + line matrix. orderNo is optional — if omitted or already taken, the next free SO-#### is auto-assigned (pass the buyer\'s own PO number when ingesting buyer POs). Required: buyerCode, styleNo, deliveryDate, lines (array of {colourName, sizeName, qty, rate}). Optional: orderDate, finYear (defaults to current 26-27; use e.g. "24-25" for historical documents), notes.',
    'orders',
    ORDER_SCHEMA,
    planOrder,
  ),
  docTool(
    'create_purchase_order',
    'Create a purchase order. poNo is optional — if omitted or already taken, the next free PO-{Y|F|A}-{seq} is auto-assigned based on poType. Required: poType (yarn|fabric|accessory|general), partyCode, deliveryDate, lines (array of {itemType, itemCode, qty, rate}).',
    'procurement',
    PURCHASE_ORDER_SCHEMA,
    planPurchaseOrder,
  ),
  docTool(
    'receive_grn',
    'Receive a GRN against a PO. grnNo is optional — auto-assigned GRN-#### if omitted or colliding. Required: poNo, godownCode, receivedQty (per line in order). Optional: partyDcRef, deptCode.',
    'procurement',
    GRN_SCHEMA,
    planGrn,
  ),
  docTool(
    'create_sales_invoice',
    'Create a sales invoice against an order. invoiceNo is optional — auto-assigned INV-#### if omitted or colliding. Required: orderNo, partyCode, billType (sales|jobwork|yarn_sales|fab_sales), totalQty, taxableValue, gstRate, gstType (cgst_sgst for intra-state OR igst for inter-state).',
    'accounting',
    INVOICE_SCHEMA,
    planInvoice,
  ),
  docTool(
    'create_cut_order',
    'Create a cut order against an order. cutNo is optional — auto-assigned CUT-#### if omitted or colliding. Required: orderNo, fabricIssued (kgs), totalPcs, markerLength, noOfPlies, efficiency.',
    'cutting',
    CUT_ORDER_SCHEMA,
    planCutOrder,
  ),
  docTool(
    'post_production_entry',
    'Post a production entry. Required: orderNo, deptCode, prodDate, bundleNo, operatorCode, qty, rate. Optional: styleNo, colourName, sizeName, lineId.',
    'production',
    PRODUCTION_ENTRY_SCHEMA,
    planProductionEntry,
  ),
]

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
  ...docTools,
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
  docTool(
    'cancel_order',
    'Cancel an order by orderNo (sets status=cancelled).',
    'orders',
    CANCEL_ORDER_SCHEMA,
    planCancelOrder,
  ),

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
  docTool(
    'create_bom',
    'Create a Bill of Materials line for a style. Required: styleNo, lines (array of {itemType (yarn|fabric|accessory), itemCode, qty, rate}). Optional: uomCode.',
    'masters',
    BOM_SCHEMA,
    planBom,
  ),

  // ───────────── TRANSACTIONAL WRITE TOOLS (gaps) ─────────────

  docTool(
    'create_jobwork_order',
    'Send material out to a jobworker (washing/dyeing/printing/embroidery). dcNo is optional — auto-assigned JW-#### if omitted or taken. Required: jobworkerCode (party), processType, totalQty, totalValue. Optional: orderId, expectedInDate.',
    'production',
    JOBWORK_OUT_SCHEMA,
    planJobworkOut,
  ),
  docTool(
    'create_pcs_despatch',
    'Despatch finished goods (pieces) to a buyer. dcNo is optional — auto-assigned DC-#### if omitted or taken. Required: orderNo, totalPcs. Optional: buyerCode (defaults from order), vehicleNo, courierName, lines (array of {styleNo, colourName, sizeName, qty, rate}).',
    'orders',
    DESPATCH_SCHEMA,
    planPcsDespatch,
  ),
  docTool(
    'create_debit_note',
    'Raise a debit note against a party. noteNo is optional — auto-assigned DN-#### if omitted or taken. Required: noteType (acc|fabric|yarn|pcs|comm), partyCode, amount. Optional: reason.',
    'accounting',
    DEBIT_NOTE_SCHEMA,
    planDebitNote,
  ),
  docTool(
    'create_journal',
    'Post a journal voucher (receipt | payment | contra | journal). voucherNo is optional — auto-assigned V-#### if omitted or taken. Required: voucherType, debitAccount, creditAccount, amount. Optional: partyCode, narration, date.',
    'accounting',
    JOURNAL_SCHEMA,
    planJournal,
  ),
  docTool(
    'create_cost_sheet',
    'Create / update a cost sheet for an order. version defaults to 1; if a sheet exists, the next version is auto-assigned. Required: orderNo. All cost fields optional — fabricCost, trimCost, cmCost, washingCost, packingCost, overheads, commissionPct, marginPct, sellingPrice.',
    'costing',
    COST_SHEET_SCHEMA,
    planCostSheet,
  ),

  // ───────────── UPDATE / CANCEL TOOLS ─────────────

  docTool(
    'cancel_purchase_order',
    'Cancel a purchase order by poNo (sets status=cancelled).',
    'procurement',
    CANCEL_PO_SCHEMA,
    planCancelPo,
  ),
  docTool(
    'cancel_invoice',
    'Cancel a sales invoice by invoiceNo (sets status=cancelled).',
    'accounting',
    CANCEL_INVOICE_SCHEMA,
    planCancelInvoice,
  ),
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
  docTool(
    'receive_jobwork',
    'Mark a jobwork DC as received back from the jobworker. Required: dcNo. Optional: receivedDate, receivedQty (defaults to sent qty).',
    'production',
    JOBWORK_IN_SCHEMA,
    planJobworkIn,
  ),
  docTool(
    'create_program',
    'Create a production PROGRAM for an order — the production plan step right after BOM. For a knitting program pass stage=knitting + yarnCode + requiredKgs; for a dyeing program pass stage=dyeing + fabricCode + requiredKgs; for sewing/finishing/packing pass requiredPcs. programNo auto-assigned PGM-####. Dept auto-maps from stage (knitting→D1, dyeing→D2, sewing→D4, finishing→D5, packing→D6) unless deptCode given. Also updates the legacy ProgBalanceYarn/ProgBalanceFabric projector rows.',
    'production',
    PROGRAM_SCHEMA,
    planProgram,
  ),
  docTool(
    'issue_to_line',
    'Issue cut pieces from the main godown (G1) to a sewing line. issueNo auto-assigned LI-####. Required: orderNo, lineCode, qty. Moves pcs out of G1 in the stock ledger (txn ready_to_cut_out).',
    'production',
    LINE_ISSUE_SCHEMA,
    planLineIssue,
  ),
  docTool(
    'post_rejection',
    'Post a QA rejection for an order. rejNo auto-assigned REJ-####. Required: orderNo, qty. Optional: rejType (stitch_fault | size_fault | fabric_fault | shade_fault | damage | other), action (scrap | rework | return_to_party), deptCode, notes. Scrap/return actions move qty OUT of G2 (Finished Goods) in the stock ledger; rework action is document-only (pieces go back to the line via post_production_entry with rework).',
    'production',
    REJECTION_SCHEMA,
    planRejection,
  ),
  docTool(
    'post_rework',
    'Post a rework production entry — defective pieces re-processed through a department. Required: orderNo, deptCode, qty, bundleNo. Creates a ProductionEntry with rework=true (kept separate from first-pass output in line status). Document-only: no stock movement.',
    'production',
    REWORK_SCHEMA,
    planReworkEntry,
  ),
  docTool(
    'record_payment',
    'Record a payment: buyer collection (direction=in) against a sales invoice, or supplier payment (direction=out). voucherNo auto-assigned RCP-#### (in) / PMT-#### (out). Required: partyCode, amount, direction. Optional: invoiceNo (marks the invoice paid when fully collected), orderNo, mode (cash|bank|cheque|upi), reference (UTR/cheque no), payDate, notes. Also writes a receipt/payment journal voucher.',
    'accounting',
    PAYMENT_SCHEMA,
    planPayment,
  ),
  docTool(
    'post_stock_adjustment',
    'Adjust stock at a godown (Add or Less). docNo auto-assigned ADJ-####. Required: godownCode, itemType (yarn|fabric|accessory), itemCode, qty (positive; kgs for yarn/fabric, pcs for accessory), action (add|less), reason. Posts a stock_adjustment_add/less ledger row and updates current stock.',
    'inventory',
    STOCK_ADJ_SCHEMA,
    planStockAdjustment,
  ),
  docTool(
    'transfer_stock',
    'Move stock between godowns. docNo auto-assigned GT-####. Required: itemType (yarn|fabric|accessory), itemCode, fromGodownCode, toGodownCode (must differ), qty (positive; kgs for yarn/fabric, pcs for accessory). Optional: notes, transferDate. Writes the godown_transfer_out + godown_transfer_in ledger pair in ONE transaction — total stock is unchanged.',
    'inventory',
    TRANSFER_SCHEMA,
    planTransfer,
  ),
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

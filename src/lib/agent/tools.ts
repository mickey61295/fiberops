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
import { queryInhandOrders } from '@/lib/erp/registers/inhand'
import { queryPartyBalance, getPartyPoBalances } from '@/lib/erp/registers/party-balance'
import { fetchCurrentStock } from '@/lib/erp/registers/stock-register'
import { queryLots } from '@/lib/erp/registers/lots'
import { queryRateConfirmation } from '@/lib/erp/registers/rate-confirmation'
import { queryPieceRates } from '@/lib/erp/registers/piece-rates'
import { queryWages } from '@/lib/erp/registers/wages'
import { queryAttendance } from '@/lib/erp/registers/attendance'
import { queryIoHistory } from '@/lib/erp/registers/io-history'
import { queryProductionStatus } from '@/lib/erp/registers/production-status'
import { queryJobwork } from '@/lib/erp/registers/jobwork'
import { queryBillsRegister } from '@/lib/erp/registers/bills'
import { querySupplierBills } from '@/lib/erp/registers/supplier-bills'
import { getPartyLedgerSummary } from '@/lib/erp/registers/party-ledger'
import { getOrderBudgetActual } from '@/lib/erp/registers/budget'
import { queryApprovalAudit } from '@/lib/erp/registers/approval-audit'
import { queryOrderStatus } from '@/lib/erp/registers/order-status'
import { findApprovalKind, approvalRefHref } from '@/lib/erp/approval-kinds'
// SPEC-M9 — the live-activity read tool delegates to the SAME tracker service
// behind /api/tracker (Contract rule #8: one service, two doors).
import { getTrackerSnapshot } from '@/lib/erp/tracker'
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
import { FINISHED_GOODS_SCHEMA, OPERATION_ENTRY_SCHEMA, SCAN_BUNDLE_SCHEMA } from '@/lib/erp/schemas/production-variants'
import { LINE_TRANSFER_SCHEMA } from '@/lib/erp/schemas/line-transfer'
import { JOBWORK_PCS_RETURN_SCHEMA } from '@/lib/erp/schemas/grn-variants'
import { WAGE_PAYMENT_SCHEMA } from '@/lib/erp/schemas/payment-variants'
import { REJECTION_SCHEMA } from '@/lib/erp/schemas/rejection'
import { DESPATCH_SCHEMA } from '@/lib/erp/schemas/despatch'
import { CLOSE_ORDER_SCHEMA, CANCEL_PROGRAM_SCHEMA, COMPLETE_PROGRAM_SCHEMA, PO_LIFECYCLE_SCHEMA } from '@/lib/erp/schemas/lifecycle'
import { planCloseOrder, planCancelProgram, planCompleteProgram, planPoLifecycle } from '@/lib/erp/posting/lifecycle'
import { INVOICE_SCHEMA } from '@/lib/erp/schemas/invoice'
import { COMMERCIAL_INVOICE_SCHEMA } from '@/lib/erp/schemas/commercial-invoice'
import { SUPPLIER_ORDER_SCHEMA } from '@/lib/erp/schemas/supplier-order'
import { BUDGET_SCHEMA } from '@/lib/erp/schemas/budget'
import { DEBIT_NOTE_SCHEMA } from '@/lib/erp/schemas/debit-note'
import { JOURNAL_SCHEMA } from '@/lib/erp/schemas/journal'
import { COST_SHEET_SCHEMA } from '@/lib/erp/schemas/cost-sheet'
import { PAYMENT_SCHEMA } from '@/lib/erp/schemas/payment'
import { STOCK_ADJ_SCHEMA } from '@/lib/erp/schemas/stock-adj'
import { TRANSFER_SCHEMA } from '@/lib/erp/schemas/transfer'
// M5 Wave D (SPEC-M5 §8)
import { SAMPLE_SCHEMA } from '@/lib/erp/schemas/sample'
import { GATE_ENTRY_SCHEMA } from '@/lib/erp/schemas/gate'
import { PACKING_LIST_SCHEMA } from '@/lib/erp/schemas/packing-list'
import { LAB_TEST_SCHEMA } from '@/lib/erp/schemas/lab-test'
import { EXPENSE_SCHEMA } from '@/lib/erp/schemas/expense'
import { ROLL_SPLIT_SCHEMA } from '@/lib/erp/schemas/roll-split'
import { CONTRACT_ALLOTMENT_SCHEMA } from '@/lib/erp/schemas/contract-allotment'
import { PROGRAM_ALLOTMENT_SCHEMA } from '@/lib/erp/schemas/program-allotment'
import { PRODUCTION_BILL_SCHEMA } from '@/lib/erp/schemas/production-bill'
import { ATTENDANCE_SCHEMA } from '@/lib/erp/schemas/attendance'
import { WASTE_RECEIPT_SCHEMA } from '@/lib/erp/schemas/stock-adj'
import { EINVOICE_SCHEMA, EINVOICE_CANCEL_SCHEMA } from '@/lib/erp/schemas/einvoice'
import { CANCEL_ORDER_SCHEMA, CANCEL_PO_SCHEMA, CANCEL_INVOICE_SCHEMA } from '@/lib/erp/schemas/cancel'
import { planOrder } from '@/lib/erp/posting/order'
import { planBom } from '@/lib/erp/posting/bom'
import { planProgram } from '@/lib/erp/posting/program'
import { planPurchaseOrder } from '@/lib/erp/posting/purchase-order'
import { planGrn, planJobworkPcsReturn } from '@/lib/erp/posting/grn'
import { planJobworkOut, planJobworkIn } from '@/lib/erp/posting/jobwork'
import { planCutOrder } from '@/lib/erp/posting/cut'
import { planLineIssue } from '@/lib/erp/posting/line-issue'
import { planProductionEntry, planReworkEntry, planFinishedGoods, planOperationEntry, planScanBundle } from '@/lib/erp/posting/production'
import { planLineTransfer } from '@/lib/erp/posting/line-transfer'
import { planWagePayment } from '@/lib/erp/posting/payment'
import { planRejection } from '@/lib/erp/posting/rejection'
import { planPcsDespatch } from '@/lib/erp/posting/despatch'
import { planInvoice } from '@/lib/erp/posting/invoice'
import { planExportInvoice } from '@/lib/erp/posting/invoice'
import { planBudget } from '@/lib/erp/posting/budget'
import { planSupplierOrder } from '@/lib/erp/posting/supplier-order'
import { planDebitNote } from '@/lib/erp/posting/debit-note'
import { planJournal } from '@/lib/erp/posting/journal'
import { planCostSheet } from '@/lib/erp/posting/cost-sheet'
import { planPayment } from '@/lib/erp/posting/payment'
import { planStockAdjustment } from '@/lib/erp/posting/stock-adj'
import { planTransfer } from '@/lib/erp/posting/transfer'
// SPEC-M6 §7-D (Wave D) — process-tail variant services + schemas
import { planOpeningStock } from '@/lib/erp/posting/stock-adj'
import { planPcsTransfer, planReadyToCut } from '@/lib/erp/posting/transfer'
import { planMaterialDc } from '@/lib/erp/posting/jobwork'
import { MATERIAL_DC_SCHEMA } from '@/lib/erp/schemas/dispatch-variants'
import { OPENING_STOCK_SCHEMA } from '@/lib/erp/schemas/stock-adj'
import { PCS_TRANSFER_SCHEMA, READY_TO_CUT_SCHEMA } from '@/lib/erp/schemas/transfer-variants'
// M5 Wave D (SPEC-M5 §8)
import { planSample } from '@/lib/erp/posting/sample'
import { planGateEntry } from '@/lib/erp/posting/gate'
import { planPackingList } from '@/lib/erp/posting/packing-list'
import { planLabTest } from '@/lib/erp/posting/lab-test'
import { planExpense } from '@/lib/erp/posting/expense'
import { planRollSplit } from '@/lib/erp/posting/roll-split'
import { planContractAllotment } from '@/lib/erp/posting/contract-allotment'
import { planProgramAllotment } from '@/lib/erp/posting/program-allotment'
import { planProductionBill } from '@/lib/erp/posting/production-bill'
import { planAttendance } from '@/lib/erp/posting/attendance'
import { planWasteReceipt } from '@/lib/erp/posting/stock-adj'
import { planGenerateIrn, planCancelIrn } from '@/lib/erp/einvoice'
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

/** SPEC-M7 Wave B — agent user context. The API routes stamp the session
 * user on every execute() call; approval-committing tools record it as the
 * Approval.approvedBy actor (falls back to 'agent' for direct/test calls,
 * preserving the pre-M7B contract). */
export type AgentActor = {
  userId: string
  email: string
  name: string
}

export interface AgentTool {
  name: string
  description: string
  domain: string
  isWrite: boolean
  schema: z.ZodObject<any, any>
  execute: (args: any, actor?: AgentActor) => Promise<ToolResult>
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
    description: 'Get ONE purchase order by poNo (e.g. PO-Y-0001) with all lines, party and totals. Use to check what was ordered before a GRN or supplier payment.',
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
      // Delegates to the shared register fetch (SPEC-M4 §5 row 9) — the same
      // CurrentStock read path the stock registers use. json shape frozen.
      const stocks = await fetchCurrentStock({ itemType: args.itemType, godown: args.godownCode })
      if (stocks === null) return { text: `Godown ${args.godownCode} not found.` }
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
    description: 'List cut orders (cutNo CUT-####, order, fabric issued kgs, total pcs, bundle counts). Use to review cutting progress per order.',
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
    description: 'Get one party ledger by party code (PRT-####): invoices, journals and running balance. Use to answer how much a party owes us.',
    domain: 'accounting',
    isWrite: false,
    schema: z.object({ partyCode: z.string() }),
    async execute(args) {
      // Delegates to the shared register services (SPEC-M4 §5 rows 4/14) — the
      // same read path the party-balance + party-ledger screens use. json shape
      // frozen (M3 contract) + ADDITIVE poBalances[] (§5 row 4).
      const party = await db.party.findUnique({ where: { code: args.partyCode } })
      if (!party) return { text: `Party ${args.partyCode} not found` }
      const [summary, poBalances] = await Promise.all([
        getPartyLedgerSummary(party.id),
        getPartyPoBalances(party.id),
      ])
      if (!summary) return { text: `Party ${args.partyCode} not found` }
      return {
        text: `Party ${party.name}: billed=${summary.totalBilled}, debit notes=${summary.totalDebit}, journals=${summary.totalJournal}, received=${summary.totalReceived}, paid=${summary.totalPaid}, balance=${Math.round(summary.balance)}${poBalances.length ? `, ${poBalances.length} POs (pending qty ${Math.round(poBalances.reduce((s, p) => s + p.pendingQty, 0))})` : ''}`,
        json: {
          party: { code: party.code, name: party.name, opening: party.openingBalance },
          invoices: summary.invoices, totalBilled: summary.totalBilled,
          totalDebit: summary.totalDebit, totalJournal: summary.totalJournal,
          totalReceived: summary.totalReceived, totalPaid: summary.totalPaid,
          balance: summary.balance,
          recentInvoices: summary.recentInvoices,
          poBalances,
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
    description: 'List buyer masters (code B-####, name, dept, merchandiser). Use to resolve a buyer name to its code before creating orders or samples.',
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
    description: 'List style masters (styleNo STY-####, description, buyer name, sam, hsn). Use to resolve a model number to its styleNo before creating orders or BOMs.',
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
    description: 'List fabric masters (code F-####, construction, gsm, width, dia, rate). Use to resolve a fabric to its code before POs, dyeing programs or stock tools.',
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
    description: 'List yarn masters (code Y-####, count, blend, uom, rate). Use to resolve a yarn to its code before POs, knitting programs or stock tools.',
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
    description: 'List accessory masters (code A-####, name, category, uom, rate) — zippers, buttons, labels. Use to resolve an accessory before POs or BOMs.',
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
    description: 'List godowns / warehouses (code G1/G2/G3…, name, location). Use to resolve a godown name to its code for stock, transfer and GRN tools.',
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
    description: 'List departments / process stages (code D1-D6…, name, isProcess). Use to resolve a department name to its code before production entries.',
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
    description: 'Get the cost sheet for one order by orderNo: budgeted vs actual material, labour and overhead costs. Use before quoting or closing an order.',
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
    description: 'Get budget vs actual for one order by orderNo: PO commitments vs production cost. Use to see whether an order is running over budget.',
    domain: 'costing',
    isWrite: false,
    schema: z.object({ orderNo: z.string() }),
    async execute(args) {
      // Delegates to the shared register service (SPEC-M4 §5 row 15) — the same
      // read path the /costing/budget-vs-actual screen uses. json shape frozen.
      const order = await db.order.findUnique({ where: { orderNo: args.orderNo }, select: { id: true } })
      if (!order) return { text: `Order ${args.orderNo} not found` }
      const r = await getOrderBudgetActual(order.id)
      if (!r) return { text: `Order ${args.orderNo} not found` }
      return {
        text: `${args.orderNo}: budgeted=${r.budgeted}, actual=${r.actual}, variance=${r.variance}`,
        json: {
          orderNo: args.orderNo,
          budget: { total: r.budgeted, poBudget: r.poValue, prodBudget: r.prodCost },
          actual: { total: r.actual, poValue: r.poValue, prodCost: r.prodCost, shiftWages: r.shiftWages },
          variance: r.variance,
          pctVariance: r.budgeted ? (r.variance / r.budgeted) * 100 : 0,
        },
      }
    },
  },
  {
    name: 'get_pending_approvals',
    description: 'List every approval waiting for sign-off (kind, entity, requestedBy, age). The approval inbox in chat — check this before approving anything.',
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
    description: 'List employees (code EMP-####, name, department, role, piece rate). Use to resolve an operator before production entries or wage payouts.',
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
    name: 'get_live_activity',
    description: 'Get the live operations pulse: what is being recorded RIGHT NOW — ' +
      'docs today, pcs produced/despatched, stock moves, gate movements, agent turns, ' +
      'pending approvals by kind, and the newest 15 feed events across all families ' +
      '(orders, POs, GRNs, invoices, payments, cuts, production, despatches, jobwork, gate, samples, lab tests, expenses, approvals, agent).',
    domain: 'meta',
    isWrite: false,
    schema: z.object({
      feedLimit: z.number().int().min(1).max(40).optional()
        .describe('Max feed events to return (default 15, max 40)'),
    }),
    async execute(args) {
      const snap = await getTrackerSnapshot({ feedLimit: args?.feedLimit ?? 15 })
      const k = snap.kpis
      const top = snap.feed.slice(0, 8).map((e) => `${e.label} ${e.docNo} — ${e.meta}`).join('; ')
      const pending = snap.approvals.pendingByKind.map((p) => `${p.label}×${p.count}`).join(', ') || 'none'
      const busiest = snap.modules.groups
        .flatMap((g) => g.families)
        .filter((f) => f.today > 0)
        .sort((a, b) => b.today - a.today)
        .slice(0, 5)
        .map((f) => `${f.label} ${f.today} today (latest ${f.latestDocNo ?? '—'})`)
        .join(', ')
      return {
        text: `Live today: ${k.docsToday} docs, ${k.prodPcsToday} pcs produced, ` +
          `${k.despatchPcsToday} pcs despatched, ${k.stockMovesToday} stock moves, ` +
          `${k.gateToday} gate movements, ${k.agentTurnsToday} agent turns. ` +
          `${snap.modules.activeToday}/${snap.modules.familiesTotal} screens active today` +
          (busiest ? ` — busiest: ${busiest}` : '') +
          `. Pending approvals: ${k.pendingApprovals} (${pending}). Newest: ${top || 'no activity yet'}.`,
        json: {
          generatedAt: snap.generatedAt,
          kpis: k,
          modules: snap.modules,
          pendingApprovalsByKind: snap.approvals.pendingByKind,
          oldestPendingMin: snap.approvals.oldestPendingMin,
          feed: snap.feed,
        },
      }
    },
  },
  {
    name: 'summarize_open_orders',
    description: 'Summarize all open orders in one table: buyer, style, qty, value, delivery date. Use for a quick order-book overview.',
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
    description: 'List colour masters (code, name). Use to resolve a colour name before creating order lines or mapping buyer colour codes (e.g. 59X NAVY → Navy).',
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
    description: 'List size masters (name, sort). Use to resolve size names before creating order lines, or batch-create a full scale via create_sizes.',
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
    description: 'List knitting machine dia masters (value, e.g. 30, 34). Use to resolve a dia before fabric creation or knitting setup.',
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
    description: 'List fabric/yarn lot masters (lotNo LOT-####, party). Use to resolve a lot before lab tests or lot-tracked stock queries.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      // Delegates to the shared register service (SPEC-M4 §5 row 7) — the same
      // read path the /inventory/lots screen uses. json shape frozen
      // ({ lotNo, party }); stock rollup keys are additive.
      const res = await queryLots({ limit: 100, page: 1 })
      return {
        text: `${res.count} lots`,
        json: res.rows.map((l) => ({ lotNo: l.lotNo, party: l.party })),
      }
    },
  },
  {
    name: 'list_po_rates',
    description: 'List PO rate lines (rate confirmation sheet): poNo, party, item type/code, qty, rate, amount, PO date/status. Optional filters: party (code), itemType (yarn|fabric|accessory).',
    domain: 'procurement',
    isWrite: false,
    schema: z.object({
      party: z.string().optional(),
      itemType: z.string().optional(),
    }),
    async execute(args) {
      // Delegates to the shared register service (SPEC-M5 §7-A-6) — the same
      // read path the /procurement/rate-confirmation screen uses.
      const res = await queryRateConfirmation({
        limit: 100, page: 1, party: args.party, itemType: args.itemType,
      })
      return {
        text: `${res.count} PO rate lines`,
        json: res.rows.map((r) => ({
          poNo: r.poNo, party: r.party, itemType: r.itemType, itemCode: r.itemCode,
          qty: r.qty, rate: r.rate, amount: r.amount, status: r.status,
        })),
      }
    },
  },
  {
    name: 'list_piece_rates',
    description: 'List piece rates earned per operator × order (piece-rate confirmation sheet): operator, orderNo, dept, qty, avg rate, earned amount. Optional filters: order (orderNo), q (dept code/name).',
    domain: 'production',
    isWrite: false,
    schema: z.object({
      order: z.string().optional(),
      q: z.string().optional(),
    }),
    async execute(args) {
      // Delegates to the shared register service (SPEC-M5 §7-A-7) — the same
      // read path the /costing/piece-rate screen uses.
      const res = await queryPieceRates({ limit: 100, page: 1, order: args.order, q: args.q })
      return {
        text: `${res.count} operator×order groups`,
        json: res.rows.map((r) => ({
          operator: r.operator, orderNo: r.orderNo, dept: r.dept,
          qty: r.qty, rate: r.rate, amount: r.amount,
        })),
      }
    },
  },
  {
    name: 'list_attendance',
    description: "Attendance day-book (one row per employee per day; default window = TODAY). Returns date, employee code/name, dept, shift, status (present|absent|half|leave), in/out times, hours + the four status totals. Optional: from, to (ISO dates), status, q (employee code/name or dept code). Post or correct a day with post_attendance.",
    domain: 'hr',
    isWrite: false,
    schema: z.object({
      from: z.string().optional().describe('ISO date (default today)'),
      to: z.string().optional().describe('ISO date'),
      status: z.string().optional().describe('present | absent | half | leave'),
      q: z.string().optional().describe('Employee code/name or dept code'),
    }),
    async execute(args) {
      // Delegates to the shared register service (SPEC-M20 §5) — the same
      // read path the /hr/attendance screen uses.
      const res = await queryAttendance({
        limit: 200, page: 1,
        from: args.from ? new Date(args.from) : undefined,
        to: args.to ? new Date(args.to) : undefined,
        status: args.status, q: args.q,
      })
      const totals = (res.totals ?? []).map((t) => `${t.value} ${String(t.label).toLowerCase()}`).join(', ')
      return {
        text: `${res.count} rows · ${totals}`,
        json: res.rows.map((r) => ({
          date: r.attDate ? new Date(r.attDate as any).toISOString().slice(0, 10) : null,
          code: r.code, employee: r.employee, dept: r.dept, shift: r.shift,
          status: r.status, in: r.inTime, out: r.outTime, hours: r.hours,
        })),
      }
    },
  },
  {
    name: 'get_production_wages',
    description: 'Production wages per operator (payroll view): operator, code, dept, order/entry counts, Σ qty, avg rate, Σ earned amount. Optional filters: order (orderNo), q (dept code/name). Generate the wage bill with create_journal (Dr Production Wages / Cr Wage Payable).',
    domain: 'hr',
    isWrite: false,
    schema: z.object({
      order: z.string().optional(),
      q: z.string().optional(),
    }),
    async execute(args) {
      // Delegates to the shared register service (SPEC-M5 §7-B-20) — the same
      // read path the /hr/wages screen uses.
      const res = await queryWages({ limit: 100, page: 1, order: args.order, q: args.q })
      const wagesTotal = (res.totals ?? []).find((t) => t.label.startsWith('Wages'))?.value ?? 0
      return {
        text: `${res.count} operators · ₹${Math.round(Number(wagesTotal)).toLocaleString('en-IN')} earned`,
        json: res.rows.map((r) => ({
          operator: r.operator, code: r.code, dept: r.dept,
          orders: r.orders, entries: r.entries, qty: r.qty,
          rate: r.rate, amount: r.amount,
        })),
      }
    },
  },
  {
    name: 'list_seasons',
    description: 'List season masters (code, name, start/end dates). Use to resolve a season before order or style entry.',
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
    description: 'List merchandiser masters (name, email, phone). Use to resolve a merchandiser before buyer or order entry.',
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
    description: 'List exporter masters (code, name, IEC, GSTIN) — the exporting entities used on commercial/export documents.',
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
    description: 'List production lines (code, name, department, capacity pcs/hour). Use to resolve a line code before issuing to a sewing line or line transfers.',
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
    description: 'List financial years (code YY-YY, start, end, active). Use to resolve the right finYear for historical documents (e.g. 24-25).',
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
      // Delegates to the shared register service (SPEC-M4 §5 row 11) — the same
      // read path the /jobwork/register screen uses. json shape frozen.
      const res = await queryJobwork({ status: args.status, limit: 50, page: 1 })
      return {
        text: `${res.count} jobwork DCs`,
        json: res.rows.map((j) => ({
          dcNo: j.dcNo, jobworker: j.jobworker, processType: j.processType,
          totalQty: j.totalQty, totalValue: j.totalValue, status: j.status,
          orderNo: j.orderNo, outDate: j.outDate, expectedInDate: j.expectedInDate, receivedDate: j.receivedDate,
        })),
      }
    },
  },
  {
    name: 'list_despatches',
    description: 'List finished-goods despatch DCs to buyers (dcNo, order, buyer, qty, date) with order and buyer resolved. Use to review what shipped.',
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
    description: 'List debit notes raised against parties (note no, party, amount, date). Use to review returns/charges raised on buyers or suppliers.',
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
      // SPEC-M6 §7-C-2 — the body moved VERBATIM into registers/program-status.ts
      // (the /programs/status register shares it; json shape frozen).
      const { programStatusForOrder } = await import('@/lib/erp/registers/program-status')
      const res = await programStatusForOrder(args.orderNo)
      if (!res) return { text: `Order ${args.orderNo} not found.` }
      const lines = res.programs.length
        ? res.programs.map((p) => `${p.programNo} [${p.stage}${p.dept ? ' @' + p.dept : ''}] ${p.item || '-'}: required ${p.requiredKgs} kg, actual ${p.actualKgs} kg, balance ${p.balanceKgs} kg (${p.status})`)
        : ['No programs yet — call create_program to plan production for this order.']
      return {
        text: `Program status for ${res.orderNo}:\n` + lines.join('\n'),
        json: res,
      }
    },
  },
  // ---- SPEC-M4 §11 — new register read tools (Wave B) ----
  {
    name: 'list_inhand_orders',
    description: 'List orders in hand (open/in_progress): ordered vs despatched vs pending pcs per order.',
    domain: 'orders',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const res = await queryInhandOrders({ limit: 50, page: 1 })
      return {
        text: `${res.count} orders in hand · ${res.totals?.find((t) => t.label === 'Pending pcs')?.value ?? 0} pcs pending`,
        json: res.rows.map((o) => ({
          orderNo: o.orderNo, buyer: o.buyer, style: o.style, deliveryDate: o.deliveryDate,
          totalPcs: o.totalPcs, despatchedPcs: o.despatchedPcs, pendingPcs: o.pendingPcs,
          invoicedQty: o.invoicedQty, status: o.status,
        })),
      }
    },
  },
  {
    name: 'list_io_history',
    description: 'In/out history per item or party with a running balance (chronological ledger).',
    domain: 'inventory',
    isWrite: false,
    schema: z.object({
      itemType: z.string().optional().describe('yarn|fabric|accessory|pcs'),
      itemId: z.string().optional().describe('Item code (e.g. YRN-001)'),
      partyCode: z.string().optional(),
      limit: z.number().optional().default(50),
    }),
    async execute(args) {
      const res = await queryIoHistory({
        itemType: args.itemType,
        q: args.itemId,
        party: args.partyCode,
        limit: args.limit ?? 50,
        page: 1,
      })
      return {
        text: `${res.count} movements (chronological, running balance).`,
        json: res.rows.map((l) => ({
          date: l.docDate, txnType: l.txnType, docNo: l.docNo, itemCode: l.itemCode,
          godown: l.godown, party: l.party,
          inKgs: l.inKgs, outKgs: l.outKgs, balKgs: l.balKgs,
          inMtrs: l.inMtrs, outMtrs: l.outMtrs, balMtrs: l.balMtrs,
          inPcs: l.inPcs, outPcs: l.outPcs, balPcs: l.balPcs,
        })),
      }
    },
  },
  {
    name: 'get_production_status',
    description: 'Production status per order × department — qty, rework split, jobwork qty, wages.',
    domain: 'production',
    isWrite: false,
    schema: z.object({
      orderNo: z.string().optional().describe('Narrow to one order (e.g. SO-1001)'),
      deptCode: z.string().optional().describe('Narrow to one department code'),
    }),
    async execute(args) {
      const res = await queryProductionStatus({ order: args.orderNo, q: args.deptCode, limit: 100, page: 1 })
      return {
        text: res.summary,
        json: res.rows.map((r) => ({
          orderNo: r.orderNo, buyer: r.buyer, dept: r.dept,
          qty: r.qty, reworkQty: r.reworkQty, jobworkQty: r.jobworkQty,
          amount: r.amount, shiftWages: r.shiftWages,
        })),
      }
    },
  },
  {
    name: 'get_bills_register',
    description: 'Bills register day-book: invoices + debit notes + payments, with billed/deductions/collected/outstanding totals.',
    domain: 'accounting',
    isWrite: false,
    schema: z.object({
      from: z.string().optional().describe('YYYY-MM-DD'),
      to: z.string().optional().describe('YYYY-MM-DD'),
      partyCode: z.string().optional(),
    }),
    async execute(args) {
      const from = args.from ? new Date(args.from) : undefined
      const to = args.to ? new Date(args.to) : undefined
      const res = await queryBillsRegister({
        from: from && !isNaN(from.getTime()) ? from : undefined,
        to: to && !isNaN(to.getTime()) ? to : undefined,
        party: args.partyCode,
        limit: 200,
        page: 1,
      })
      const totals = res.totals?.map((t) => `${t.label} ${typeof t.value === 'number' ? t.value.toLocaleString('en-IN') : t.value}`).join(', ') ?? ''
      return {
        text: `${res.count} rows. ${totals}`,
        json: res.rows.map((r) => ({
          date: r.date, docNo: r.docNo, party: r.party, docType: r.docType,
          billAmount: r.billAmount, deduction: r.deduction, collected: r.collected, status: r.status,
        })),
      }
    },
  },
  {
    name: 'list_supplier_bills',
    description: 'Supplier bill register: GRN day-book with supplier + PO linkage and values.',
    domain: 'accounting',
    isWrite: false,
    schema: z.object({
      partyCode: z.string().optional(),
      from: z.string().optional().describe('YYYY-MM-DD'),
      to: z.string().optional().describe('YYYY-MM-DD'),
    }),
    async execute(args) {
      const from = args.from ? new Date(args.from) : undefined
      const to = args.to ? new Date(args.to) : undefined
      const res = await querySupplierBills({
        party: args.partyCode,
        from: from && !isNaN(from.getTime()) ? from : undefined,
        to: to && !isNaN(to.getTime()) ? to : undefined,
        limit: 100,
        page: 1,
      })
      return {
        text: res.summary,
        json: res.rows.map((g) => ({
          grnNo: g.grnNo, grnType: g.grnType, party: g.party, poNo: g.poNo,
          grnDate: g.grnDate, totalQty: g.totalQty, totalValue: g.totalValue,
          billPass: g.billPass, // M5 Wave C additive: Passed | Pending | —
        })),
      }
    },
  },
  {
    name: 'get_approval_audit',
    description: 'Approval audit trail: who approved what, when (every decision logged).',
    domain: 'workflow',
    isWrite: false,
    schema: z.object({
      status: z.string().optional().describe('pending | approved | rejected'),
      limit: z.number().optional().default(50),
    }),
    async execute(args) {
      const res = await queryApprovalAudit({ status: args.status, limit: args.limit ?? 50, page: 1 })
      return {
        text: res.summary,
        json: res.rows.map((a) => ({
          createdAt: a.createdAt, entity: a.entity, entityId: a.entityId, step: a.step,
          requestedBy: a.requestedBy, approvedBy: a.approvedBy, approvedAt: a.approvedAt,
          status: a.status, comments: a.comments,
        })),
      }
    },
  },
  {
    name: 'get_order_status',
    description: 'Order status board: per open order — stages done out of 15, next stage. Omit orderNo for the full board summary.',
    domain: 'orders',
    isWrite: false,
    schema: z.object({
      orderNo: z.string().optional().describe('One order (e.g. SO-1001); omit for the board'),
    }),
    async execute(args) {
      const res = await queryOrderStatus({ orderNo: args.orderNo })
      return {
        text: res.summary,
        json: res.rows.map((r) => ({
          orderNo: r.orderNo, buyer: r.buyer, deliveryDate: r.deliveryDate,
          totalPcs: r.totalPcs, stagesDone: r.stagesDone, nextStage: r.nextStage,
        })),
      }
    },
  },
  {
    // SPEC-M6 §4 rule (c) — the ONE report door: runs the SAME service the
    // /reports/[slug] runner calls (one query layer, two doors).
    name: 'render_report',
    description: 'Render any report from the report hub by slug. Returns rows + totals as json. Use list_reportspacks-style slugs: order-register, order-status-summary, sample-status, despatch-packing-summary, production-status, daily-in-out, line-wip, rejection-summary, operation-summary, stock-register, current-stock, stock-ledger, lot-tracking, io-history, bills-register, supplier-bills, party-ledger, party-balance, outstanding-summary, gst-summary, budget-vs-actual, daily-unit-pnl, expenses-summary, production-wages, cost-sheet-summary, lab-tests, approval-audit.',
    domain: 'reports',
    isWrite: false,
    schema: z.object({
      slug: z.string().describe('Report slug from the report hub (e.g. outstanding-summary, daily-unit-pnl)'),
      from: z.string().optional().describe('Date from (YYYY-MM-DD)'),
      to: z.string().optional().describe('Date to (YYYY-MM-DD)'),
      party: z.string().optional().describe('Party code'),
      order: z.string().optional().describe('Order no like SO-1001'),
      godown: z.string().optional().describe('Godown code'),
      itemType: z.string().optional().describe('yarn|fabric|accessory|pcs'),
      status: z.string().optional().describe('Status/type filter (per report)'),
      limit: z.number().optional().default(100),
    }),
    async execute(args) {
      const { REPORT_SERVICES } = await import('@/lib/erp/reports')
      const { getReportConfig, REPORTS } = await import('@/lib/erp/report-configs')
      const { REPORT_PACKS } = await import('@/lib/erp/report-configs/types')
      const config = getReportConfig(args.slug)
      const service = REPORT_SERVICES[args.slug]
      if (!config || !service) {
        const packs = REPORT_PACKS.map((p) => `${p.id}: ${REPORTS.filter((r) => r.pack === p.id).map((r) => r.slug).join(', ')}`).join(' | ')
        return { text: `Unknown report '${args.slug}'. Available — ${packs}` }
      }
      const fromDate = args.from ? new Date(args.from) : undefined
      const toDate = args.to ? new Date(args.to) : undefined
      if (toDate) toDate.setHours(23, 59, 59, 999)
      const result = await service({
        from: fromDate && !isNaN(fromDate.getTime()) ? fromDate : undefined,
        to: toDate && !isNaN(toDate.getTime()) ? toDate : undefined,
        party: args.party, order: args.order, godown: args.godown,
        itemType: args.itemType, status: args.status,
        limit: args.limit ?? 100, page: 1,
      })
      return {
        text: `${config.title}: ${result.summary}`,
        json: {
          report: config.slug, title: config.title,
          columns: config.columns.map((c) => c.label),
          totals: result.totals ?? [],
          count: result.count,
          rows: result.rows.slice(0, args.limit ?? 100),
        },
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
  // ── M5 Wave A (SPEC-M5 §8) ──
  docTool(
    'create_budget',
    'Create a budget (order-level or department-level) with per-work lines. Required: amount (total; 0 lets the service use the line sum) + lines (array of {amount, workId?, actualAmount?}). Provide orderNo OR deptCode (at least one). Optional: finYear (defaults 26-27), notes.',
    'costing',
    BUDGET_SCHEMA,
    planBudget,
  ),
  docTool(
    'create_commercial_invoice',
    'Create a commercial (export) invoice against an order. invoiceNo is optional — auto-assigned INV-#### (shared space with sales invoices). Required: orderNo, partyCode, totalQty, taxableValue, gstRate (usually 0 on exports). Optional: gstType (defaults igst), billType (defaults sales), ern (Export Report Number), invoiceDate, notes.',
    'accounting',
    COMMERCIAL_INVOICE_SCHEMA,
    planExportInvoice,
  ),
  docTool(
    'create_supplier_order',
    'Create a supplier order (general/semi-finished goods PO variant). poNo is optional — auto-assigned PO-G-#### like a purchase order. Required: partyCode, deliveryDate, lines (array of {itemType, itemCode, qty, rate}). poType defaults to general.',
    'procurement',
    SUPPLIER_ORDER_SCHEMA,
    planSupplierOrder,
  ),
  // ── M5 Wave B (SPEC-M5 §8) ──
  docTool(
    'post_finished_goods',
    'Post a finished-goods entry (production output into the FG store). Same as a production entry but deptCode defaults to D5 (Finishing). Required: orderNo, prodDate, bundleNo, operatorCode, qty, rate. Optional: deptCode, styleNo, colourName, sizeName.',
    'production',
    FINISHED_GOODS_SCHEMA,
    planFinishedGoods,
  ),
  docTool(
    'post_operation_entry',
    'Post an operation (sub-process) entry for a bundle — the sewing-floor operation log. deptCode defaults to D4 (Sewing). Required: orderNo, bundleNo (the sub-process key), operatorCode, prodDate, qty, rate. Optional: deptCode, styleNo.',
    'production',
    OPERATION_ENTRY_SCHEMA,
    planOperationEntry,
  ),
  docTool(
    'scan_bundle',
    'Scan a cut bundle (by bundle no OR barcode, e.g. CUT-0001/B1 or *CUT0001B001*) and post its production entry. The bundle carries order/style/colour/size; qty defaults to the bundle qty and rate defaults to the operator piece-rate master. Required: bundleNo, operatorCode. Optional: qty, rate, deptCode (default D4), prodDate.',
    'production',
    SCAN_BUNDLE_SCHEMA,
    planScanBundle,
  ),
  docTool(
    'transfer_line_stock',
    'Move WIP pcs of an order from one sewing line to another (line transfer). refNo is optional — auto-assigned LT-#### (shared by both rows). Creates TWO line-issue rows (out + in) in one transaction; no godown stock moves. Required: orderNo, fromLineCode, toLineCode, qty. Optional: transferDate, notes.',
    'production',
    LINE_TRANSFER_SCHEMA,
    planLineTransfer,
  ),
  docTool(
    'return_jobwork_pcs',
    'Return pieces to a jobwork unit for rework (jobwork pcs return). retNo is optional — auto-assigned GRN-#### (shared GRN space). Creates a process_return GRN and moves qty pcs OUT of the pcs godown (default G2). Required: partyCode (jobworker), orderNo, qty. Optional: godownCode, reason, retDate.',
    'jobwork',
    JOBWORK_PCS_RETURN_SCHEMA,
    planJobworkPcsReturn,
  ),
  docTool(
    'pay_wages',
    'Pay wages to an employee party (creates a PMT-#### payment voucher + companion payment journal; the party ledger picks it up). Required: partyCode (an employee-type party), amount. Optional: mode (default bank), reference, payDate, notes (defaults "Wage payment").',
    'hr',
    WAGE_PAYMENT_SCHEMA,
    planWagePayment,
  ),
  // ── M5 Wave D (SPEC-M5 §8) — ADR-015 new models + write doors ──
  docTool(
    'create_sample',
    'Log a development sample (SMP-#### auto). Required: sampleType (proto|photo|counter|salesman|production). Optional: buyerCode, styleCode, qty, sampledOn, status (default submitted), enquiryRef, remarks.',
    'orders',
    SAMPLE_SCHEMA,
    planSample,
  ),
  docTool(
    'create_gate_entry',
    'Log a vehicle IN at the gate (GE-#### auto). Optional: entryNo, gateDateTime, partyCode, vehicleNo, refDocNo (the DC/GRN/PO being gate-logged), purpose, status (default logged).',
    'inventory',
    GATE_ENTRY_SCHEMA,
    (input: any) => planGateEntry({ ...input, gateType: 'in' }),
  ),
  docTool(
    'create_gate_pass',
    'Log a vehicle OUT at the gate (GP-#### auto). Optional: entryNo, gateDateTime, partyCode, vehicleNo, refDocNo (the DC/GRN/PO the pass covers), purpose, status (default logged).',
    'inventory',
    GATE_ENTRY_SCHEMA,
    (input: any) => planGateEntry({ ...input, gateType: 'out' }),
  ),
  docTool(
    'create_packing_list',
    'Create an export packing list (PKL-#### auto) with carton lines. Header totals default to the line sums when omitted. Required: lines (array of {cartonNo, styleNo, qty}). Optional: despatchDcNo, orderNo, buyerCode, packDate, finYear, totalCartons, totalPcs, netKgs, grossKgs, status (default draft), notes.',
    'orders',
    PACKING_LIST_SCHEMA,
    planPackingList,
  ),
  docTool(
    'create_lab_test',
    'Log a lab test (LT-#### auto). Required: itemType (yarn|fabric|accessory|pcs), itemCode, testType (gsm|shrinkage|colour_fastness|composition|other). Optional: lotNo, orderNo, result (default pending), testedOn, testedBy, values (JSON), remarks.',
    'production',
    LAB_TEST_SCHEMA,
    planLabTest,
  ),
  docTool(
    'create_expense',
    'Record an expense (EXP-#### auto). Required: category (fixed|stylewise|general|transport|other), amount. stylewise requires orderNo. Optional: expDate, finYear, partyCode (paid-to), narration, status (default recorded).',
    'costing',
    EXPENSE_SCHEMA,
    planExpense,
  ),
  docTool(
    'split_roll',
    'Split N mtrs off a fabric lot/roll into a NEW lot (RSP-####; rolls ≡ lots). Moves stock out of the source lot and into the new one in one transaction — net zero. Required: sourceLotNo, itemCode (fabric), godownCode, mtrs. Optional: newLotNo (defaults <source>-R<n>), splitDate, notes.',
    'inventory',
    ROLL_SPLIT_SCHEMA,
    planRollSplit,
  ),
  docTool(
    'allot_contract',
    'Allot a jobwork contract BEFORE material leaves (AL-#### placeholder, status allotted — no stock moves). Issue the real JW-#### DC later with create_jobwork_order. Required: jobworkerCode, processType (washing|dyeing|printing|embroidery), totalQty. Optional: totalValue, orderNo, expectedInDate, allotDate, notes.',
    'jobwork',
    CONTRACT_ALLOTMENT_SCHEMA,
    planContractAllotment,
  ),
  docTool(
    'create_allotment',
    'Allot yarn/fabric to a production program (bumps reqKgs/reqMtrs on the ProgBalance row, creating it when absent — the consumption PLAN, no stock moves). Required: orderNo, deptCode, itemType (yarn|fabric), itemCode. Optional: colourName (fabric), kgs, mtrs (fabric only), notes. At least one of kgs/mtrs must be > 0.',
    'production',
    PROGRAM_ALLOTMENT_SCHEMA,
    planProgramAllotment,
  ),
  docTool(
    'create_production_bill',
    'Bill the period piece-rate production: sums ProductionEntry amounts for the period (optionally one dept / one operator) and posts a Journal (Dr Production Wages / Cr Wage Payable, V-####). Optional: deptCode, operatorCode, from (default 30 days back), to (default today), narration.',
    'accounting',
    PRODUCTION_BILL_SCHEMA,
    planProductionBill,
  ),
  docTool(
    'generate_einvoice_irn',
    'Generate the MOCK e-invoice IRN for an ISSUED sales invoice (SPEC-M23 — offline deterministic handshake: 64-hex IRN + 10-digit ack; e-Way Bill no only when the consignment exceeds ₹50,000). Required: invoiceNo. Guards: invoice must be issued and not already IRN-stamped. The IRN + Ack + e-Way rows appear on the invoice print/view.',
    'accounting',
    EINVOICE_SCHEMA,
    planGenerateIrn,
  ),
  docTool(
    'cancel_einvoice_irn',
    'Cancel the live MOCK IRN of a sales invoice (SPEC-M26 — the real workflow: within 24h of generation, with a reason). Required: invoiceNo, reason (typo | wrong_entry | order_cancelled | delivery_cancelled | others). Commit clears the IRN/Ack/e-Way rows, preserves the cancelled IRN as a history line on the view, and the invoice can generate a fresh IRN again.',
    'accounting',
    EINVOICE_CANCEL_SCHEMA,
    planCancelIrn,
  ),
  docTool(
    'receive_waste',
    'Receive waste/scrap INTO stock (WST-#### auto; knitting/dyeing/cutting/packing/general waste classes — waste is tracked religiously in Tirupur units). Required: godownCode, itemType (yarn|fabric|accessory), itemCode, qty, wasteClass. Optional: adjDate, notes. Lands a stock_adjustment_add ledger row whose reason carries the waste class.',
    'inventory',
    WASTE_RECEIPT_SCHEMA,
    planWasteReceipt,
  ),
  docTool(
    'post_attendance',
    'Post or CORRECT a day of attendance (batch, upsert — one row per employee per day; re-posting fixes, never duplicates). Required: entries [{employeeCode, status? (present|absent|half|leave, default present)}]. Optional: attDate (default today), per-entry shiftCode, inTime/outTime "HH:MM" (hours auto-derived), notes. Read it back with list_attendance.',
    'hr',
    ATTENDANCE_SCHEMA,
    planAttendance,
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
  masterCreateTool('shift', 'Create a shift master (SPEC-M5 §7-D-32). code is optional — auto-assigned SH-## if omitted or taken. Required: name, fromTime (HH:MM), toTime (HH:MM). Optional: hours (default 8).'),
  // SPEC-M6 Wave B (ADR-016 + ERRATUM #1)
  masterCreateTool('user', 'Create a user (SPEC-M6 §7-B). Required: email (login), name. Optional: role (admin|merchandiser|storekeeper|accountant|production_mgr|hr|cutting_mgr), userGroup (group name), active.'),
  masterCreateTool('user-group', 'Create a user group (SPEC-M6 §7-B). Required: name. Menu rights are set via /admin/menu-rights ([] = all menus).'),
  masterCreateTool('app-option', 'Create an app option (SPEC-M6 §7-B). Required: key (e.g. print.companyName), label, value. Optional: group (print|defaults|general).'),
  masterCreateTool('hsn', 'Create an HSN code with its GST rate (SPEC-M6 §7-D). Required: code (e.g. 61091000), description. Optional: gstRate (default 5), hsnType (goods|service).'),
  masterCreateTool('test-parameter', 'Create a lab test parameter (SPEC-M6 §7-D). Required: code (e.g. GSM), name. Optional: stage (knit|dye|print|sew|final), method, unit (gsm|%|mm).'),
  // SPEC-M19 §3 Wave C (ADR-019) — masters completion
  masterCreateTool('bank', 'Create a bank master. code is optional — auto-assigned BK-#### if omitted or taken. Required: name (e.g. HDFC Bank).'),
  masterCreateTool('bank-account', 'Create a company bank account. accountNo is optional — auto-assigned ACC-#### if omitted or taken. Required: bankCode (bank code or name). Optional: branch, ifsc, accountType (current|savings|cc|od), upi, active.'),
  masterCreateTool('mill', 'Create a knitting/dyeing mill master. code is optional — auto-assigned MIL-#### if omitted or taken. Required: name. Optional: city, gstin, notes.'),
  masterCreateTool('machine-category', 'Create a machine category master. code is optional — auto-assigned MC-#### if omitted or taken. Required: name (e.g. Circular Knitting, Flat Lock).'),
  masterCreateTool('machine', 'Create a machine master. code is optional — auto-assigned MCH-#### if omitted or taken. Required: name. Optional: machineCategoryCode, capacityPcsPerHour, notes.'),
  masterCreateTool('state', 'Create a state master (GST place-of-supply). code is optional — auto-assigned ST-#### if omitted or taken. Required: name. Optional: gstCode (first 2 GSTIN digits, e.g. 33 = Tamil Nadu).'),
  masterCreateTool('shade', 'Create a shade master (shade ≠ colour in dyeing: colour family × depth). code is optional — auto-assigned SHD-#### if omitted or taken. Required: name. Optional: notes.'),
  masterCreateTool('thread-type', 'Create a sewing thread type master. code is optional — auto-assigned THR-#### if omitted or taken. Required: name. Optional: notes.'),
  masterCreateTool('count-group', 'Create a yarn count group master. code is optional — auto-assigned CG-#### if omitted or taken. Required: name. Optional: notes (counts in this group, e.g. 30s–40s).'),
  masterCreateTool('range-group', 'Create a size-range group master. code is optional — auto-assigned RG-#### if omitted or taken. Required: name.'),
  masterCreateTool('size-range', 'Create a size range pack (export packing, e.g. "104-110"). code is optional — auto-assigned RNG-#### if omitted or taken. Required: name. Optional: rangeGroupCode, sizes (CSV of size names).'),
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
  masterUpdateTool('shift', 'Update an existing shift by code. All fields optional; only provided fields are updated (name, fromTime, toTime, hours).'),
  masterUpdateTool('user', 'Update a user by email. Updatable: name, role, userGroup, active.'),
  masterUpdateTool('user-group', 'Rename an existing user group by its current name. Menu rights are NOT changed here — use /admin/menu-rights.'),
  masterUpdateTool('app-option', 'Update an app option by key. Updatable: label, value, group.'),
  masterUpdateTool('hsn', 'Update an HSN code by code. Updatable: description, gstRate, hsnType.'),
  masterUpdateTool('test-parameter', 'Update a test parameter by code. Updatable: name, stage, method, unit.'),
  // SPEC-M19 §3 Wave C (ADR-019) — masters completion
  masterUpdateTool('bank', 'Update an existing bank by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('bank-account', 'Update an existing bank account by accountNo. All fields optional; bankCode resolves by code or name.'),
  masterUpdateTool('mill', 'Update an existing mill by code. All fields optional; only provided fields are updated.'),
  masterUpdateTool('machine-category', 'Update an existing machine category by code. All fields optional.'),
  masterUpdateTool('machine', 'Update an existing machine by code. All fields optional; machineCategoryCode resolves by code or name.'),
  masterUpdateTool('state', 'Update an existing state by code. All fields optional.'),
  masterUpdateTool('shade', 'Update an existing shade by code. All fields optional.'),
  masterUpdateTool('thread-type', 'Update an existing thread type by code. All fields optional.'),
  masterUpdateTool('count-group', 'Update an existing count group by code. All fields optional.'),
  masterUpdateTool('range-group', 'Update an existing range group by code. All fields optional.'),
  masterUpdateTool('size-range', 'Update an existing size range by code. All fields optional; rangeGroupCode resolves by code or name.'),
]

// new master LIST tools (SPEC-M2 §3 — entities that had no list tool)
const masterNewListTools: AgentTool[] = [
  {
    name: 'list_size_groups',
    description: 'List size groups with their size names resolved (e.g. S-M-L, 92-98-104). Use to pick a group when a style runs a full size scale.',
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
    description: 'List garment part masters (e.g. Front Panel, Sleeve, Collar). Use to resolve parts before BOM or cut-order detail entry.',
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
    description: 'List component masters (e.g. Self Fabric, Contrast Panel). Use to resolve components before BOM entry.',
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
    description: 'List design masters (code, name). Use to resolve a design before style entry.',
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
    description: 'List government holidays (date, name). Use to check the working-day calendar for wage and planning calculations.',
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
  {
    // SPEC-M31 — the working-day planner arithmetic, reachable via chat:
    // "how many working days until the 15th?" / "finish date for 20 lead days?"
    name: 'get_working_days',
    description:
      'Working-day arithmetic over the holiday calendar (Sundays off by default, GovtHolidays skipped). Pass a from/to window for the working-day breakdown, or leadDays for the planned finish date. Example: from 2026-09-01 to 2026-09-30 → working days count; leadDays 20 → the finish date if work starts today.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({
      from: z.string().optional().describe('window start YYYY-MM-DD (default today)'),
      to: z.string().optional().describe('window end YYYY-MM-DD (required for the breakdown)'),
      leadDays: z.number().int().positive().optional().describe('working days needed → returns the finish date'),
      sundayWorking: z.boolean().optional().describe('set true when the unit runs Sundays (default false)'),
    }),
    async execute(args: any) {
      const { workingDaysUntil, planFinishDate, getUpcomingHolidays } = await import('@/lib/erp/holidays')
      const sundayWorking = args?.sundayWorking === true
      if (args?.leadDays && args?.leadDays > 0) {
        const finish = await planFinishDate({
          from: args?.from ? new Date(args.from) : undefined,
          leadDays: args.leadDays,
          sundayWorking,
        })
        return {
          text: finish
            ? `${args.leadDays} working day${args.leadDays > 1 ? 's' : ''} finish on ${finish.toISOString().slice(0, 10)}${sundayWorking ? ' (Sundays working)' : ''}`
            : `no finish date within the scan window for ${args.leadDays} working days`,
          json: { leadDays: args.leadDays, finishDate: finish?.toISOString().slice(0, 10) ?? null, sundayWorking },
        }
      }
      if (!args?.to) {
        return { text: 'Pass either a to date (window breakdown) or leadDays (finish date).', json: { error: 'missing-args' } }
      }
      const from = args?.from ? new Date(args.from) : new Date()
      const breakdown = await workingDaysUntil(new Date(args.to), { from, sundayWorking })
      if (!breakdown) {
        return { text: 'The to date is in the past — nothing to plan.', json: { error: 'past-window' } }
      }
      const skipped = await getUpcomingHolidays({ from, days: 90 })
      const names = skipped.slice(0, 5).map((h: any) => `${h.name} (${h.date.toISOString().slice(0, 10)})`)
      return {
        text: `${breakdown.workingDays} working days (${breakdown.sundays} Sundays, ${breakdown.holidays} holidays skipped)${sundayWorking ? ' — Sundays working' : ''}${names.length ? `; shutdowns: ${names.join(', ')}` : ''}`,
        json: { from: from.toISOString().slice(0, 10), to: args.to, ...breakdown, sundayWorking },
      }
    },
  },
  {
    // SPEC-M5 §7-D-32 — the shift master's list door (every master's listTool
    // must exist as a read tool — master-configs contract test).
    name: 'list_shifts',
    description: 'List shift masters (code, name, from/to times, hours). Use to resolve a shift before employee or wage entry.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.shift.findMany({ orderBy: { code: 'asc' } })
      return {
        text: `${rows.length} shifts`,
        json: rows.map((s: any) => ({ code: s.code, name: s.name, fromTime: s.fromTime, toTime: s.toTime, hours: s.hours })),
      }
    },
  },
  // SPEC-M6 Wave B (ADR-016 + ERRATUM #1) — the master-configs contract test
  // requires a list door per config (§12-4).
  {
    name: 'list_users',
    description: 'List login users (email, name, role, user group, active). Use to resolve a user before granting rights or password admin.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.user.findMany({ include: { userGroup: true }, orderBy: { email: 'asc' } })
      return {
        text: `${rows.length} users`,
        json: rows.map((u: any) => ({ email: u.email, name: u.name, role: u.role, group: u.userGroup?.name ?? null, active: u.active })),
      }
    },
  },
  {
    name: 'list_user_groups',
    description: 'List user groups (name + menu rights summary). Use to resolve a group before user assignment or rights changes.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.userGroup.findMany({ orderBy: { name: 'asc' } })
      return {
        text: `${rows.length} user groups`,
        json: rows.map((g: any) => {
          const rights: string[] = Array.isArray(g.rights) ? g.rights : []
          return { name: g.name, rights: rights.length ? rights.join(', ') : 'all menus' }
        }),
      }
    },
  },
  {
    name: 'list_app_options',
    description: 'List app options / system settings (key, label, value, group). Use to read configuration such as print settings and defaults.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.appOption.findMany({ orderBy: { key: 'asc' } })
      return { text: `${rows.length} options`, json: rows }
    },
  },
  {
    name: 'list_hsns',
    description: 'List HSN codes with GST rates (code, description, gstRate). Use to resolve the HSN/GST rate before invoicing a style.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.hsn.findMany({ orderBy: { code: 'asc' } })
      return { text: `${rows.length} HSN codes`, json: rows }
    },
  },
  {
    name: 'list_test_parameters',
    description: 'List lab test parameters (code, name, stage, method, unit). Use to resolve a parameter before logging a lab test.',
    domain: 'masters',
    isWrite: false,
    schema: z.object({}),
    async execute() {
      const rows = await db.testParameter.findMany({ orderBy: { code: 'asc' } })
      return { text: `${rows.length} test parameters`, json: rows }
    },
  },
]

// SPEC-M19 §3 Wave C (ADR-019) — list doors for the 11 completion masters.
const waveCListTools: AgentTool[] = [
  {
    name: 'list_banks',
    description: 'List bank masters (code, name). Use to resolve a bank before creating a bank account or setting payment modes.',
    domain: 'masters', isWrite: false, schema: z.object({}),
    async execute() {
      const rows = await db.bank.findMany({ orderBy: { code: 'asc' } })
      return { text: `${rows.length} banks`, json: rows.map((b: any) => ({ code: b.code, name: b.name })) }
    },
  },
  {
    name: 'list_bank_accounts',
    description: 'List company bank accounts (accountNo, bank, branch, IFSC, type, active). Use to pick a remit-to account for invoices.',
    domain: 'masters', isWrite: false, schema: z.object({}),
    async execute() {
      const rows = await db.bankAccount.findMany({ include: { bank: true }, orderBy: { accountNo: 'asc' } })
      return {
        text: `${rows.length} bank accounts`,
        json: rows.map((a: any) => ({ accountNo: a.accountNo, bank: a.bank?.name ?? null, branch: a.branch, ifsc: a.ifsc, accountType: a.accountType, active: a.active })),
      }
    },
  },
  {
    name: 'list_mills',
    description: 'List knitting/dyeing mill masters (code, name, city, gstin). Use to resolve a mill for job-work or process programs.',
    domain: 'masters', isWrite: false, schema: z.object({}),
    async execute() {
      const rows = await db.mill.findMany({ orderBy: { code: 'asc' } })
      return { text: `${rows.length} mills`, json: rows.map((m: any) => ({ code: m.code, name: m.name, city: m.city, gstin: m.gstin })) }
    },
  },
  {
    name: 'list_machine_categories',
    description: 'List machine categories (code, name). Use before creating machines.',
    domain: 'masters', isWrite: false, schema: z.object({}),
    async execute() {
      const rows = await db.machineCategory.findMany({ orderBy: { code: 'asc' } })
      return { text: `${rows.length} machine categories`, json: rows.map((c: any) => ({ code: c.code, name: c.name })) }
    },
  },
  {
    name: 'list_machines',
    description: 'List machines (code, name, category, capacity pcs/hr). Use for capacity planning and maintenance.',
    domain: 'masters', isWrite: false, schema: z.object({}),
    async execute() {
      const rows = await db.machine.findMany({ include: { machineCategory: true }, orderBy: { code: 'asc' } })
      return {
        text: `${rows.length} machines`,
        json: rows.map((m: any) => ({ code: m.code, name: m.name, category: m.machineCategory?.name ?? null, capacityPcsPerHour: m.capacityPcsPerHour })),
      }
    },
  },
  {
    name: 'list_states',
    description: 'List state masters (code, name, GST code). Use for GST place-of-supply and e-way bill destinations.',
    domain: 'masters', isWrite: false, schema: z.object({}),
    async execute() {
      const rows = await db.state.findMany({ orderBy: { code: 'asc' } })
      return { text: `${rows.length} states`, json: rows.map((s: any) => ({ code: s.code, name: s.name, gstCode: s.gstCode })) }
    },
  },
  {
    name: 'list_shades',
    description: 'List shade masters (code, name, notes). Shade ≠ colour in dyeing — resolve a shade for dyeing programs.',
    domain: 'masters', isWrite: false, schema: z.object({}),
    async execute() {
      const rows = await db.shade.findMany({ orderBy: { code: 'asc' } })
      return { text: `${rows.length} shades`, json: rows.map((s: any) => ({ code: s.code, name: s.name, notes: s.notes })) }
    },
  },
  {
    name: 'list_thread_types',
    description: 'List sewing thread type masters (code, name). Use for thread consumption costing.',
    domain: 'masters', isWrite: false, schema: z.object({}),
    async execute() {
      const rows = await db.threadType.findMany({ orderBy: { code: 'asc' } })
      return { text: `${rows.length} thread types`, json: rows.map((t: any) => ({ code: t.code, name: t.name })) }
    },
  },
  {
    name: 'list_count_groups',
    description: 'List yarn count groups (code, name, notes). Use to group counts for procurement.',
    domain: 'masters', isWrite: false, schema: z.object({}),
    async execute() {
      const rows = await db.countGroup.findMany({ orderBy: { code: 'asc' } })
      return { text: `${rows.length} count groups`, json: rows.map((g: any) => ({ code: g.code, name: g.name, notes: g.notes })) }
    },
  },
  {
    name: 'list_range_groups',
    description: 'List size-range groups (code, name). Use before creating size ranges.',
    domain: 'masters', isWrite: false, schema: z.object({}),
    async execute() {
      const rows = await db.rangeGroup.findMany({ orderBy: { code: 'asc' } })
      return { text: `${rows.length} range groups`, json: rows.map((g: any) => ({ code: g.code, name: g.name })) }
    },
  },
  {
    name: 'list_size_ranges',
    description: 'List size-range packs (code, name, group, sizes CSV). Use for export packing (e.g. 104-110).',
    domain: 'masters', isWrite: false, schema: z.object({}),
    async execute() {
      const rows = await db.sizeRange.findMany({ include: { rangeGroup: true }, orderBy: { code: 'asc' } })
      return {
        text: `${rows.length} size ranges`,
        json: rows.map((r: any) => ({ code: r.code, name: r.name, group: r.rangeGroup?.name ?? null, sizes: r.sizes })),
      }
    },
  },
]

/** SPEC-M5 §6 Wave C — shared plan/commit machinery for the approval-gate
 * wrapper tools. Finds the latest Approval row for (entity, entityId):
 * already-approved → informational text; pending → propose the approve update;
 * missing → propose create-then-approve (§8: "ALSO create the pending row when
 * an entity lacks one"). Commit mirrors approve_pending's contract. */
async function proposeApprovalGate(
  entity: string,
  r: { entityId: string; title: string; detail: string; href: string | null },
  comments?: string,
  actor?: AgentActor,
) {
  const kind = findApprovalKind(entity)!
  // SPEC-M7 Wave B — the human who clicks Approve (via /api/agent/approve)
  // becomes the recorded actor; the plan/commit pair must agree.
  const approvedBy = actor?.email ?? 'agent'
  const existing = await db.approval.findFirst({
    where: { entity, entityId: r.entityId },
    orderBy: { createdAt: 'desc' },
  })
  if (existing?.status === 'approved') {
    return { text: `${kind.label} for ${r.title} is already approved.` }
  }
  if (existing?.status === 'rejected') {
    return { text: `${kind.label} for ${r.title} was rejected — raise a new document to re-open it.` }
  }
  const willCreate = !existing
  return {
    text: `Proposed ${willCreate ? 'creation + approval' : 'approval'} of ${kind.label} for ${r.title}.`,
    plan: {
      summary: `${kind.label} — ${r.title} | ${r.detail}`,
      creates: willCreate
        ? [{ table: 'approval', data: { entity, entityId: r.entityId, step: 1, requestedBy: 'agent', status: 'pending' } }]
        : [],
      updates: [{ table: 'approval', id: existing?.id ?? '<new>', data: { status: 'approved', approvedBy, approvedAt: new Date(), comments } }],
      sideEffects: [
        `${r.title} is marked ${kind.label.toLowerCase()}-approved`,
        r.href ? `Document view: ${r.href}` : 'Decision recorded in the approval audit trail',
      ],
    },
    async commit() {
      return await db.$transaction(async (tx) => {
        let row = existing
        if (!row) {
          row = await tx.approval.create({
            data: { entity, entityId: r.entityId, step: 1, requestedBy: 'agent', status: 'pending' },
          })
        }
        const updated = await tx.approval.update({
          where: { id: row.id },
          data: { status: 'approved', approvedBy, approvedAt: new Date(), comments },
        })
        return { id: updated.id, entity, entityId: r.entityId, ref: r.title, status: updated.status }
      })
    },
  }
}

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
    async execute(args, actor) {
      const ap = await db.approval.findUnique({ where: { id: args.approvalId } })
      if (!ap) return { text: `Approval ${args.approvalId} not found` }
      if (ap.status !== 'pending') return { text: `Approval already ${ap.status}` }
      const approvedBy = actor?.email ?? 'agent'
      return {
        text: `Proposed approval of ${ap.entity} ${ap.entityId}.`,
        plan: {
          summary: `Approve ${ap.entity} (id: ${ap.entityId}) - requested by ${ap.requestedBy}`,
          updates: [{ table: 'approval', id: ap.id, data: { status: 'approved', approvedBy, approvedAt: new Date(), comments: args.comments } }],
          sideEffects: ['Entity becomes approved', 'If PO, status becomes "open" (already open) and ready to receive'],
        },
        async commit() {
          await db.approval.update({
            where: { id: ap.id },
            data: { status: 'approved', approvedBy, approvedAt: new Date(), comments: args.comments },
          })
          return { id: ap.id, status: 'approved' }
        },
      }
    },
  },
  // ───────── SPEC-M5 §6 Wave C — approval-gate wrapper tools (+4 → 146) ─────────
  // Thin wrappers over the approve door (§8): each resolves its underlying
  // document, finds the pending Approval row for its kind — creating it when
  // the entity lacks one — and proposes approving it via the SAME plan/commit
  // contract as approve_pending. Kinds registry: src/lib/erp/approval-kinds.ts.
  {
    name: 'create_bill_pass',
    description: 'Pass (approve for payment) a supplier bill — the GRN rows in the supplier-bill register. Required: grnNo. Optional: comments. Marks the GRN bill-passed (the supplier-bill register shows Passed); creates the pending supplier_bill approval first when the GRN lacks one.',
    domain: 'workflow',
    isWrite: true,
    schema: z.object({
      grnNo: z.string(),
      comments: z.string().optional(),
    }),
    async execute(args, actor) {
      const grn = await db.gRN.findUnique({ where: { grnNo: args.grnNo }, include: { party: true } })
      if (!grn) return { text: `GRN ${args.grnNo} not found` }
      const r = { entityId: grn.id, title: grn.grnNo, detail: `${grn.party?.name ?? 'party'} · ₹${Math.round(grn.totalValue).toLocaleString('en-IN')} · ${grn.grnType}`, href: approvalRefHref('supplier_bill', grn.id) }
      return proposeApprovalGate('supplier_bill', r, args.comments, actor)
    },
  },
  {
    name: 'acknowledge_unit_transfer',
    description: 'Acknowledge an inter-unit godown transfer. Required: docNo (the GT-#### transfer number). Optional: comments. Approves the pending godown_transfer approval left by transfer_stock with requiresAck — creates the row first when the transfer lacks one.',
    domain: 'workflow',
    isWrite: true,
    schema: z.object({
      docNo: z.string().describe('The GT-#### godown-transfer doc number'),
      comments: z.string().optional(),
    }),
    async execute(args, actor) {
      const pair = await db.stockLedger.findFirst({ where: { docNo: args.docNo, txnType: { in: ['godown_transfer_out', 'godown_transfer_in'] } } })
      if (!pair) return { text: `No godown transfer ${args.docNo} found (expected a GT-#### doc number)` }
      const r = { entityId: args.docNo, title: args.docNo, detail: `godown transfer ${args.docNo} · acknowledged by receiving unit`, href: approvalRefHref('godown_transfer', args.docNo) }
      return proposeApprovalGate('godown_transfer', r, args.comments, actor)
    },
  },
  {
    name: 'approve_reprocess',
    description: 'Approve reprocessing of defective material received on a GRN. Required: grnNo. Optional: comments. Approves the pending reprocess approval left by receive_grn with reprocess:true — creates the row first when the GRN lacks one.',
    domain: 'workflow',
    isWrite: true,
    schema: z.object({
      grnNo: z.string(),
      comments: z.string().optional(),
    }),
    async execute(args, actor) {
      const grn = await db.gRN.findUnique({ where: { grnNo: args.grnNo }, include: { party: true } })
      if (!grn) return { text: `GRN ${args.grnNo} not found` }
      const r = { entityId: grn.id, title: grn.grnNo, detail: `reprocess ${grn.grnNo} · ${grn.party?.name ?? 'party'} · ${grn.totalQty} units`, href: approvalRefHref('reprocess', grn.id) }
      return proposeApprovalGate('reprocess', r, args.comments, actor)
    },
  },
  {
    name: 'approve_non_return_dc',
    description: 'Approve a despatch DC whose material will not return. Required: dcNo (the DC-#### number). Optional: comments. Approves the pending non_return_dc approval left by create_pcs_despatch with returnable:false — creates the row first when the DC lacks one.',
    domain: 'workflow',
    isWrite: true,
    schema: z.object({
      dcNo: z.string(),
      comments: z.string().optional(),
    }),
    async execute(args, actor) {
      const dc = await db.pcsDespatch.findUnique({ where: { dcNo: args.dcNo } })
      if (!dc) return { text: `Despatch DC ${args.dcNo} not found` }
      const r = { entityId: dc.id, title: dc.dcNo, detail: `non-return DC ${dc.dcNo} · ${dc.totalPcs} pcs · vehicle ${dc.vehicleNo || '-'}`, href: approvalRefHref('non_return_dc', dc.id) }
      return proposeApprovalGate('non_return_dc', r, args.comments, actor)
    },
  },
  // ───────── SPEC-M6 §6 (Wave D) — manual-queue approval gates (+4) ─────────
  // The four legacy acceptance queues were human-stepped: no posting hook
  // leaves these rows — the IN screens' queue cards (or these tools, via the
  // find-or-create rule) raise them. approve → the same proposeApprovalGate
  // contract as Wave C.
  {
    name: 'accept_grn',
    description: 'Accept received goods on a GRN (the GRN Acceptance queue). Required: grnNo. Optional: comments. Creates the pending grn_acceptance approval first when the GRN lacks one (the queue is manual — nothing is auto-raised), then approves it.',
    domain: 'workflow',
    isWrite: true,
    schema: z.object({
      grnNo: z.string(),
      comments: z.string().optional(),
    }),
    async execute(args, actor) {
      const grn = await db.gRN.findUnique({ where: { grnNo: args.grnNo }, include: { party: true } })
      if (!grn) return { text: `GRN ${args.grnNo} not found` }
      const r = { entityId: grn.id, title: grn.grnNo, detail: `GRN acceptance ${grn.grnNo} · ${grn.party?.name ?? 'party'} · ${grn.totalQty} units · ${grn.grnType}`, href: approvalRefHref('grn_acceptance', grn.id) }
      return proposeApprovalGate('grn_acceptance', r, args.comments, actor)
    },
  },
  {
    name: 'acknowledge_cutting_issue',
    description: 'Acknowledge that fabric issued to a cutting line reached the cutting table (the Cutting Ack queue). Required: issueNo (the LI-#### number). Optional: comments. Creates the pending cutting_ack approval first when the issue lacks one, then approves it.',
    domain: 'workflow',
    isWrite: true,
    schema: z.object({
      issueNo: z.string(),
      comments: z.string().optional(),
    }),
    async execute(args, actor) {
      const li = await db.lineIssue.findUnique({ where: { issueNo: args.issueNo }, include: { line: true, order: true } })
      if (!li) return { text: `Line issue ${args.issueNo} not found` }
      const r = { entityId: li.id, title: li.issueNo, detail: `cutting ack ${li.issueNo} · line ${li.line?.code ?? '-'} · ${li.qty} pcs · order ${li.order?.orderNo ?? '-'}`, href: approvalRefHref('cutting_ack', li.id) }
      return proposeApprovalGate('cutting_ack', r, args.comments, actor)
    },
  },
  {
    name: 'accept_jobwork_pcs',
    description: 'Accept pieces received back from a jobworker (the GAN queue over received jobwork DCs — receipts park pending acceptance before stock posts, PITFALLS #12). Required: dcNo (the JW-#### jobwork DC). Optional: comments. Creates the pending pcs_acceptance approval first when the DC lacks one, then approves it.',
    domain: 'workflow',
    isWrite: true,
    schema: z.object({
      dcNo: z.string(),
      comments: z.string().optional(),
    }),
    async execute(args, actor) {
      const jw = await db.jobworkOrder.findUnique({ where: { dcNo: args.dcNo }, include: { jobworker: true } })
      if (!jw) return { text: `Jobwork DC ${args.dcNo} not found` }
      const r = { entityId: jw.id, title: jw.dcNo, detail: `pcs GAN ${jw.dcNo} · ${jw.jobworker?.name ?? 'jobworker'} · ${jw.processType} · ${jw.totalQty} units · ${jw.status}`, href: approvalRefHref('pcs_acceptance', jw.id) }
      return proposeApprovalGate('pcs_acceptance', r, args.comments, actor)
    },
  },
  {
    name: 'approve_lot',
    description: 'Approve a dyeing/knitting lot into stock (the Lot Approval queue over dye/knit GRN lots). Required: grnNo (the GRN carrying the lot lines). Optional: comments. Creates the pending lot approval first when the GRN lacks one, then approves it.',
    domain: 'workflow',
    isWrite: true,
    schema: z.object({
      grnNo: z.string(),
      comments: z.string().optional(),
    }),
    async execute(args, actor) {
      const grn = await db.gRN.findUnique({ where: { grnNo: args.grnNo }, include: { party: true, lines: true, department: true } })
      if (!grn) return { text: `GRN ${args.grnNo} not found` }
      const r = { entityId: grn.id, title: grn.grnNo, detail: `lot approval ${grn.grnNo} · ${grn.department?.name ?? 'dept'} · ${grn.lines.length} line(s) · ${grn.totalQty} units`, href: approvalRefHref('lot', grn.id) }
      return proposeApprovalGate('lot', r, args.comments, actor)
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
  ...waveCListTools, // SPEC-M19 §3 Wave C — 11 completion-master list doors
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
    // SPEC-M6 §7-B-3 — courier despatch variant (mode injection)
    'create_courier_dc',
    'Despatch pieces BY COURIER (DC-#### space shared with vehicle despatches). Required: orderNo, totalPcs, courierName (the courier company). Optional: dcNo, despatchDate, vehicleNo, lines.',
    'orders',
    DESPATCH_SCHEMA,
    (input: any) => planPcsDespatch({ ...input, mode: 'courier' }),
  ),
  docTool(
    // SPEC-M6 §7-B-4 — loading challan variant (LAD-####, status starts loading)
    'create_loading_challan',
    'Raise a LOADING CHALLAN (LAD-#### auto) — pieces loaded for despatch; status starts loading, ledger posts pcs OUT of G2 identically to a despatch. Required: orderNo, totalPcs, vehicleNo. Optional: courierName, despatchDate, lines.',
    'orders',
    DESPATCH_SCHEMA,
    (input: any) => planPcsDespatch({ ...input, mode: 'loading' }),
  ),
  docTool(
    // SPEC-M6 §7-C-6 — lifecycle: close an order (guards: 95% despatched + invoiced)
    'close_order',
    'Close an order once shipped & billed (blocks further entries). Required: orderNo. Guards: despatched >= 95% of totalPcs AND at least one invoice; pass force to override. Optional: notes.',
    'orders',
    CLOSE_ORDER_SCHEMA,
    planCloseOrder,
  ),
  docTool(
    // SPEC-M6 §7-C-6 — lifecycle: cancel a program (ledger net-zero guard)
    'cancel_program',
    'Cancel a production program (accounting-aware). Required: programNo. Guard: the program item ledger nets to zero for the order; pass force to override. Optional: notes.',
    'production',
    CANCEL_PROGRAM_SCHEMA,
    planCancelProgram,
  ),
  docTool(
    // SPEC-M6 §7-C-6 — lifecycle: complete a program (balance guard)
    'complete_program',
    'Mark a production program complete (settles balances). Required: programNo. Guard: achieved >= required (ledger-derived); pass force to settle with a balance. Optional: notes.',
    'production',
    COMPLETE_PROGRAM_SCHEMA,
    planCompleteProgram,
  ),
  docTool(
    // SPEC-M6 §7-C-6 — lifecycle: cancel or complete a PO (receipt-aware guards)
    'complete_purchase_order',
    'Complete a purchase order (received qty > 0 required). Required: poNo, action=complete. The cancel action (no receipts allowed) rides cancel_purchase_order.',
    'procurement',
    PO_LIFECYCLE_SCHEMA,
    planPoLifecycle,
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

  // ───────────── SPEC-M6 §7-D (Wave D) — process-tail docTools (+3) ─────────────
  docTool(
    // §7-D-1 — opening stock (OPN-#### variant over planStockAdjustment)
    'post_opening',
    'Post an OPENING STOCK balance when onboarding a godown/item (OPN-#### auto). action is fixed to add and reason to "Opening stock". Required: godownCode, itemType (yarn|fabric|accessory), itemCode, qty (kgs for yarn/fabric, pcs for accessory). Optional: docNo, adjDate.',
    'inventory',
    OPENING_STOCK_SCHEMA,
    planOpeningStock,
  ),
  docTool(
    // §7-D-1 — ready to cut (the virtual Cutting dept pool)
    'ready_to_cut',
    'Move program stock into the ready-to-cut (virtual Cutting dept) pool — RTC-#### auto. Posts ready_to_cut_out (store pool −) + ready_to_cut_in (D3-keyed cutting pool +) sharing one number; total godown stock unchanged. Required: itemCode, qty (kgs). Optional: itemType (fabric default | yarn), fromGodownCode (G1 default), orderNo (program flag), docNo, transferDate, notes.',
    'cutting',
    READY_TO_CUT_SCHEMA,
    planReadyToCut,
  ),
  docTool(
    // §7-D-1 — the generalized material DC (BOTH doors: MDC- single / PDC- multi)
    'create_dc',
    'Raise a material Delivery Challan to ANY party (process/jobwork). dcNo auto: MDC-#### single material / PDC-#### when lines[] present. Posts process_delivery OUT per line (material leaves the godown). Single-material door: itemType + itemCode + qty (+rate). Multi-component door: lines (array of {itemType (yarn|fabric|accessory), itemCode, qty, rate}). Optional: partyCode, processType (default general), godownCode (G1 default), dcDate, vehicleNo, notes.',
    'dispatch',
    MATERIAL_DC_SCHEMA,
    planMaterialDc,
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
      // SPEC-M6 §7-C-5 — logic extracted to posting/lifecycle.ts planOrderAmend
      // (the /orders/amendments screen shares it); json contract frozen.
      const { planOrderAmend } = await import('@/lib/erp/posting/lifecycle')
      const plan = await planOrderAmend(args)
      if (!plan.ok) return { text: plan.error! }
      return {
        text: plan.text!,
        plan: {
          summary: plan.summary!,
          updates: plan.updates,
          sideEffects: plan.sideEffects,
        },
        commit: plan.commit,
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

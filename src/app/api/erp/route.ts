/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { listMasters } from '@/lib/erp/posting/master-service'
import { approvalRefHref } from '@/lib/erp/approval-kinds'
import { requireApiSession } from '@/lib/auth/api-guard'

// GET /api/erp?resource=orders|purchase_orders|inventory|cutting|production|invoices|costing|hr|approvals|masters|master_search&...
// SPEC-M7 Wave B — guarded: no session → 401 JSON (browser fetches send the
// fo_session cookie same-origin automatically; scripts use the cookie fixture).
export async function GET(req: Request) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  try {
    const url = new URL(req.url)
    const resource = url.searchParams.get('resource')
    const id = url.searchParams.get('id')

    switch (resource) {
      // W4 picker feed (SPEC-M3 §9.3) — the SAME listMasters read path the
      // masters screens use, filtered server-side, emitted as {value,label}.
      case 'master_search': {
        const slug = url.searchParams.get('slug') || ''
        const q = (url.searchParams.get('q') || '').trim().toLowerCase()
        const valueField = url.searchParams.get('valueField') || ''
        // ERRATUM 7 (M5 Wave B) — optional server-side equality filter on the
        // picker feed (wage payments: party picker pinned to partyType=employee)
        const filterField = url.searchParams.get('filterField') || ''
        const filterValue = url.searchParams.get('filterValue') || ''
        const config = getMasterConfig(slug)
        if (!config) return Response.json({ error: 'Unknown master slug' }, { status: 400 })
        const vField = valueField || config.codeField || config.titleField
        let rows = await listMasters(config)
        if (filterField && filterValue) {
          rows = rows.filter((r) => String(r[filterField] ?? '') === filterValue)
        }
        const filtered = q
          ? rows.filter((r) => config.searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(q)))
          : rows
        const options = filtered.slice(0, 50).map((r) => {
          const value = String(r[vField] ?? '')
          const title = String(r[config.titleField] ?? '')
          return { value, label: title && title !== value ? `${value} — ${title}` : value }
        })
        return Response.json({ options })
      }
      case 'dashboard': {
        const [openOrders, pendingPos, totalStock, todayProduction, pendingApprovals, openInvoices, recentOrders, recentPos, recentCuts, recentInvoices] = await Promise.all([
          db.order.count({ where: { status: { in: ['open', 'in_progress'] } } }),
          db.purchaseOrder.count({ where: { status: { in: ['open', 'partial'] } } }),
          db.currentStock.findMany(),
          db.productionEntry.findMany({
            where: { prodDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
          }),
          db.approval.count({ where: { status: 'pending' } }),
          db.salesInvoice.count({ where: { status: 'issued' } }),
          db.order.findMany({ take: 5, orderBy: { orderDate: 'desc' }, include: { buyer: true, style: true } }),
          db.purchaseOrder.findMany({ take: 5, orderBy: { orderDate: 'desc' }, include: { party: true } }),
          db.cutOrder.findMany({ take: 5, orderBy: { cutDate: 'desc' }, include: { order: { include: { buyer: true } }, bundles: true } }),
          db.salesInvoice.findMany({ take: 5, orderBy: { invoiceDate: 'desc' }, include: { party: true, order: true } }),
        ])
        const stockValue = totalStock.reduce((s, st) => s + (st.kgs + st.mtrs + st.pcs) * st.rate, 0)
        const todayPcs = todayProduction.reduce((s, e) => s + e.qty, 0)
        return Response.json({
          kpis: { openOrders, pendingPos, stockValue, todayPcs, pendingApprovals, openInvoices },
          recentOrders, recentPos, recentCuts, recentInvoices,
        })
      }
      case 'orders': {
        if (id) {
          const order = await db.order.findUnique({
            where: { id },
            include: {
              buyer: true, style: true,
              lines: { include: { style: true, colour: true, size: true } },
              poLines: { include: { po: true } },
              cutOrders: { include: { bundles: true } },
              productionEntries: { include: { operator: true, department: true } },
              salesInvoices: true, costSheet: true,
            },
          })
          return Response.json(order)
        }
        const status = url.searchParams.get('status') || undefined
        const orders = await db.order.findMany({
          where: { status: status ? status : undefined },
          orderBy: { orderDate: 'desc' },
          include: { buyer: true, style: true, _count: { select: { lines: true, cutOrders: true, salesInvoices: true } } },
        })
        return Response.json(orders)
      }
      case 'purchase_orders': {
        if (id) {
          const po = await db.purchaseOrder.findUnique({
            where: { id },
            include: { party: true, lines: { include: { order: true } }, grns: { include: { lines: true } } },
          })
          return Response.json(po)
        }
        const pos = await db.purchaseOrder.findMany({
          orderBy: { orderDate: 'desc' },
          include: { party: true, _count: { select: { lines: true, grns: true } } },
        })
        return Response.json(pos)
      }
      case 'inventory': {
        const godownCode = url.searchParams.get('godown')
        let where: any = {}
        if (godownCode) {
          const g = await db.godown.findUnique({ where: { code: godownCode } })
          if (g) where.godownId = g.id
        }
        const stocks = await db.currentStock.findMany({
          where,
          include: { godown: true, colour: true, size: true, department: true },
        })
        const ledger = await db.stockLedger.findMany({
          take: 30, orderBy: { docDate: 'desc' },
          include: { godown: true, party: true },
        })
        const godowns = await db.godown.findMany()
        return Response.json({ stocks, ledger, godowns })
      }
      case 'cutting': {
        const cuts = await db.cutOrder.findMany({
          orderBy: { cutDate: 'desc' },
          include: { order: { include: { buyer: true, style: true } }, bundles: true },
        })
        return Response.json(cuts)
      }
      case 'production': {
        const entries = await db.productionEntry.findMany({
          orderBy: { prodDate: 'desc' },
          take: 100,
          include: { operator: true, department: true, order: { include: { buyer: true, style: true } } },
        })
        const lines = await db.line.findMany({ include: { department: true } })
        const deptSummary = await db.department.findMany({
          orderBy: { orderSno: 'asc' },
          include: { _count: { select: { productionEntries: true } } },
        })
        return Response.json({ entries, lines, deptSummary })
      }
      case 'invoices': {
        const invs = await db.salesInvoice.findMany({
          orderBy: { invoiceDate: 'desc' },
          include: { party: true, order: true },
        })
        return Response.json(invs)
      }
      case 'costing': {
        const sheets = await db.costSheet.findMany({
          include: { order: { include: { buyer: true, style: true } } },
          orderBy: { createdAt: 'desc' },
        })
        return Response.json(sheets)
      }
      case 'hr': {
        const emps = await db.employee.findMany({
          include: { department: true },
          orderBy: { code: 'asc' },
        })
        const depts = await db.department.findMany({ orderBy: { orderSno: 'asc' } })
        return Response.json({ emps, depts })
      }
      case 'approvals': {
        // SPEC-M5 §6 Wave C — optional kind filter (the kind === Approval.entity;
        // the registry lives in src/lib/erp/approval-kinds.ts). Default: all kinds.
        const kind = url.searchParams.get('kind')
        const approvals = await db.approval.findMany({
          where: { status: 'pending', ...(kind ? { entity: kind } : {}) },
          orderBy: { createdAt: 'desc' },
        })
        const enriched = await Promise.all(approvals.map(async (a) => {
          // Keep `entity` as the type string ('po' | 'grn' | ...) — the client renders
          // it as text. The fetched record goes under `entityData` so a PO object
          // can never end up rendered as a React child.
          let entityData: any = null
          if (a.entity === 'po') {
            entityData = await db.purchaseOrder.findUnique({
              where: { id: a.entityId }, include: { party: true, lines: true },
            })
          } else if (a.entity === 'supplier_bill' || a.entity === 'reprocess') {
            entityData = await db.gRN.findUnique({
              where: { id: a.entityId }, include: { party: true },
            })
          } else if (a.entity === 'godown_transfer') {
            // entityId is the GT-#### docNo — surface the ledger pair.
            entityData = await db.stockLedger.findMany({
              where: { docNo: a.entityId, txnType: { in: ['godown_transfer_out', 'godown_transfer_in'] } },
              orderBy: { createdAt: 'asc' },
            })
          } else if (a.entity === 'non_return_dc') {
            entityData = await db.pcsDespatch.findUnique({ where: { id: a.entityId } })
          } else if (a.entity === 'grn_acceptance' || a.entity === 'lot') {
            // SPEC-M6 §6 (Wave D) — GRN-shaped kinds (entityId = the GRN id)
            entityData = await db.gRN.findUnique({
              where: { id: a.entityId }, include: { party: true, lines: true, department: true },
            })
          } else if (a.entity === 'cutting_ack') {
            entityData = await db.lineIssue.findUnique({
              where: { id: a.entityId }, include: { line: true, order: true },
            })
          } else if (a.entity === 'pcs_acceptance') {
            entityData = await db.jobworkOrder.findUnique({
              where: { id: a.entityId }, include: { jobworker: true },
            })
          }
          return { ...a, entityData, refHref: approvalRefHref(a.entity, a.entityId) }
        }))
        return Response.json(enriched)
      }
      case 'masters': {
        const [buyers, styles, parties, godowns, departments, colours, sizes, yarns, fabrics, accessories, employees] = await Promise.all([
          db.buyer.findMany(),
          db.style.findMany({ include: { buyer: true } }),
          db.party.findMany(),
          db.godown.findMany(),
          db.department.findMany({ orderBy: { orderSno: 'asc' } }),
          db.colour.findMany(),
          db.size.findMany({ orderBy: { sort: 'asc' } }),
          db.yarn.findMany(),
          db.fabric.findMany({ include: { dia: true, uom: true } }),
          db.accessory.findMany({ include: { uom: true } }),
          db.employee.findMany({ include: { department: true } }),
        ])
        return Response.json({ buyers, styles, parties, godowns, departments, colours, sizes, yarns, fabrics, accessories, employees })
      }
      case 'agent_turns': {
        const turns = await db.agentTurn.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
        return Response.json(turns)
      }
      default:
        return Response.json({ error: 'Unknown resource' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[/api/erp] error:', err)
    return Response.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}

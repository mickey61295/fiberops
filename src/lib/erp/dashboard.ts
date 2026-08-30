/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== DASHBOARD 2.0 — role dashboards (SPEC-M16) ==============
// One server-side snapshot per role: effective KPI tiles + chart payloads +
// recent lists. Tiles are READ-ONLY aggregates — no new domain math; the
// chain funnel reuses queryOrderStatus() wholesale (SPEC-M16 §3.1).
// Tile layout persistence: AppOption key `dashboard:<role>:tiles` (JSON array
// of registry ids; the AppOption key-value store is the sanctioned mechanism,
// same as flag:* rows — SPEC-M16 §2 keeps it PER-ROLE, the spec's letter).

import { db } from '@/lib/db'
import { queryOrderStatus } from '@/lib/erp/registers/order-status'

// ── Tile registry (SPEC-M16 §3.1) ──────────────────────────────────────────

export interface TileDef {
  id: string
  label: string
  /** lucide icon name — the client maps name → component */
  icon: string
  color: 'emerald' | 'amber' | 'teal' | 'slate' | 'rose' | 'violet'
  href: string
}

export const TILE_REGISTRY: TileDef[] = [
  { id: 'open_orders', label: 'Open Orders', icon: 'Package', color: 'emerald', href: '/orders/register?status=open' },
  { id: 'inhand_pcs', label: 'In-Hand Pcs', icon: 'Boxes', color: 'teal', href: '/orders/in-hand' },
  { id: 'orders_due_7d', label: 'Due in 7 Days', icon: 'CalendarClock', color: 'amber', href: '/orders/status' },
  { id: 'samples_pending', label: 'Samples Pending', icon: 'Shirt', color: 'violet', href: '/orders/samples' },
  { id: 'pending_pos', label: 'Pending POs', icon: 'ShoppingCart', color: 'amber', href: '/procurement/po' },
  { id: 'grns_today', label: 'GRNs Today', icon: 'Truck', color: 'teal', href: '/procurement/grn' },
  { id: 'stock_value', label: 'Stock Value', icon: 'Warehouse', color: 'emerald', href: '/inventory' },
  { id: 'low_stock', label: 'Negative Buckets', icon: 'TriangleAlert', color: 'rose', href: '/inventory/stock' },
  { id: 'cut_open', label: 'Cuts Planned', icon: 'Scissors', color: 'slate', href: '/cutting/register' },
  { id: 'today_pcs', label: 'Today Pcs', icon: 'Factory', color: 'emerald', href: '/production/register' },
  { id: 'entries_30d', label: 'Prod Entries 30d', icon: 'ClipboardList', color: 'slate', href: '/production/register' },
  { id: 'pending_approvals', label: 'Pending Approvals', icon: 'GitBranch', color: 'rose', href: '/approvals' },
  { id: 'open_invoices', label: 'Open Invoices', icon: 'FileText', color: 'violet', href: '/accounts/bills-register?status=issued' },
  { id: 'invoiced_30d', label: 'Invoiced 30d', icon: 'IndianRupee', color: 'emerald', href: '/accounts/invoice' },
  { id: 'received_30d', label: 'Received 30d', icon: 'Landmark', color: 'teal', href: '/accounts/payments' },
  { id: 'employees', label: 'Active Employees', icon: 'Users', color: 'slate', href: '/hr/employees' },
]

const TILE_IDS = new Set(TILE_REGISTRY.map((t) => t.id))

export type ChartPick = 'chain' | 'production' | 'cash'
export type RecentPick = 'orders' | 'pos' | 'cuts' | 'invoices'

export interface RoleProfile {
  tiles: string[]
  charts: ChartPick[]
  recent: RecentPick[]
}

export const ROLE_DEFAULTS: Record<string, RoleProfile> = {
  admin: {
    tiles: ['open_orders', 'pending_pos', 'stock_value', 'today_pcs', 'pending_approvals', 'open_invoices', 'invoiced_30d', 'received_30d'],
    charts: ['chain', 'production', 'cash'],
    recent: ['orders', 'pos', 'cuts', 'invoices'],
  },
  merchandiser: {
    tiles: ['open_orders', 'inhand_pcs', 'orders_due_7d', 'samples_pending', 'pending_pos', 'open_invoices'],
    charts: ['chain', 'production'],
    recent: ['orders'],
  },
  storekeeper: {
    tiles: ['pending_pos', 'grns_today', 'stock_value', 'low_stock'],
    charts: ['chain'],
    recent: ['pos'],
  },
  accountant: {
    tiles: ['open_invoices', 'invoiced_30d', 'received_30d', 'pending_approvals', 'pending_pos'],
    charts: ['cash'],
    recent: ['invoices'],
  },
  production_mgr: {
    tiles: ['today_pcs', 'entries_30d', 'pending_approvals', 'inhand_pcs'],
    charts: ['production', 'chain'],
    recent: ['orders'],
  },
  cutting_mgr: {
    tiles: ['cut_open', 'inhand_pcs', 'today_pcs'],
    charts: ['production'],
    recent: ['cuts'],
  },
  hr: {
    tiles: ['employees', 'entries_30d', 'pending_approvals'],
    charts: ['production'],
    recent: [],
  },
}

export function roleProfile(role: string | null | undefined): RoleProfile {
  return ROLE_DEFAULTS[role ?? 'admin'] ?? ROLE_DEFAULTS.admin
}

// ── Tile layout persistence (AppOption dashboard:<role>:tiles) ─────────────

const layoutKey = (role: string) => `dashboard:${role}:tiles`

export async function getEffectiveTiles(role: string): Promise<string[]> {
  const profile = roleProfile(role)
  const row = await db.appOption.findUnique({ where: { key: layoutKey(role) } })
  if (row?.value) {
    try {
      const saved = JSON.parse(row.value)
      if (Array.isArray(saved)) {
        const valid = saved.filter((id: any) => typeof id === 'string' && TILE_IDS.has(id))
        if (valid.length) return valid
      }
    } catch {
      // corrupt row → fall through to defaults
    }
  }
  return profile.tiles
}

export async function saveRoleTiles(role: string, tiles: string[] | null): Promise<void> {
  const key = layoutKey(role)
  if (tiles === null) {
    await db.appOption.deleteMany({ where: { key } })
    return
  }
  const valid = tiles.filter((id) => TILE_IDS.has(id))
  const value = JSON.stringify(valid)
  await db.appOption.upsert({
    where: { key },
    update: { value },
    create: { key, value, group: 'dashboard', label: `Dashboard tiles (${role})` },
  })
}

// ── Snapshot (one call per page render) ────────────────────────────────────

export interface DashboardSnapshot {
  role: string
  tiles: { id: string; label: string; icon: string; color: TileDef['color']; href: string; value: string }[]
  chainFunnel: { key: string; label: string; count: number }[]
  productionTrend: { date: string; pcs: number }[]
  cashTrend: { date: string; invoiced: number; received: number }[]
  recent: {
    orders: { docNo: string; meta: string; right: string; status: string; href: string }[]
    pos: { docNo: string; meta: string; right: string; status: string; href: string }[]
    cuts: { docNo: string; meta: string; right: string; status: string; href: string }[]
    invoices: { docNo: string; meta: string; right: string; status: string; href: string }[]
  }
}

const CHAIN_FLAG_LABELS: { key: string; label: string }[] = [
  { key: 'order', label: 'Order' },
  { key: 'bom', label: 'BOM' },
  { key: 'program', label: 'Program' },
  { key: 'cut', label: 'Cut' },
  { key: 'lineIssue', label: 'Line Issue' },
  { key: 'production', label: 'Production' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'cost', label: 'Cost' },
  { key: 'payment', label: 'Payment' },
]

const DAY_MS = 24 * 60 * 60 * 1000

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shortDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const inrL = (n: number) => (n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` : `₹${(n / 100000).toFixed(1)}L`)

export async function getDashboardSnapshot(role: string): Promise<DashboardSnapshot> {
  const profile = roleProfile(role)
  const tileIds = await getEffectiveTiles(role)
  const tileSet = new Set(tileIds)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const windowStart = new Date(todayStart.getTime() - 29 * DAY_MS)
  const dueEnd = new Date(todayStart.getTime() + 8 * DAY_MS) // 7 full days ahead

  const [orderStatus, pendingPos, grnsToday, totalStock, lowBuckets, cutOpen, todayProd, entries30d, pendingApprovals, openInvoices, invoiced30d, received30d, employees, samplesPending, recentOrders, recentPos, recentCuts, recentInvoices] = await Promise.all([
    queryOrderStatus(), // chain funnel + open_orders + inhand_pcs (SPEC-M16 §3.1)
    db.purchaseOrder.count({ where: { status: { in: ['open', 'partial'] } } }),
    db.gRN.count({ where: { createdAt: { gte: todayStart } } }),
    db.currentStock.findMany(),
    db.currentStock.count({ where: { OR: [{ kgs: { lt: 0 } }, { mtrs: { lt: 0 } }, { pcs: { lt: 0 } }] } }),
    db.cutOrder.count({ where: { status: 'planned' } }),
    db.productionEntry.findMany({ where: { prodDate: { gte: todayStart } }, select: { qty: true } }),
    db.productionEntry.count({ where: { prodDate: { gte: windowStart } } }),
    db.approval.count({ where: { status: 'pending' } }),
    db.salesInvoice.count({ where: { status: 'issued' } }),
    db.salesInvoice.aggregate({ _sum: { billAmount: true }, where: { invoiceDate: { gte: windowStart } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { direction: 'in', payDate: { gte: windowStart } } }),
    db.employee.count({ where: { active: true } }),
    db.sample.count({ where: { status: 'submitted' } }),
    profile.recent.includes('orders')
      ? db.order.findMany({ take: 5, orderBy: { orderDate: 'desc' }, include: { buyer: true, style: true } })
      : Promise.resolve([]),
    profile.recent.includes('pos')
      ? db.purchaseOrder.findMany({ take: 5, orderBy: { orderDate: 'desc' }, include: { party: true } })
      : Promise.resolve([]),
    profile.recent.includes('cuts')
      ? db.cutOrder.findMany({ take: 5, orderBy: { cutDate: 'desc' }, include: { order: { include: { buyer: true } }, bundles: true } })
      : Promise.resolve([]),
    profile.recent.includes('invoices')
      ? db.salesInvoice.findMany({ take: 5, orderBy: { invoiceDate: 'desc' }, include: { party: true, order: true } })
      : Promise.resolve([]),
  ])

  const values: Record<string, string> = {
    open_orders: String(orderStatus.totalOpenOrders),
    inhand_pcs: orderStatus.totalOpenPcs.toLocaleString('en-IN'),
    orders_due_7d: String(
      orderStatus.rows.filter((r) => r.deliveryDate && r.deliveryDate >= todayStart && r.deliveryDate < dueEnd).length
    ),
    samples_pending: String(samplesPending),
    pending_pos: String(pendingPos),
    grns_today: String(grnsToday),
    stock_value: inrL(totalStock.reduce((s, st) => s + (st.kgs + st.mtrs + st.pcs) * st.rate, 0)),
    low_stock: String(lowBuckets),
    cut_open: String(cutOpen),
    today_pcs: todayProd.reduce((s, e) => s + e.qty, 0).toLocaleString('en-IN'),
    entries_30d: String(entries30d),
    pending_approvals: String(pendingApprovals),
    open_invoices: String(openInvoices),
    invoiced_30d: inrL(invoiced30d._sum.billAmount ?? 0),
    received_30d: inrL(received30d._sum.amount ?? 0),
    employees: String(employees),
  }

  const tiles = tileIds
    .map((id) => {
      const def = TILE_REGISTRY.find((t) => t.id === id)
      if (!def || values[id] === undefined) return null
      return { ...def, value: values[id] }
    })
    .filter(Boolean) as DashboardSnapshot['tiles']

  // Chain funnel — counts over OPEN orders' chain flags (queryOrderStatus reuse)
  const chainFunnel = CHAIN_FLAG_LABELS.map(({ key, label }) => ({
    key,
    label,
    count: orderStatus.rows.filter((r) => (r.flags as any)?.[key]).length,
  }))

  // 30-day trends (windowed aggregates, zero domain math — SPEC-M16 §2)
  const wantProduction = profile.charts.includes('production') || tileSet.has('entries_30d') || tileSet.has('today_pcs')
  const wantCash = profile.charts.includes('cash')
  const [prodRows, invRows, payRows] = await Promise.all([
    wantProduction
      ? db.productionEntry.findMany({ where: { prodDate: { gte: windowStart } }, select: { prodDate: true, qty: true } })
      : Promise.resolve([]),
    wantCash
      ? db.salesInvoice.findMany({ where: { invoiceDate: { gte: windowStart } }, select: { invoiceDate: true, billAmount: true } })
      : Promise.resolve([]),
    wantCash
      ? db.payment.findMany({ where: { direction: 'in', payDate: { gte: windowStart } }, select: { payDate: true, amount: true } })
      : Promise.resolve([]),
  ])

  const days: string[] = []
  for (let i = 0; i < 30; i++) days.push(dayKey(new Date(windowStart.getTime() + i * DAY_MS)))
  const pcsByDay = new Map<string, number>()
  for (const r of prodRows) pcsByDay.set(dayKey(new Date(r.prodDate)), (pcsByDay.get(dayKey(new Date(r.prodDate))) ?? 0) + r.qty)
  const productionTrend = wantProduction ? days.map((d) => ({ date: shortDay(d), pcs: pcsByDay.get(d) ?? 0 })) : []

  const invByDay = new Map<string, number>()
  for (const r of invRows) invByDay.set(dayKey(new Date(r.invoiceDate)), (invByDay.get(dayKey(new Date(r.invoiceDate))) ?? 0) + (r.billAmount ?? 0))
  const payByDay = new Map<string, number>()
  for (const r of payRows) payByDay.set(dayKey(new Date(r.payDate)), (payByDay.get(dayKey(new Date(r.payDate))) ?? 0) + r.amount)
  const cashTrend = wantCash
    ? days.map((d) => ({ date: shortDay(d), invoiced: invByDay.get(d) ?? 0, received: payByDay.get(d) ?? 0 }))
    : []

  return {
    role,
    tiles,
    chainFunnel,
    productionTrend,
    cashTrend,
    recent: {
      orders: recentOrders.map((o: any) => ({
        docNo: o.orderNo, meta: `${o.buyer?.name ?? ''} · ${o.style?.styleNo ?? ''}`.trim(),
        right: `${o.totalPcs.toLocaleString('en-IN')} pcs`, status: o.status, href: `/orders/${o.id}`,
      })),
      pos: recentPos.map((p: any) => ({
        docNo: p.poNo, meta: p.party?.name ?? '', right: inr(p.totalValue ?? 0), status: p.status,
        href: `/procurement/po/${p.id}`,
      })),
      cuts: recentCuts.map((c: any) => ({
        docNo: c.cutNo, meta: `${c.order?.orderNo ?? ''} · ${c.order?.buyer?.name ?? ''}`.trim(),
        right: `${c.totalPcs.toLocaleString('en-IN')} pcs · ${c.bundles?.length ?? 0} bundles`, status: c.status,
        href: `/cutting/job-order/${c.id}`,
      })),
      invoices: recentInvoices.map((i: any) => ({
        docNo: i.invoiceNo, meta: `${i.party?.name ?? ''} · ${i.order?.orderNo ?? ''}`.trim(),
        right: inr(i.billAmount ?? 0), status: i.status, href: `/accounts/invoice/${i.id}`,
      })),
    },
  }
}

/**
 * LIVE OPERATIONS TRACKER service — SPEC-M9 §3/§4.
 *
 * The ONE aggregation behind BOTH doors (Contract rule #8: one service per
 * operation): the /tracker screen (via /api/tracker) and the get_live_activity
 * agent tool. Read-only, zero app deps (db + approval-kinds only) so vitest
 * drives it directly.
 *
 * THE ONE RULE (SPEC-M9 §3): `createdAt` is the live signal — every feed
 * entry, every "today" count AND every module-board row uses createdAt >=
 * start of local day, NOT the business date (orderDate/prodDate stay
 * business-facing on the registers). The tracker answers "what is being
 * RECORDED right now".
 *
 * REVISED (pre-commit, user clarification): the snapshot also carries the
 * PARITY-STYLE LIVE BOARD (§4-B) — 11 groups / 17 family rows with
 * total/today/latest status — the /parity scoreboard format driven by live
 * data instead of static config.
 *
 * Robustness rule: a corrupt row must never 500 the tracker — JSON parse
 * failures degrade to 0 tool calls, null relations degrade to '—'.
 */
import { db } from '@/lib/db'
import { findApprovalKind } from '@/lib/erp/approval-kinds'
import { FLAG_DEFS } from '@/lib/erp/flags'

export interface TrackerFeedEntry {
  kind: string // family key (SPEC-M9 §4 table)
  label: string // human family label, e.g. 'Sales Invoice'
  docNo: string // mono identifier (doc no, or synthesized)
  meta: string // one-line context: 'party · qty · ₹value'
  status?: string // family status when it has one
  at: string // ISO createdAt — the feed sort key
  href: string | null // deep link to the view page (null = none)
}

export interface TrackerSnapshot {
  generatedAt: string
  kpis: {
    docsToday: number
    prodPcsToday: number
    despatchPcsToday: number
    stockMovesToday: number
    gateToday: number
    agentTurnsToday: number
    approvalsToday: number
    pendingApprovals: number
    ordersToday: number
    posToday: number
    grnsToday: number
    invoicesToday: number
    paymentsToday: number
    cutsToday: number
    jobworkToday: number
  }
  feed: TrackerFeedEntry[]
  /** Parity-style live scoreboard (SPEC-M9 §4-B, revision) — one row per
   *  screen family: records total, rows today, latest doc + Active status. */
  modules: {
    activeToday: number // families with today > 0
    familiesTotal: number // 17 (16 feed families + board-only stock ledger)
    groups: TrackerModuleGroup[] // 11 groups, fixed order
  }
  approvals: {
    pendingByKind: { kind: string; label: string; count: number }[]
    oldestPendingMin: number | null
    recent: { kind: string; status: string; actor: string; at: string }[]
  }
  agent: {
    turns: { prompt: string; toolCalls: number; approved: boolean; user: string; at: string }[]
    approvedToday: number
  }
  system: {
    serverTime: string
    usersTotal: number
    usersActive: number
    parties: number
    stockLedgerRows: number
    flagsTotal: number
    flagsOn: number
  }
}

export interface TrackerFamilyRow {
  kind: string // family key; the 16 feed kinds + board-only 'stock'
  label: string // 'Orders', 'GRNs', 'Agent Turns'…
  listHref: string | null // the family's register/list page (null = agent panel)
  total: number // all-time record count
  today: number // rows with createdAt >= start of local day (THE ONE RULE)
  latestDocNo: string | null
  latestAt: string | null // ISO createdAt of the newest row
  latestHref: string | null
  latestMeta: string | null
}

export interface TrackerModuleGroup {
  id: string // board group id (menu-group-aligned where natural)
  label: string
  families: TrackerFamilyRow[]
}

const FEED_PER_FAMILY = 5
export const FEED_LIMIT_DEFAULT = 30
export const FEED_LIMIT_MAX = 40

const inr = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`
const iso = (d: Date) => d.toISOString()
const nameOrDash = (n?: string | null) => (n && n.trim() ? n : '—')

/** Count of {name, args, result} entries in an AgentTurn.toolCalls JSON array
 *  (0 on absent/corrupt JSON — SPEC-M9 §4 robustness rule). */
export function countToolCalls(toolCallsJson?: string | null): number {
  if (!toolCallsJson) return 0
  try {
    const parsed = JSON.parse(toolCallsJson)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

/** The board's 11 groups in fixed display order (SPEC-M9 §4-B table).
 *  Single-line entries so context_check.sh can pin the count. */
const MODULE_GROUPS: { id: string; label: string; kinds: string[] }[] = [
  { id: 'orders', label: 'Orders', kinds: ['order', 'sample'] },
  { id: 'procurement', label: 'Procurement', kinds: ['po', 'grn'] },
  { id: 'cutting', label: 'Cutting', kinds: ['cut'] },
  { id: 'production', label: 'Production', kinds: ['production', 'jobwork'] },
  { id: 'pieces', label: 'Despatch & Gate', kinds: ['despatch', 'gate'] },
  { id: 'accounts', label: 'Accounts', kinds: ['invoice', 'payment', 'journal'] },
  { id: 'inventory', label: 'Inventory', kinds: ['stock'] },
  { id: 'quality', label: 'Quality', kinds: ['labtest'] },
  { id: 'costing', label: 'Costing', kinds: ['expense'] },
  { id: 'workflow', label: 'Workflow', kinds: ['approval'] },
  { id: 'agent', label: 'AI Agent', kinds: ['agent'] },
]

/** Latest feed entry of a family (entries arrive createdAt desc → index 0). */
const latestEntry = (entries: TrackerFeedEntry[]): TrackerFeedEntry | null =>
  entries[0] ?? null

/** One board row from the family's totals + its feed entries (SPEC-M9 §4-B). */
function familyRow(
  kind: string, label: string, listHref: string | null,
  total: number, today: number, entries: TrackerFeedEntry[],
): TrackerFamilyRow {
  const l = latestEntry(entries)
  return {
    kind, label, listHref, total, today,
    latestDocNo: l?.docNo ?? null,
    latestAt: l?.at ?? null,
    latestHref: l?.href ?? null,
    latestMeta: l?.meta ?? null,
  }
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * The snapshot (SPEC-M9 §4). ~35 light queries in 4 grouped rounds — cheap
 * against SQLite at current row counts; createdAt indexes are the M14 item.
 */
export async function getTrackerSnapshot(opts: { feedLimit?: number } = {}): Promise<TrackerSnapshot> {
  const feedLimit = Math.min(Math.max(opts.feedLimit ?? FEED_LIMIT_DEFAULT, 1), FEED_LIMIT_MAX)
  const today = startOfToday()

  // ── Round 1: the 16 family feed fetches (take 5 newest by createdAt) + the
  //    board-only newest StockLedger row ──
  const [
    orders, pos, grns, invoices, payments, journals, cuts, production, despatches,
    jobworks, gates, samples, labtests, expenses, approvals, agentTurns, latestStock,
  ] = await Promise.all([
    db.order.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' }, include: { buyer: true } }),
    db.purchaseOrder.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' }, include: { party: true } }),
    db.gRN.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' }, include: { party: true } }),
    db.salesInvoice.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' }, include: { party: true } }),
    db.payment.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' }, include: { party: true } }),
    db.journal.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' }, include: { party: true } }),
    db.cutOrder.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' }, include: { order: true } }),
    db.productionEntry.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' }, include: { order: true, department: true } }),
    db.pcsDespatch.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' } }),
    db.jobworkOrder.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' }, include: { jobworker: true } }),
    db.gateEntry.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' } }),
    db.sample.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' } }),
    db.labTest.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' } }),
    db.expense.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' } }),
    db.approval.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' } }),
    db.agentTurn.findMany({ take: FEED_PER_FAMILY, orderBy: { createdAt: 'desc' } }),
    db.stockLedger.findFirst({ orderBy: { createdAt: 'desc' } }),
  ])

  // per-family entry arrays (newest first) — the feed merges them; the board
  // reads entries[0] as the family's latest (no extra queries).
  const orderFeed: TrackerFeedEntry[] = orders.map((o) => ({
    kind: 'order', label: 'Order', docNo: o.orderNo,
    meta: `${nameOrDash(o.buyer?.name)} · ${o.totalPcs} pcs · ${inr(o.totalValue)}`,
    status: o.status, at: iso(o.createdAt), href: `/orders/${o.id}`,
  }))
  const poFeed: TrackerFeedEntry[] = pos.map((p) => ({
    kind: 'po', label: 'Purchase Order', docNo: p.poNo,
    meta: `${nameOrDash(p.party?.name)} · ${p.poType} · ${inr(p.totalValue)}`,
    status: p.status, at: iso(p.createdAt), href: `/procurement/po/${p.id}`,
  }))
  const grnFeed: TrackerFeedEntry[] = grns.map((g) => ({
    kind: 'grn', label: 'GRN', docNo: g.grnNo,
    meta: `${nameOrDash(g.party?.name)} · ${g.grnType} · ${g.totalQty.toLocaleString('en-IN')} qty`,
    at: iso(g.createdAt), href: `/procurement/grn/${g.id}`,
  }))
  const invoiceFeed: TrackerFeedEntry[] = invoices.map((i) => ({
    kind: 'invoice', label: 'Invoice', docNo: i.invoiceNo,
    meta: `${nameOrDash(i.party?.name)} · ${inr(i.billAmount)}`,
    status: i.status, at: iso(i.createdAt), href: `/accounts/invoice/${i.id}`,
  }))
  const paymentFeed: TrackerFeedEntry[] = payments.map((p) => ({
    kind: 'payment', label: p.direction === 'in' ? 'Receipt' : 'Payment', docNo: p.voucherNo,
    meta: `${nameOrDash(p.party?.name)} · ${inr(p.amount)} · ${p.mode}`,
    at: iso(p.createdAt), href: `/accounts/payments/${p.id}`,
  }))
  const journalFeed: TrackerFeedEntry[] = journals.map((j) => ({
    kind: 'journal', label: 'Journal', docNo: j.voucherNo,
    meta: `${j.voucherType} · ${j.debitAccount} → ${j.creditAccount} · ${inr(j.amount)}`,
    at: iso(j.createdAt), href: `/accounts/journal/${j.id}`,
  }))
  const cutFeed: TrackerFeedEntry[] = cuts.map((c) => ({
    kind: 'cut', label: 'Cut Order', docNo: c.cutNo,
    meta: `${nameOrDash(c.order?.orderNo)} · ${c.totalPcs} pcs`,
    status: c.status, at: iso(c.createdAt), href: `/cutting/job-order/${c.id}`,
  }))
  const productionFeed: TrackerFeedEntry[] = production.map((e) => ({
    kind: 'production', label: 'Production', docNo: e.bundleNo || `ENTRY`,
    meta: `${nameOrDash(e.order?.orderNo)} · ${e.qty} pcs${e.department ? ` · ${e.department.code}` : ''}${e.rework ? ' · rework' : ''}`,
    at: iso(e.createdAt), href: `/production/entry/${e.id}`,
  }))
  const despatchFeed: TrackerFeedEntry[] = despatches.map((d) => ({
    kind: 'despatch', label: 'Despatch', docNo: d.dcNo,
    meta: `${d.totalPcs} pcs${d.vehicleNo ? ` · ${d.vehicleNo}` : ''}`,
    status: d.status, at: iso(d.createdAt), href: `/pieces/despatch/${d.id}`,
  }))
  const jobworkFeed: TrackerFeedEntry[] = jobworks.map((j) => ({
    kind: 'jobwork', label: 'Jobwork', docNo: j.dcNo,
    meta: `${nameOrDash(j.jobworker?.name)} · ${j.processType} · ${j.totalQty.toLocaleString('en-IN')} qty`,
    status: j.status, at: iso(j.createdAt), href: `/jobwork/order/${j.id}`,
  }))
  const gateFeed: TrackerFeedEntry[] = gates.map((g) => ({
    kind: 'gate', label: g.gateType === 'in' ? 'Gate Entry' : 'Gate Pass', docNo: g.entryNo,
    meta: `${nameOrDash(g.vehicleNo)}${g.purpose ? ` · ${g.purpose}` : ''}`,
    status: g.status, at: iso(g.createdAt),
    href: g.gateType === 'in' ? `/dispatch/gate-entry/${g.id}` : `/dispatch/gate-pass/${g.id}`,
  }))
  const sampleFeed: TrackerFeedEntry[] = samples.map((s) => ({
    kind: 'sample', label: 'Sample', docNo: s.sampleNo,
    meta: `${s.sampleType} · ${s.qty} pcs`,
    status: s.status, at: iso(s.createdAt), href: `/orders/samples/${s.id}`,
  }))
  const labtestFeed: TrackerFeedEntry[] = labtests.map((l) => ({
    kind: 'labtest', label: 'Lab Test', docNo: l.testNo,
    meta: `${l.testType} · ${l.result}`,
    status: l.result, at: iso(l.createdAt), href: `/quality/lab-tests/${l.id}`,
  }))
  const expenseFeed: TrackerFeedEntry[] = expenses.map((e) => ({
    kind: 'expense', label: 'Expense', docNo: e.expNo,
    meta: `${e.category} · ${inr(e.amount)}`,
    status: e.status, at: iso(e.createdAt), href: `/costing/expenses/${e.id}`,
  }))
  const approvalFeed: TrackerFeedEntry[] = approvals.map((a) => ({
    kind: 'approval', label: 'Approval', docNo: findApprovalKind(a.entity)?.label ?? a.entity,
    meta: `${a.status} · by ${a.approvedBy ?? a.requestedBy}`,
    status: a.status, at: iso(a.createdAt), href: '/approvals',
  }))
  const agentFeed: TrackerFeedEntry[] = agentTurns.map((t) => ({
    kind: 'agent', label: 'Agent', docNo: `${countToolCalls(t.toolCalls)} tools`,
    meta: t.prompt.slice(0, 70) + (t.prompt.length > 70 ? '…' : ''),
    status: t.approved ? 'approved' : undefined,
    at: iso(t.createdAt), href: null,
  }))

  const feed: TrackerFeedEntry[] = [
    ...orderFeed, ...poFeed, ...grnFeed, ...invoiceFeed, ...paymentFeed,
    ...journalFeed, ...cutFeed, ...productionFeed, ...despatchFeed, ...jobworkFeed,
    ...gateFeed, ...sampleFeed, ...labtestFeed, ...expenseFeed, ...approvalFeed,
    ...agentFeed,
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, feedLimit)

  // ── Round 2: today KPIs (THE ONE RULE: createdAt >= start of day) + the
  //    board's per-family today counts + all-time totals ──
  const todayWhere = { createdAt: { gte: today } }
  const [
    ordersToday, posToday, grnsToday, invoicesToday, paymentsToday, cutsToday,
    jobworkToday, despatchesToday, despatchPcsAgg, prodToday, prodPcsAgg,
    stockMovesToday, gateToday, agentTurnsToday, pendingApprovals, approvalsToday,
    journalsToday, samplesToday, labtestsToday, expensesToday, approvalsCreatedToday,
    orderTotal, poTotal, grnTotal, invoiceTotal, paymentTotal, journalTotal, cutTotal,
    productionTotal, despatchTotal, jobworkTotal, gateTotal, sampleTotal, labtestTotal,
    expenseTotal, approvalTotal, agentTurnTotal,
  ] = await Promise.all([
    db.order.count({ where: todayWhere }),
    db.purchaseOrder.count({ where: todayWhere }),
    db.gRN.count({ where: todayWhere }),
    db.salesInvoice.count({ where: todayWhere }),
    db.payment.count({ where: todayWhere }),
    db.cutOrder.count({ where: todayWhere }),
    db.jobworkOrder.count({ where: todayWhere }),
    db.pcsDespatch.count({ where: todayWhere }),
    db.pcsDespatch.aggregate({ where: todayWhere, _sum: { totalPcs: true } }),
    db.productionEntry.count({ where: todayWhere }),
    db.productionEntry.aggregate({ where: todayWhere, _sum: { qty: true } }),
    db.stockLedger.count({ where: todayWhere }),
    db.gateEntry.count({ where: todayWhere }),
    db.agentTurn.count({ where: todayWhere }),
    db.approval.count({ where: { status: 'pending' } }),
    db.approval.count({ where: { status: { not: 'pending' }, approvedAt: { gte: today } } }),
    // board-only today counts (SPEC-M9 §4-B): approvals CREATED today — a
    // different signal from approvalsToday (DECISIONS today); both honest.
    db.journal.count({ where: todayWhere }),
    db.sample.count({ where: todayWhere }),
    db.labTest.count({ where: todayWhere }),
    db.expense.count({ where: todayWhere }),
    db.approval.count({ where: todayWhere }),
    // board all-time totals (16 feed families; stock total arrives in Round 4)
    db.order.count(),
    db.purchaseOrder.count(),
    db.gRN.count(),
    db.salesInvoice.count(),
    db.payment.count(),
    db.journal.count(),
    db.cutOrder.count(),
    db.productionEntry.count(),
    db.pcsDespatch.count(),
    db.jobworkOrder.count(),
    db.gateEntry.count(),
    db.sample.count(),
    db.labTest.count(),
    db.expense.count(),
    db.approval.count(),
    db.agentTurn.count(),
  ])

  // ── Round 2b: the parity-style board rows (SPEC-M9 §4-B) ──
  const stockInOut = (s: NonNullable<typeof latestStock>): string => {
    if (s.inPcs) return `+${s.inPcs} pcs`
    if (s.outPcs) return `-${s.outPcs} pcs`
    if (s.inKgs) return `+${s.inKgs} kg`
    if (s.outKgs) return `-${s.outKgs} kg`
    if (s.inMtrs) return `+${s.inMtrs} m`
    if (s.outMtrs) return `-${s.outMtrs} m`
    if (s.inBags) return `+${s.inBags} bags`
    if (s.outBags) return `-${s.outBags} bags`
    return ''
  }
  const rowsByKind: Record<string, TrackerFamilyRow> = {
    order: familyRow('order', 'Orders', '/orders', orderTotal, ordersToday, orderFeed),
    po: familyRow('po', 'Purchase Orders', '/procurement/po', poTotal, posToday, poFeed),
    grn: familyRow('grn', 'GRNs', '/procurement/grn', grnTotal, grnsToday, grnFeed),
    invoice: familyRow('invoice', 'Invoices', '/accounts/invoice', invoiceTotal, invoicesToday, invoiceFeed),
    payment: familyRow('payment', 'Payments & Receipts', '/accounts/payments', paymentTotal, paymentsToday, paymentFeed),
    journal: familyRow('journal', 'Journals', '/accounts/journal', journalTotal, journalsToday, journalFeed),
    cut: familyRow('cut', 'Cut Orders', '/cutting/job-order', cutTotal, cutsToday, cutFeed),
    production: familyRow('production', 'Production Entries', '/production/entry', productionTotal, prodToday, productionFeed),
    despatch: familyRow('despatch', 'Despatches', '/pieces/despatch', despatchTotal, despatchesToday, despatchFeed),
    jobwork: familyRow('jobwork', 'Jobwork Orders', '/jobwork/order', jobworkTotal, jobworkToday, jobworkFeed),
    gate: familyRow('gate', 'Gate Entries & Passes', '/dispatch/gate-entry', gateTotal, gateToday, gateFeed),
    sample: familyRow('sample', 'Samples', '/orders/samples', sampleTotal, samplesToday, sampleFeed),
    labtest: familyRow('labtest', 'Lab Tests', '/quality/lab-tests', labtestTotal, labtestsToday, labtestFeed),
    expense: familyRow('expense', 'Expenses', '/costing/expenses', expenseTotal, expensesToday, expenseFeed),
    approval: familyRow('approval', 'Approvals', '/approvals', approvalTotal, approvalsCreatedToday, approvalFeed),
    agent: familyRow('agent', 'Agent Turns', null, agentTurnTotal, agentTurnsToday, agentFeed),
    stock: {
      // board-only family (no feed entries): latest StockLedger row synthesized
      kind: 'stock', label: 'Stock Ledger', listHref: '/inventory/ledger',
      total: 0 /* filled from Round 4's stockLedgerRows */, today: stockMovesToday,
      latestDocNo: latestStock?.docNo || latestStock?.txnType || null,
      latestAt: latestStock ? iso(latestStock.createdAt) : null,
      latestHref: latestStock ? '/inventory/ledger' : null,
      latestMeta: latestStock
        ? `${latestStock.txnType} · ${latestStock.itemType}` +
          (stockInOut(latestStock) ? ` · ${stockInOut(latestStock)}` : '')
        : null,
    },
  }

  // ── Round 3: approvals panel ──
  const [pendingGroups, oldestPending, recentDecisions] = await Promise.all([
    db.approval.groupBy({ by: ['entity'], where: { status: 'pending' }, _count: { _all: true } }),
    db.approval.findFirst({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' } }),
    db.approval.findMany({
      where: { status: { not: 'pending' } },
      orderBy: { approvedAt: 'desc' },
      take: 5,
    }),
  ])
  const pendingByKind = pendingGroups
    .map((g) => ({
      kind: g.entity,
      label: findApprovalKind(g.entity)?.label ?? g.entity,
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count)
  const oldestPendingMin = oldestPending
    ? Math.max(0, Math.round((Date.now() - oldestPending.createdAt.getTime()) / 60000))
    : null

  // ── Round 4: agent panel + system (users fetched once: counts + id→name) ──
  const [agentRecent, approvedToday, users, parties, stockLedgerRows, flagRows] = await Promise.all([
    db.agentTurn.findMany({ take: 6, orderBy: { createdAt: 'desc' } }),
    db.agentTurn.count({ where: { approved: true, createdAt: { gte: today } } }),
    db.user.findMany({ select: { id: true, name: true, active: true } }),
    db.party.count(),
    db.stockLedger.count(),
    db.appOption.findMany({ where: { key: { startsWith: 'flag:' } }, select: { value: true } }),
  ])
  const userNameById = new Map(users.map((u) => [u.id, u.name]))
  const flagsOn = flagRows.filter((r) => r.value === 'true').length

  // stock total lands here (Round 4 already counts it for the system panel)
  rowsByKind.stock.total = stockLedgerRows
  const moduleGroups: TrackerModuleGroup[] = MODULE_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    families: g.kinds.map((k) => rowsByKind[k]),
  }))
  const moduleRows = moduleGroups.flatMap((g) => g.families)

  const generatedAt = new Date()
  return {
    generatedAt: iso(generatedAt),
    kpis: {
      docsToday:
        ordersToday + posToday + grnsToday + invoicesToday + paymentsToday + cutsToday +
        jobworkToday + despatchesToday + prodToday + gateToday,
      prodPcsToday: prodPcsAgg._sum.qty ?? 0,
      despatchPcsToday: despatchPcsAgg._sum.totalPcs ?? 0,
      stockMovesToday,
      gateToday,
      agentTurnsToday,
      approvalsToday,
      pendingApprovals,
      ordersToday, posToday, grnsToday, invoicesToday, paymentsToday, cutsToday, jobworkToday,
    },
    feed,
    modules: {
      activeToday: moduleRows.filter((r) => r.today > 0).length,
      familiesTotal: moduleRows.length,
      groups: moduleGroups,
    },
    approvals: {
      pendingByKind,
      oldestPendingMin,
      recent: recentDecisions.map((a) => ({
        kind: findApprovalKind(a.entity)?.label ?? a.entity,
        status: a.status,
        actor: a.approvedBy ?? a.requestedBy,
        at: iso(a.approvedAt ?? a.createdAt),
      })),
    },
    agent: {
      turns: agentRecent.map((t) => ({
        prompt: t.prompt.slice(0, 90) + (t.prompt.length > 90 ? '…' : ''),
        toolCalls: countToolCalls(t.toolCalls),
        approved: t.approved,
        user: userNameById.get(t.userId) ?? t.userId,
        at: iso(t.createdAt),
      })),
      approvedToday,
    },
    system: {
      serverTime: iso(generatedAt),
      usersTotal: users.length,
      usersActive: users.filter((u) => u.active).length,
      parties,
      stockLedgerRows,
      flagsTotal: FLAG_DEFS.length,
      flagsOn,
    },
  }
}

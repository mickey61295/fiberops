/**
 * W6 reconciliation queries — SPEC-M4 §9 (pure read fns; the card component
 * renders them). Four counterpart pairs, math test-asserted:
 *   PO ↔ GRNs · Invoice ↔ Payments · Jobwork out ↔ in · Despatch ↔ Invoice.
 * Plain-FK columns (Payment.invoiceId, PcsDespatch.orderId) resolve via
 * where-lookups, never include{} on a non-relation (PITFALLS #21).
 * GRN received uses the header totalQty (the posting contract maintains
 * totalQty = Σ line qty — same read the party-balance register uses).
 */
import { db } from '@/lib/db'

export interface ReconCounterRow {
  label: string
  value: string
  href?: string | null
}

export interface ReconResult {
  title: string
  /** e.g. "ordered 150 · received 60 · balance 90" */
  mathLine: string
  balance: number
  balanceLabel: string
  /** negative balance = counterpart ahead (over-received / over-collected) */
  rows: ReconCounterRow[]
  rowsTitle: string
}

const qty = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

/** PO ↔ GRNs — ordered = Σ POLine.qty · received = Σ GRN.totalQty (poId) · balance. */
export async function poRecon(poId: string): Promise<ReconResult | null> {
  const po = await db.purchaseOrder.findUnique({
    where: { id: poId },
    include: { lines: true, grns: true },
  })
  if (!po) return null
  const ordered = po.lines.reduce((s, l) => s + l.qty, 0)
  const received = po.grns.reduce((s, g) => s + g.totalQty, 0)
  const balance = ordered - received
  return {
    title: 'PO ↔ GRNs',
    mathLine: `ordered ${qty(ordered)} · received ${qty(received)} · balance ${qty(balance)}`,
    balance,
    balanceLabel: 'Pending to receive',
    rowsTitle: 'GRNs against this PO',
    rows: po.grns.map((g) => ({
      label: `${g.grnNo} · ${new Date(g.grnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}`,
      value: `${qty(g.totalQty)} · ${inr(g.totalValue)}`,
      href: `/procurement/grn/${g.id}`,
    })),
  }
}

/** Invoice ↔ Payments — billed = billAmount · collected = Σ Payment.amount where invoiceId (PLAIN FK) · balance.
 *  HFX-04 (Phase-6B Batch 0): only direction:'in' payments settle a sales
 *  invoice — an out-payment tagged with an invoiceNo (refund/adjustment) must
 *  not REDUCE AR. The rows below still list every tagged payment (with its
 *  direction) for transparency. */
export async function invoiceRecon(invoiceId: string): Promise<ReconResult | null> {
  const inv = await db.salesInvoice.findUnique({ where: { id: invoiceId } })
  if (!inv) return null
  const payments = await db.payment.findMany({ where: { invoiceId }, orderBy: { payDate: 'desc' } })
  const collected = payments.filter((p) => p.direction === 'in').reduce((s, p) => s + p.amount, 0)
  const balance = inv.billAmount - collected
  return {
    title: 'Invoice ↔ Payments',
    mathLine: `billed ${inr(inv.billAmount)} · collected ${inr(collected)} · balance ${inr(balance)}`,
    balance,
    balanceLabel: 'Outstanding',
    rowsTitle: 'Payments settling this invoice',
    rows: payments.map((p) => ({
      label: `${p.voucherNo} · ${new Date(p.payDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} · ${p.direction}`,
      value: inr(p.amount),
      href: `/accounts/payments/${p.id}`,
    })),
  }
}

/** Jobwork out ↔ in — sent = totalQty · status · at-party = Σ sent-status DCs for the jobworker; rows: their other DCs. */
export async function jobworkRecon(dcId: string): Promise<ReconResult | null> {
  const jw = await db.jobworkOrder.findUnique({ where: { id: dcId } })
  if (!jw) return null
  const siblings = await db.jobworkOrder.findMany({
    where: { jobworkerId: jw.jobworkerId },
    orderBy: { outDate: 'desc' },
    take: 50,
  })
  // M39 (JWL-03) — cumulative math: receivedQty accumulates (never the old
  // status-eyeball 'returned = sent unless sent'); at-party counts the still-
  // open rows (sent + partial) by their open balances.
  const open = (x: typeof jw) => x.status === 'sent' || x.status === 'partial'
    ? x.totalQty - x.receivedQty - x.rejectedQty
    : 0
  const atParty = siblings.reduce((s, x) => s + open(x), 0)
  const received = jw.receivedQty
  const rejected = jw.rejectedQty
  const returned = jw.returnedQty
  const balance = jw.totalQty - received - rejected - returned
  return {
    title: 'Jobwork out ↔ in',
    mathLine: `sent ${qty(jw.totalQty)} · received ${qty(received)}${rejected > 0 ? ` · rejected ${qty(rejected)}` : ''}${returned > 0 ? ` · returned ${qty(returned)}` : ''} · status ${jw.status} · at party (all DCs) ${qty(atParty)}`,
    balance,
    balanceLabel: open(jw) > 0 ? 'At party (this DC)' : jw.status === 'billed' ? 'Billed' : jw.status === 'accepted' ? 'Accepted (in G2)' : 'Closed',
    rowsTitle: "This jobworker's DCs",
    rows: siblings.map((s) => ({
      label: `${s.dcNo} · ${new Date(s.outDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}`,
      value: `${qty(s.totalQty)} sent · ${qty(s.receivedQty)} rec · ${s.status}`,
      href: `/jobwork/order/${s.id}`,
    })),
  }
}

/** Despatch ↔ Invoice (order scope) — despatched = Σ PcsDespatch.totalPcs (orderId plain FK) · invoiced = Σ SalesInvoice.totalQty · balance; rows: the despatches. */
export async function despatchRecon(orderId: string): Promise<ReconResult | null> {
  const [despatches, invoices] = await Promise.all([
    db.pcsDespatch.findMany({ where: { orderId }, orderBy: { despatchDate: 'desc' } }),
    db.salesInvoice.findMany({ where: { orderId }, select: { totalQty: true } }),
  ])
  const despatched = despatches.reduce((s, d) => s + d.totalPcs, 0)
  const invoiced = invoices.reduce((s, i) => s + i.totalQty, 0)
  const balance = despatched - invoiced
  return {
    title: 'Despatch ↔ Invoice',
    mathLine: `despatched ${qty(despatched)} pcs · invoiced ${qty(invoiced)} · balance ${qty(balance)} pcs`,
    balance,
    balanceLabel: 'Despatched not yet invoiced',
    rowsTitle: 'Despatches for this order',
    rows: despatches.map((d) => ({
      label: `${d.dcNo} · ${new Date(d.despatchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}`,
      value: `${qty(d.totalPcs)} pcs · ${d.status}`,
      href: `/pieces/despatch/${d.id}`,
    })),
  }
}

// ───────── SPEC-M42 INV-06 — ledger ↔ CurrentStock drift (fleet-level) ─────────

/** One drift vector: the append-only truth vs the cache for one bucket. */
export interface StockDriftRow {
  itemType: string
  itemId: string
  itemCode: string
  godown: string
  uom: 'kgs' | 'mtrs' | 'pcs' | 'bags'
  ledgerQty: number
  cacheQty: number
  delta: number
}

/** INV-06 — compare the append-only StockLedger truth against the
 *  CurrentStock cache, BOTH sides of every bucket (a bucket missing from the
 *  cache lists as cache 0; one missing from the ledger lists as ledger 0 —
 *  direct bucket writes like the legacy inline adjust_stock tool are exactly
 *  the kind of split this catches). groupBy on the ledger (the null-dim
 *  normalization identical to bumpStock's bucket key) + a full cache read;
 *  deltas below 1e-9 on every uom are clean. Pure function — the MIS card
 *  and the digest's stockDrift section both consume it. */
export async function compareStockDrift(): Promise<StockDriftRow[]> {
  const EPS = 1e-9
  const [ledgerGroups, cache, godowns] = await Promise.all([
    db.stockLedger.groupBy({
      by: ['itemType', 'itemId', 'godownId'],
      _sum: {
        inBags: true, outBags: true, inKgs: true, outKgs: true,
        inMtrs: true, outMtrs: true, inPcs: true, outPcs: true,
      },
    }),
    db.currentStock.findMany(),
    db.godown.findMany({ select: { id: true, code: true } }),
  ])
  const godownById = new Map(godowns.map((g) => [g.id, g.code]))

  // item codes for the drift vectors (best-effort id-maps)
  const byType: Record<string, Set<string>> = {}
  const touch = (itemType: string, itemId: string) => (byType[itemType] ??= new Set()).add(itemId)
  for (const g of ledgerGroups) if (g.godownId) touch(g.itemType, g.itemId)
  for (const c of cache) touch(c.itemType, c.itemId)
  const codeMaps = await buildItemCodeMapsSafe(byType)

  const netOf = (s: { inBags?: number | null; outBags?: number | null; inKgs?: number | null; outKgs?: number | null; inMtrs?: number | null; outMtrs?: number | null; inPcs?: number | null; outPcs?: number | null }) => ({
    kgs: (s.inKgs ?? 0) - (s.outKgs ?? 0),
    mtrs: (s.inMtrs ?? 0) - (s.outMtrs ?? 0),
    pcs: (s.inPcs ?? 0) - (s.outPcs ?? 0),
    bags: (s.inBags ?? 0) - (s.outBags ?? 0),
  })

  // the cache keyed by the same bucket rule (all null dims)
  const cacheByKey = new Map<string, { kgs: number; mtrs: number; pcs: number; bags: number; itemType: string; itemId: string; godownId: string }>()
  for (const c of cache) {
    if (c.lotId || c.colourId || c.sizeId || c.deptId || c.orderId) continue // non-bucket rows (legacy inline tool) can't compare 1:1
    const key = `${c.itemType}|${c.itemId}|${c.godownId}`
    const ex = cacheByKey.get(key)
    if (ex) {
      ex.kgs += c.kgs; ex.mtrs += c.mtrs; ex.pcs += c.pcs; ex.bags += c.bags
    } else {
      cacheByKey.set(key, { kgs: c.kgs, mtrs: c.mtrs, pcs: c.pcs, bags: c.bags, itemType: c.itemType, itemId: c.itemId, godownId: c.godownId })
    }
  }

  const drift: StockDriftRow[] = []
  const seen = new Set<string>()
  for (const g of ledgerGroups) {
    if (!g.godownId) continue
    const key = `${g.itemType}|${g.itemId}|${g.godownId}`
    seen.add(key)
    const ledger = netOf(g._sum)
    const cacheSide = cacheByKey.get(key)
    for (const uom of ['kgs', 'mtrs', 'pcs', 'bags'] as const) {
      const cacheQty = cacheSide?.[uom] ?? 0
      const delta = ledger[uom] - cacheQty
      if (Math.abs(delta) > EPS) {
        drift.push({
          itemType: g.itemType, itemId: g.itemId,
          itemCode: codeMaps[g.itemType]?.get(g.itemId) ?? g.itemId,
          godown: godownById.get(g.godownId) ?? g.godownId,
          uom, ledgerQty: ledger[uom], cacheQty, delta,
        })
      }
    }
  }
  // buckets the ledger never wrote (cache-only rows — the direct-write split)
  for (const [key, c] of cacheByKey) {
    if (seen.has(key)) continue
    for (const uom of ['kgs', 'mtrs', 'pcs', 'bags'] as const) {
      if (Math.abs(c[uom]) > EPS) {
        drift.push({
          itemType: c.itemType, itemId: c.itemId,
          itemCode: codeMaps[c.itemType]?.get(c.itemId) ?? c.itemId,
          godown: godownById.get(c.godownId) ?? c.godownId,
          uom, ledgerQty: 0, cacheQty: c[uom], delta: -c[uom],
        })
      }
    }
  }
  return drift
}

/** best-effort id-maps without the register dependency cycle (resolve.ts
 *  imports from this module's family — a local lightweight twin is safer).
 *  Per-model select (the real bug this caught): only the STYLE master carries
 *  styleNo — selecting it on yarn/fabric/accessory throws a Prisma validation
 *  error the catch swallows into an EMPTY map, so every drift vector's
 *  itemCode fell back to the raw cuid. Only pcs asks for styleNo. */
const RECON_ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory', pcs: 'style' }
async function buildItemCodeMapsSafe(byType: Record<string, Set<string>>): Promise<Record<string, Map<string, string>>> {
  const out: Record<string, Map<string, string>> = {}
  for (const [t, ids] of Object.entries(byType)) {
    const modelName = RECON_ITEM_MODELS[t]
    const model: any = modelName ? (db as any)[modelName] : null
    if (!model) { out[t] = new Map(); continue }
    const select: any = t === 'pcs' ? { id: true, styleNo: true } : { id: true, code: true }
    const rows: any[] = await model.findMany({ where: { id: { in: [...ids] } }, select }).catch(() => [])
    out[t] = new Map(rows.map((r) => [r.id, (r.code ?? r.styleNo) ?? r.id]))
  }
  return out
}

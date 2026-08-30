/**
 * /orders/[id] — Order Hub (SPEC-M3 §9.2, W3, item 'order-hub').
 * The order's WHOLE document family with qty/value rollups: one include-rich
 * order query + two supplementary queries (JobworkOrder/PcsDespatch carry
 * orderId but no reverse relation on Order — reconstructed-schema reality).
 * Resolves by db id OR orderNo. Replaces the legacy FrmOrdProdTrack mental
 * model. Unknown id → 404.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { db } from '@/lib/db'
import { CHAIN_ORDER_INCLUDE, computeChainState } from '@/lib/erp/chain'
import { CHAIN, type ChainStage } from '@/lib/erp/chain'
import { findItemByRoute, getHref, isLive } from '@/lib/erp/menu-registry'
import { ChainBar } from '@/components/erp/chain-bar'
import { BomCard, type BomDisplayLine } from '@/components/erp/bom-card'
import { AskAgentButton } from '@/components/erp/ask-agent-button'
import { DocPrintLink } from '@/components/erp/doc-print-button'
import { DocViewActions } from '@/components/erp/doc-view-actions'
import { ReconCard } from '@/components/erp/recon-card'
import { despatchRecon } from '@/lib/erp/registers/recon'
import { holidaysBeforeDelivery, workingDaysUntil } from '@/lib/erp/holidays' // SPEC-M28 warning + SPEC-M31 runway

export const dynamic = 'force-dynamic'

const HUB_INCLUDE = {
  ...CHAIN_ORDER_INCLUDE,
  rejections: true,
  poLines: { include: { po: { include: { party: true, grns: { include: { party: true, godown: true } } } } } },
}

const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '—')
const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const num = (n: number) => Number(n || 0).toLocaleString('en-IN')

/** Link to a chain stage's screen: live route (with context param — Wave C)
 *  or the coming page (no dead ends). */
function stageHref(stage: ChainStage, ctx: { orderNo?: string; poNo?: string; dcNo?: string } = {}): { href: string; label: string } {
  const item = findItemByRoute(stage.formUrl.split('#')[0])
  let href = item ? getHref(item) : '/orders'
  // Wave C: live targets carry the context query param (stage 3 ?order=SO-1001)
  const param = stage.formParam
  if (item && isLive(item) && param) {
    const value = param === 'po' ? ctx.poNo : param === 'dcNo' ? ctx.dcNo : ctx.orderNo
    if (value) href += (href.includes('?') ? '&' : '?') + `${param}=${encodeURIComponent(value)}`
  }
  return { href, label: item ? item.label : stage.name }
}

function FamilySection({
  title, stageStep, rollup, href, linkLabel, children, empty,
}: {
  title: string
  stageStep: number
  rollup?: string
  href?: string
  linkLabel?: string
  children?: React.ReactNode
  empty?: string
}) {
  const stage = CHAIN.find((s) => s.step === stageStep)
  return (
    <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          stage {stageStep}/15{stage ? ` · ${stage.tool}` : ''}
        </span>
        <div className="flex-1" />
        {rollup && <span className="text-xs text-slate-500 tabular-nums">{rollup}</span>}
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
            {linkLabel ?? 'Open'} <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children ?? (
        <div className="px-4 py-5 text-sm text-slate-400">{empty ?? 'Nothing yet.'}</div>
      )}
    </section>
  )
}

export default async function OrderHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // resolve by db id OR orderNo (SO-####) — the stageFormUrl fallback hands
  // orderNo here when only the number is known
  const order = (await db.order.findUnique({ where: { id }, include: HUB_INCLUDE }))
    ?? (await db.order.findUnique({ where: { orderNo: id }, include: HUB_INCLUDE }))
  if (!order) notFound()

  // supplementary families (no reverse relation on Order in the 54-model schema)
  const [jobworks, despatches] = await Promise.all([
    db.jobworkOrder.findMany({ where: { orderId: order.id }, include: { jobworker: true } }),
    db.pcsDespatch.findMany({ where: { orderId: order.id } }),
  ])
  // W6 despatch↔invoice recon card (SPEC-M4 §9, order scope)
  const despatchReconResult = despatches.length > 0 ? await despatchRecon(order.id) : null

  const state = computeChainState(order)
  const chainCtx = { id: order.id, orderNo: order.orderNo }

  // dedup POs across poLines (a PO may serve several order lines)
  const poMap = new Map<string, (typeof order.poLines)[number]['po']>()
  for (const pl of order.poLines) if (pl.po && !poMap.has(pl.po.id)) poMap.set(pl.po.id, pl.po)
  const pos = [...poMap.values()]
  const grns = pos.flatMap((po) => po.grns ?? [])

  // BOM display rows: resolve itemId → code/name, uomId → uom name
  const bomLines = order.style?.bomLines ?? []
  const [yarns, fabrics, accessories, uoms] = await Promise.all([
    db.yarn.findMany(), db.fabric.findMany(), db.accessory.findMany(), db.uOM.findMany(),
  ])
  const itemMaps: Record<string, Map<string, { code: string; name: string }>> = {
    yarn: new Map(yarns.map((y) => [y.id, { code: y.code, name: String((y as { count?: string }).count ?? '') }])),
    fabric: new Map(fabrics.map((f) => [f.id, { code: f.code, name: String((f as { construction?: string }).construction ?? '') }])),
    accessory: new Map(accessories.map((a) => [a.id, { code: a.code, name: a.name }])),
  }
  const uomMap = new Map(uoms.map((u) => [u.id, u.name]))
  const bomDisplay: BomDisplayLine[] = bomLines.map((l) => {
    const item = itemMaps[l.itemType]?.get(l.itemId)
    return {
      id: l.id, itemType: l.itemType,
      itemCode: item?.code ?? l.itemId, itemName: item?.name ?? '',
      qty: l.qty, uom: l.uomId ? (uomMap.get(l.uomId) ?? '') : '',
      rate: l.rate,
    }
  })

  const produced = (order.productionEntries ?? []).filter((e: { rework?: boolean }) => !e.rework)
    .reduce((s: number, e: { qty: number }) => s + e.qty, 0)
  const reworkQty = (order.productionEntries ?? []).filter((e: { rework?: boolean }) => e.rework)
    .reduce((s: number, e: { qty: number }) => s + e.qty, 0)
  const paidIn = (order.payments ?? []).filter((p: { direction: string }) => p.direction === 'in')
    .reduce((s: number, p: { amount: number }) => s + p.amount, 0)

  const poLink = stageHref(CHAIN[3])
  const programLink = stageHref(CHAIN[2], { orderNo: order.orderNo })
  const grnLink = stageHref(CHAIN[4])
  const jobworkLink = stageHref(CHAIN[5], { orderNo: order.orderNo })
  const cutLink = stageHref(CHAIN[7], { orderNo: order.orderNo })
  const issueLink = stageHref(CHAIN[8], { orderNo: order.orderNo })
  const productionLink = stageHref(CHAIN[9], { orderNo: order.orderNo })
  const rejectionLink = stageHref(CHAIN[10], { orderNo: order.orderNo })
  const despatchLink = stageHref(CHAIN[11], { orderNo: order.orderNo })
  const invoiceLink = stageHref(CHAIN[12], { orderNo: order.orderNo })
  const costLink = stageHref(CHAIN[13], { orderNo: order.orderNo })
  const paymentLink = stageHref(CHAIN[14], { orderNo: order.orderNo })

  // SPEC-M28 §7-H — the delivery-promise shutdown warning (only when a
  // holiday actually threatens the window; silent otherwise)
  const holidayRisks = ['open', 'in_progress'].includes(order.status)
    ? await holidaysBeforeDelivery(order.deliveryDate)
    : []

  // SPEC-M31 — the working-day runway: the honest count of workable days
  // before the promise (Sundays + GovtHolidays skipped). Only when the
  // promise is still future and the order is live.
  const runway = ['open', 'in_progress'].includes(order.status)
    ? await workingDaysUntil(order.deliveryDate)
    : null
  const totalRunwayDays = runway && order.deliveryDate
    ? Math.max(0, Math.round((new Date(new Date(order.deliveryDate).setHours(0, 0, 0, 0)).getTime() - new Date(new Date().setHours(0, 0, 0, 0)).getTime()) / 86_400_000)) + 1
    : 0

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/orders" className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700">
          <ChevronLeft className="h-4 w-4" /> Orders
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-base font-semibold font-mono">{order.orderNo}</h1>
        <span className="text-xs text-slate-400">Order Hub · get_order</span>
      </div>

      {/* SPEC-M28 — shutdown warning: a holiday inside the delivery window */}
      {holidayRisks.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900" data-testid="holiday-warning">
          <span className="font-semibold">Shutdown before delivery:</span>{' '}
          {holidayRisks.map((h, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {h.name} ({d(h.date)}{h.daysUntil === 0 ? ' — today' : `, ${h.daysUntil}d away`})
            </span>
          ))}
          {' '}— plan despatch &amp; production around it.
          {runway && (
            <span className="block mt-1 text-amber-800">
              Only {runway.workingDays} of {totalRunwayDays} days before delivery are working days.
            </span>
          )}
        </div>
      )}

      {/* Header card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Buyer</div>
            <Link href="/masters/buyer" className="text-sm font-medium text-emerald-700 hover:underline">{order.buyer?.name ?? '—'}</Link>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Style</div>
            <Link href="/masters/style" className="text-sm font-medium text-emerald-700 hover:underline">{order.style?.styleNo ?? '—'}</Link>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Delivery</div>
            <div className="text-sm">{d(order.deliveryDate)}</div>
            {/* SPEC-M31 — the working-day runway (future promises on live orders only) */}
            {runway && runway.workingDays > 0 && (
              <div className="text-[11px] text-slate-500" data-testid="working-days">
                {runway.workingDays} working days
                {runway.sundays + runway.holidays > 0 && (
                  <span className="text-slate-400">
                    {' '}({runway.sundays} Sun{runway.sundays === 1 ? '' : 's'}
                    {runway.holidays > 0 && `, ${runway.holidays} shutdown${runway.holidays === 1 ? '' : 's'}`})
                  </span>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Qty / Value</div>
            <div className="text-sm tabular-nums">{num(order.totalPcs)} pcs · {inr(order.totalValue)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Produced</div>
            <div className="text-sm tabular-nums">{num(produced)} / {num(order.totalPcs)} pcs</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Status</div>
            <div className="text-sm capitalize">{order.status}</div>
          </div>
          <div className="flex-1" />
          {/* SPEC-M18 §2-A1: the order sheet print door (gap audit: order printed NOTHING) */}
          <DocPrintLink docType="order" id={order.orderNo} />
          {/* SPEC-M18 §4-C1/C2 — Cancel + Duplicate (the Hub is the order's view) */}
          <DocViewActions
            slug="order"
            docNo={order.orderNo}
            status={order.status}
            seed={{
              docNo: order.orderNo,
              header: {
                buyerCode: order.buyer?.code ?? '',
                styleNo: order.style?.styleNo ?? '',
                orderDate: d(order.orderDate) === '—' ? '' : d(order.orderDate),
                deliveryDate: d(order.deliveryDate) === '—' ? '' : d(order.deliveryDate),
                finYear: order.finYear ?? '',
                notes: order.notes ?? '',
              },
              lines: (order.lines ?? []).map((l: { colour?: { name: string } | null; size?: { name: string } | null; qty: number; rate: number }) => ({
                colourName: l.colour?.name ?? '',
                sizeName: l.size?.name ?? '',
                qty: l.qty,
                rate: l.rate,
              })),
            }}
          />
          <AskAgentButton
            prompt={`Show me the pipeline status for order ${order.orderNo} — what's done, what's the next step, and what are the balances?`}
            label="Ask agent about this order"
          />
        </div>
        <ChainBar state={state} currentStage={1} ctx={chainCtx} />
      </div>

      {/* Order lines */}
      <FamilySection title="Order lines" stageStep={1} rollup={`${(order.lines ?? []).length} lines · ${num(order.totalPcs)} pcs`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-1.5 font-medium">Colour</th>
              <th className="text-left px-3 py-1.5 font-medium">Size</th>
              <th className="text-right px-3 py-1.5 font-medium">Qty</th>
              <th className="text-right px-3 py-1.5 font-medium">Rate</th>
              <th className="text-right px-3 py-1.5 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(order.lines ?? []).map((l: { id: string; colour?: { name: string } | null; size?: { name: string } | null; qty: number; rate: number }) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-1.5">{l.colour?.name ?? '—'}</td>
                <td className="px-3 py-1.5">{l.size?.name ?? '—'}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{num(l.qty)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{inr(l.rate)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{inr(l.qty * l.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FamilySection>

      {/* BOM card (chain stage 2) */}
      <BomCard styleNo={order.style?.styleNo ?? ''} lines={bomDisplay} />

      {/* Programs */}
      <FamilySection
        title="Programs" stageStep={3}
        rollup={`${(order.programs ?? []).length} programs · ${num((order.programs ?? []).reduce((s: number, p: { requiredKgs: number }) => s + p.requiredKgs, 0))} kgs req`}
        href={programLink.href} linkLabel="New program"
        empty="No programs yet — create the knitting/dyeing plan (stage 3)."
      >
        {(order.programs ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">Program</th>
                <th className="text-left px-3 py-1.5 font-medium">Stage</th>
                <th className="text-right px-3 py-1.5 font-medium">Req kgs</th>
                <th className="text-left px-3 py-1.5 font-medium">Target</th>
                <th className="text-left px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(order.programs ?? []).map((p: { id: string; programNo: string; stage: string; requiredKgs: number; targetDate?: Date | null; status: string }) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5 font-mono text-xs">
                    <Link href={`/programs/${p.id}`} className="text-emerald-700 hover:underline">{p.programNo}</Link>
                  </td>
                  <td className="px-3 py-1.5 capitalize">{p.stage}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(p.requiredKgs)}</td>
                  <td className="px-3 py-1.5">{d(p.targetDate)}</td>
                  <td className="px-3 py-1.5 capitalize">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>

      {/* Purchase orders */}
      <FamilySection
        title="Purchase orders" stageStep={4}
        rollup={`${pos.length} POs · ${inr(pos.reduce((s, p) => s + (p.totalValue || 0), 0))}`}
        href={poLink.href} linkLabel="New PO"
        empty="No material POs reference this order yet."
      >
        {pos.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">PO</th>
                <th className="text-left px-3 py-1.5 font-medium">Type</th>
                <th className="text-left px-3 py-1.5 font-medium">Party</th>
                <th className="text-right px-3 py-1.5 font-medium">Qty</th>
                <th className="text-right px-3 py-1.5 font-medium">Value</th>
                <th className="text-left px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5 font-mono text-xs">
                    <Link href={`/procurement/po/${p.id}`} className="text-emerald-700 hover:underline">{p.poNo}</Link>
                  </td>
                  <td className="px-3 py-1.5 capitalize">{p.poType}</td>
                  <td className="px-3 py-1.5">{p.party?.name ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(p.totalQty)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{inr(p.totalValue)}</td>
                  <td className="px-3 py-1.5 capitalize">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>

      {/* GRNs (via PO) */}
      <FamilySection
        title="GRNs" stageStep={5}
        rollup={`${grns.length} GRNs · ${num(grns.reduce((s, g) => s + (g.totalQty || 0), 0))} qty in`}
        href={grnLink.href} linkLabel="New GRN"
        empty="No material received against this order's POs yet."
      >
        {grns.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">GRN</th>
                <th className="text-left px-3 py-1.5 font-medium">Type</th>
                <th className="text-left px-3 py-1.5 font-medium">Party</th>
                <th className="text-left px-3 py-1.5 font-medium">Godown</th>
                <th className="text-right px-3 py-1.5 font-medium">Qty</th>
                <th className="text-right px-3 py-1.5 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {grns.map((g) => (
                <tr key={g.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5 font-mono text-xs">
                    <Link href={`/procurement/grn/${g.id}`} className="text-emerald-700 hover:underline">{g.grnNo}</Link>
                  </td>
                  <td className="px-3 py-1.5 capitalize">{g.grnType.replace('_', ' ')}</td>
                  <td className="px-3 py-1.5">{g.party?.name ?? '—'}</td>
                  <td className="px-3 py-1.5">{g.godown?.name ?? g.godown?.code ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(g.totalQty)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{inr(g.totalValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>

      {/* Jobwork */}
      <FamilySection
        title="Jobwork out / in" stageStep={6}
        rollup={`${jobworks.length} DCs · ${num(jobworks.reduce((s, j) => s + (j.totalQty || 0), 0))} qty`}
        href={jobworkLink.href} linkLabel="New jobwork DC"
        empty="No jobwork sent out for this order yet."
      >
        {jobworks.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">DC</th>
                <th className="text-left px-3 py-1.5 font-medium">Process</th>
                <th className="text-left px-3 py-1.5 font-medium">Jobworker</th>
                <th className="text-right px-3 py-1.5 font-medium">Qty</th>
                <th className="text-left px-3 py-1.5 font-medium">Out / In</th>
                <th className="text-left px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobworks.map((j) => (
                <tr key={j.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5 font-mono text-xs">
                    <Link href={`/jobwork/order/${j.id}`} className="text-emerald-700 hover:underline">{j.dcNo}</Link>
                    {j.status === 'sent' && (
                      <Link
                        href={`/jobwork/receipt?dcNo=${encodeURIComponent(j.dcNo)}`}
                        className="ml-2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        Receive
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-1.5 capitalize">{j.processType}</td>
                  <td className="px-3 py-1.5">{j.jobworker?.name ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(j.totalQty)}</td>
                  <td className="px-3 py-1.5 text-xs">{d(j.outDate)} → {j.receivedDate ? d(j.receivedDate) : 'pending'}</td>
                  <td className="px-3 py-1.5 capitalize">{j.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>

      {/* Cutting */}
      <FamilySection
        title="Cutting" stageStep={8}
        rollup={`${(order.cutOrders ?? []).length} cuts · ${num((order.cutOrders ?? []).reduce((s: number, c: { totalPcs: number }) => s + c.totalPcs, 0))} pcs`}
        href={cutLink.href} linkLabel="New cut order"
        empty="No cut orders yet (stage 8)."
      >
        {(order.cutOrders ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">Cut No</th>
                <th className="text-left px-3 py-1.5 font-medium">Date</th>
                <th className="text-right px-3 py-1.5 font-medium">Fabric (kgs)</th>
                <th className="text-right px-3 py-1.5 font-medium">Pcs</th>
                <th className="text-left px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(order.cutOrders ?? []).map((c: { id: string; cutNo: string; cutDate: Date; fabricIssued: number; totalPcs: number; status: string }) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5 font-mono text-xs">
                    <Link href={`/cutting/job-order/${c.id}`} className="text-emerald-700 hover:underline">{c.cutNo}</Link>
                  </td>
                  <td className="px-3 py-1.5">{d(c.cutDate)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(c.fabricIssued)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(c.totalPcs)}</td>
                  <td className="px-3 py-1.5 capitalize">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>

      {/* Line issues */}
      <FamilySection
        title="Issue to line" stageStep={9}
        rollup={`${(order.lineIssues ?? []).length} issues · ${num((order.lineIssues ?? []).reduce((s: number, i: { qty: number }) => s + i.qty, 0))} pcs`}
        href={issueLink.href} linkLabel="New issue"
        empty="No cut pieces issued to sewing lines yet."
      >
        {(order.lineIssues ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">Issue No</th>
                <th className="text-left px-3 py-1.5 font-medium">Date</th>
                <th className="text-right px-3 py-1.5 font-medium">Qty</th>
                <th className="text-left px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(order.lineIssues ?? []).map((i: { id: string; issueNo: string; issueDate: Date; qty: number; status: string }) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5 font-mono text-xs">
                    <Link href={`/production/issue/${i.id}`} className="text-emerald-700 hover:underline">{i.issueNo}</Link>
                  </td>
                  <td className="px-3 py-1.5">{d(i.issueDate)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(i.qty)}</td>
                  <td className="px-3 py-1.5 capitalize">{i.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>

      {/* Production */}
      <FamilySection
        title="Production" stageStep={10}
        rollup={`${num(produced)} pcs good${reworkQty > 0 ? ` · ${num(reworkQty)} rework` : ''}`}
        href={productionLink.href} linkLabel="New entry"
        empty="No production entries yet."
      >
        {(order.productionEntries ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">Date</th>
                <th className="text-left px-3 py-1.5 font-medium">Kind</th>
                <th className="text-right px-3 py-1.5 font-medium">Qty</th>
                <th className="text-left px-3 py-1.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(order.productionEntries ?? []).map((e: any) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5">
                    <Link href={`/production/entry/${e.id}`} className="text-emerald-700 hover:underline">{d(e.prodDate)}</Link>
                  </td>
                  <td className="px-3 py-1.5">{e.rework ? 'Rework' : 'Good output'}{e.bundleNo ? ` · ${e.bundleNo}` : ''}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(e.qty)}</td>
                  <td className="px-3 py-1.5 text-xs text-slate-400">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>

      {/* Rejections */}
      <FamilySection
        title="Rework / rejection" stageStep={11}
        rollup={`${(order.rejections ?? []).length} entries · ${num((order.rejections ?? []).reduce((s: number, r: { qty: number }) => s + r.qty, 0))} pcs`}
        href={rejectionLink.href} linkLabel="New rejection"
        empty="No rejections recorded."
      >
        {(order.rejections ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">Rej No</th>
                <th className="text-left px-3 py-1.5 font-medium">Date</th>
                <th className="text-right px-3 py-1.5 font-medium">Qty</th>
                <th className="text-left px-3 py-1.5 font-medium">Type</th>
                <th className="text-left px-3 py-1.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {(order.rejections ?? []).map((r: { id: string; rejNo: string; rejDate: Date; qty: number; rejType: string; action: string }) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5 font-mono text-xs">
                    <Link href={`/pieces/rejection/${r.id}`} className="text-emerald-700 hover:underline">{r.rejNo}</Link>
                  </td>
                  <td className="px-3 py-1.5">{d(r.rejDate)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(r.qty)}</td>
                  <td className="px-3 py-1.5 capitalize">{r.rejType.replace('_', ' ')}</td>
                  <td className="px-3 py-1.5 capitalize">{r.action.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>

      {/* Despatches */}
      <FamilySection
        title="Pcs despatch" stageStep={12}
        rollup={`${despatches.length} DCs · ${num(despatches.reduce((s, x) => s + (x.totalPcs || 0), 0))} pcs`}
        href={despatchLink.href} linkLabel="New despatch"
        empty="No finished-goods despatches yet."
      >
        {despatches.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">DC No</th>
                <th className="text-left px-3 py-1.5 font-medium">Date</th>
                <th className="text-right px-3 py-1.5 font-medium">Pcs</th>
                <th className="text-left px-3 py-1.5 font-medium">Vehicle</th>
                <th className="text-left px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {despatches.map((x) => (
                <tr key={x.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5 font-mono text-xs">
                    <Link href={`/pieces/despatch/${x.id}`} className="text-emerald-700 hover:underline">{x.dcNo}</Link>
                  </td>
                  <td className="px-3 py-1.5">{d(x.despatchDate)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(x.totalPcs)}</td>
                  <td className="px-3 py-1.5">{x.vehicleNo ?? '—'}</td>
                  <td className="px-3 py-1.5 capitalize">{x.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>

      {/* Despatch ↔ Invoice recon (W6 — SPEC-M4 §9) */}
      {despatchReconResult && <ReconCard recon={despatchReconResult} />}

      {/* Invoices */}
      <FamilySection
        title="Sales invoices" stageStep={13}
        rollup={`${(order.salesInvoices ?? []).length} invoices · ${inr((order.salesInvoices ?? []).reduce((s: number, i: { billAmount: number }) => s + i.billAmount, 0))}`}
        href={invoiceLink.href} linkLabel="New invoice"
        empty="No invoices issued yet."
      >
        {(order.salesInvoices ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">Invoice</th>
                <th className="text-left px-3 py-1.5 font-medium">Date</th>
                <th className="text-right px-3 py-1.5 font-medium">Bill amount</th>
                <th className="text-left px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(order.salesInvoices ?? []).map((i: { id: string; invoiceNo: string; invoiceDate: Date; billAmount: number; status: string }) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5 font-mono text-xs">
                    <Link href={`/accounts/invoice/${i.id}`} className="text-emerald-700 hover:underline">{i.invoiceNo}</Link>
                  </td>
                  <td className="px-3 py-1.5">{d(i.invoiceDate)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{inr(i.billAmount)}</td>
                  <td className="px-3 py-1.5 capitalize">{i.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>

      {/* Cost sheets */}
      <FamilySection
        title="Cost sheet" stageStep={14}
        rollup={`${(order.costSheet ?? []).length} version(s)`}
        href={costLink.href} linkLabel="New cost sheet"
        empty="No cost sheet yet."
      >
        {(order.costSheet ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">Version</th>
                <th className="text-left px-3 py-1.5 font-medium">Created</th>
                <th className="text-right px-3 py-1.5 font-medium">Total cost</th>
                <th className="text-right px-3 py-1.5 font-medium">Selling price</th>
              </tr>
            </thead>
            <tbody>
              {(order.costSheet ?? []).map((c: { id: string; version: number; createdAt: Date; totalCost: number; sellingPrice: number }) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5">
                    <Link href={`/costing/cost-sheet/${c.id}`} className="text-emerald-700 hover:underline">v{c.version}</Link>
                  </td>
                  <td className="px-3 py-1.5">{d(c.createdAt)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{inr(c.totalCost)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{inr(c.sellingPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>

      {/* Payments */}
      <FamilySection
        title="Payments" stageStep={15}
        rollup={`${(order.payments ?? []).length} vouchers · ${inr(paidIn)} received`}
        href={paymentLink.href} linkLabel="New payment"
        empty="No payments against this order yet."
      >
        {(order.payments ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium">Voucher</th>
                <th className="text-left px-3 py-1.5 font-medium">Date</th>
                <th className="text-left px-3 py-1.5 font-medium">Dir</th>
                <th className="text-right px-3 py-1.5 font-medium">Amount</th>
                <th className="text-left px-3 py-1.5 font-medium">Mode</th>
              </tr>
            </thead>
            <tbody>
              {(order.payments ?? []).map((p: { id: string; voucherNo: string; payDate: Date; direction: string; amount: number; mode: string }) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-1.5 font-mono text-xs">
                    <Link href={`/accounts/payments/${p.id}`} className="text-emerald-700 hover:underline">{p.voucherNo}</Link>
                  </td>
                  <td className="px-3 py-1.5">{d(p.payDate)}</td>
                  <td className="px-3 py-1.5 capitalize">{p.direction === 'in' ? 'Receipt' : 'Payment'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{inr(p.amount)}</td>
                  <td className="px-3 py-1.5 uppercase">{p.mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FamilySection>
    </div>
  )
}

/**
 * Order print fetcher — SPEC-M18 §2-A1: the SALES ORDER sheet (the document a
 * Tirupur merchandiser handles most — gap audit §3: it printed NOTHING before).
 * Resolves by db id OR orderNo; lines carry Style.hsn (the A2 invoice HSN
 * source too). FCY-aware: currency ≠ INR renders the currency symbol + an
 * fxRate note; amount-in-words stays rupees-only (INR docs).
 */
import { db } from '@/lib/db'
import type { PrintDoc } from './types'
import { amountInWords } from './amount-words'
import { d, getCompanyName } from './fetchers'

const CCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }
const ccy = (code: string) => CCY_SYMBOL[code] ?? `${code} `
const money = (n: number, code: string) => `${ccy(code)}${Number(n || 0).toLocaleString('en-IN')}`

export async function fetchOrderPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = {
    buyer: true,
    style: true,
    party: true,
    lines: { include: { style: true, colour: true, size: true } },
  }
  let order = await db.order.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!order) order = await db.order.findUnique({ where: { orderNo: idOrNo }, include })
  if (!order) return null

  // SPEC-M43 PRG-01 — the multi-shipment schedule on the print
  const deliveries = await db.orderDelivery.findMany({
    where: { orderId: order.id },
    orderBy: { seq: 'asc' },
  }).catch(() => [])

  const cur = order.currency || 'INR'
  const isInr = cur === 'INR'
  const lineTotal = (l: { qty: number; rate: number }) => (l.qty || 0) * (l.rate || 0)
  const grand = order.lines.reduce((s, l) => s + lineTotal(l), 0)
  const displayTotal = grand > 0 ? grand : order.totalValue

  const meta: [string, string][] = [
    ['Order Date', d(order.orderDate)],
    ['Delivery Date', d(order.deliveryDate)],
    ['Status', order.status.replace(/_/g, ' ')],
    ['Total Pcs', Number(order.totalPcs || 0).toLocaleString('en-IN')],
    ['Currency', cur],
  ]
  // PRG-01 — buyer PO reference + trade type first-class on the sheet
  if (order.buyerPoRef) meta.unshift(['Buyer PO', order.buyerPoRef])
  if (order.orderType && order.orderType !== 'export') meta.push(['Order Type', order.orderType])
  if (deliveries.length > 1) meta.push(['Shipments', String(deliveries.length)])
  if (!isInr && order.fxRate && order.fxRate !== 1) {
    meta.push(['FX Rate', `1 ${cur} = ${order.fxRate} INR`])
  }

  const partyBlock = order.buyer
    ? {
        label: 'Buyer',
        name: order.buyer.name,
        code: order.buyer.code,
        address: [order.buyer.dept, order.buyer.merchandiser ? `MtR: ${order.buyer.merchandiser}` : null]
          .filter(Boolean)
          .join(' · ') || undefined,
      }
    : order.party
      ? { label: 'Party', name: order.party.name, code: order.party.code }
      : undefined

  return {
    docType: 'order',
    title: 'SALES ORDER',
    docNo: order.orderNo,
    docDate: d(order.orderDate),
    party: partyBlock,
    meta,
    lines: {
      columns: [
        { label: 'S.No', align: 'right' },
        { label: 'Style' },
        { label: 'Colour' },
        { label: 'Size' },
        { label: 'HSN' },
        { label: 'Qty', align: 'right' },
        { label: 'Rate', align: 'right' },
        { label: 'Amount', align: 'right' },
      ],
      rows: order.lines.map((l, i) => [
        i + 1,
        l.style?.styleNo ?? l.styleId,
        l.colour?.name ?? '—',
        l.size?.name ?? '—',
        l.style?.hsn ?? '—',
        Number(l.qty || 0).toLocaleString('en-IN'),
        money(l.rate, cur),
        money(lineTotal(l), cur),
      ]),
      footer: [`Lines: ${order.lines.length} · Total Qty: ${Number(order.lines.reduce((s, l) => s + (l.qty || 0), 0)).toLocaleString('en-IN')} pcs`],
    },
    totals: [
      ['Sub Total', money(grand, cur)],
      ['Order Value', money(displayTotal, cur)],
    ],
    // FCY words would lie (amount-words speaks rupees only) — INR only.
    amountWords: isInr ? amountInWords(displayTotal) : undefined,
    signatures: [`For ${(await getCompanyName())}`, 'For Buyer'],
    notes: [
      order.notes || 'Delivery as per buyer purchase order terms.',
      'Quantity variation of ±5% is industry-standard and acceptable unless agreed otherwise.',
      ...(isInr ? [] : [`Values in ${cur}; INR equivalents at the booked rate where applicable.`]),
      // PRG-01 — the schedule block (multi-shipment orders print their splits)
      ...(deliveries.length > 1
        ? [`Delivery schedule: ${deliveries.map((r) => `${Number(r.qty || 0).toLocaleString('en-IN')} pcs @ ${d(r.date)}`).join('  ·  ')}`]
        : []),
    ],
  }
}

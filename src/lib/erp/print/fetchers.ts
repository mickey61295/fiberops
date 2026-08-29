/**
 * Doc-family print fetchers — SPEC-M8 §4: the 5 print-critical families.
 * Each resolves by db id OR doc no (the view-page pattern, verbatim) and
 * builds a normalized PrintDoc with all display strings pre-formatted
 * (ISO dates, en-IN money, ₹ prefix) so PrintSheet stays a dumb renderer.
 * The shared helpers (d/inr/qty/partyBlock/getCompanyName) are exported for
 * the Wave-B fetchers (fetchers-b.ts) — ONE formatting convention across
 * every family.
 */
import { db } from '@/lib/db'
import type { PrintDoc, PrintParty } from './types'
import { amountInWords } from './amount-words'

export const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '—')
export const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`
export const qty = (n: number) => Number(n || 0).toLocaleString('en-IN')

export function partyBlock(
  p: { code: string; name: string; address?: string | null; city?: string | null; state?: string | null; gstin?: string | null; phone?: string | null } | null | undefined,
  label: string,
): PrintParty | undefined {
  if (!p) return undefined
  return {
    label,
    name: p.name,
    code: p.code,
    address: p.address ?? undefined,
    city: p.city ?? undefined,
    state: p.state ?? undefined,
    gstin: p.gstin ?? undefined,
    phone: p.phone ?? undefined,
  }
}

/** Item-code resolution for yarn/fabric/accessory lines (the PO view-page pattern). */
async function itemMaps(): Promise<Record<string, Map<string, string>>> {
  const [yarns, fabrics, accessories] = await Promise.all([
    db.yarn.findMany({ select: { id: true, code: true } }),
    db.fabric.findMany({ select: { id: true, code: true } }),
    db.accessory.findMany({ select: { id: true, code: true } }),
  ])
  return {
    yarn: new Map(yarns.map((y) => [y.id, y.code])),
    fabric: new Map(fabrics.map((f) => [f.id, f.code])),
    accessory: new Map(accessories.map((a) => [a.id, a.code])),
  }
}

// ── invoice: TAX INVOICE with the service-computed GST split ──────────────
// SPEC-M18 §2-A2: when the invoice has an order with lines, the body prints
// per-order-line rows with the HSN column (style.hsn) + an HSN summary note
// (taxable proportioned by qty — marked "derived"); without an order the
// legacy summary row stays.
export async function fetchInvoicePrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = {
    party: true,
    order: { include: { lines: { include: { style: true, colour: true, size: true } } } },
  }
  let inv = await db.salesInvoice.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!inv) inv = await db.salesInvoice.findUnique({ where: { invoiceNo: idOrNo }, include })
  if (!inv) return null

  const igst = inv.igstRate > 0
  const gstRate = igst ? inv.igstRate : inv.cgstRate + inv.sgstRate
  const orderLines = inv.order?.lines ?? []
  const hasBody = orderLines.length > 0
  const orderQty = orderLines.reduce((s, l) => s + (l.qty || 0), 0)
  // HSN summary (derived): qty-proportioned taxable share per HSN bucket
  const hsnBuckets = new Map<string, { qty: number; taxable: number }>()
  for (const l of orderLines) {
    const hsn = l.style?.hsn || '—'
    const b = hsnBuckets.get(hsn) ?? { qty: 0, taxable: 0 }
    b.qty += l.qty || 0
    b.taxable += orderQty > 0 ? (inv.taxableValue * (l.qty || 0)) / orderQty : 0
    hsnBuckets.set(hsn, b)
  }
  const totals: [string, string][] = [
    ['Taxable Value', inr(inv.taxableValue)],
  ]
  if (igst) totals.push([`IGST ${inv.igstRate}%`, inr(inv.igstAmt)])
  else {
    totals.push([`CGST ${inv.cgstRate}%`, inr(inv.cgstAmt)])
    totals.push([`SGST ${inv.sgstRate}%`, inr(inv.sgstAmt)])
  }
  if (inv.otherCharges) totals.push(['Other Charges', inr(inv.otherCharges)])
  if (inv.roundOff) totals.push(['Round Off', inr(inv.roundOff)])
  totals.push(['Bill Amount', inr(inv.billAmount)])

  const notes: string[] = []
  if (inv.invoiceType === 'export') {
    notes.push('SUPPLY FOR EXPORT — Zero-rated supply under LUT (no IGST charged).')
    if (inv.ern) notes.push(`Export Report Number: ${inv.ern}`)
  }
  if (inv.status === 'cancelled') notes.push('*** CANCELLED ***')
  if (hasBody) {
    notes.push(
      `HSN summary (derived from order lines): ${[...hsnBuckets.entries()]
        .map(([h, b]) => `${h} — ${qty(b.qty)} pcs · ${inr(b.taxable)} @ ${gstRate}%`)
        .join(' | ')}`,
    )
  }
  notes.push('Goods once sold will not be taken back. Subject to Tirupur jurisdiction.')

  return {
    docType: 'invoice',
    title: 'TAX INVOICE',
    docNo: inv.invoiceNo,
    docDate: d(inv.invoiceDate),
    party: partyBlock(inv.party, 'Bill To'),
    meta: [
      ['Invoice Type', inv.invoiceType],
      ['Bill Type', inv.billType],
      ['Order', inv.order?.orderNo ?? '—'],
      ['Quantity', qty(inv.totalQty)],
      ...(inv.irn ? [['IRN', inv.irn] as [string, string]] : []),
    ],
    lines: hasBody
      ? {
          columns: [
            { label: 'S.No', align: 'right' },
            { label: 'Description' },
            { label: 'HSN' },
            { label: 'Qty', align: 'right' },
            { label: 'Rate', align: 'right' },
            { label: 'Amount', align: 'right' },
          ],
          rows: orderLines.map((l, i) => [
            i + 1,
            [l.style?.styleNo ?? l.styleId, l.colour?.name, l.size?.name].filter(Boolean).join(' / '),
            l.style?.hsn ?? '—',
            qty(l.qty),
            inr(l.rate),
            inr((l.qty || 0) * (l.rate || 0)),
          ]),
          footer: [`Total Qty: ${qty(orderQty)}`],
        }
      : {
          columns: [
            { label: 'Description' },
            { label: 'Qty', align: 'right' },
            { label: 'Taxable Value', align: 'right' },
            { label: 'GST', align: 'right' },
          ],
          rows: [
            [
              `${inv.billType.replace(/_/g, ' ')} invoice — order ${inv.order?.orderNo ?? '—'}${inv.party ? ` (${inv.party.name})` : ''}`,
              qty(inv.totalQty),
              inr(inv.taxableValue),
              igst ? `IGST ${inv.igstRate}% = ${inr(inv.igstAmt)}` : `CGST+SGST ${inv.cgstRate + inv.sgstRate}% = ${inr(inv.cgstAmt + inv.sgstAmt)}`,
            ],
          ],
          footer: [`Total Qty: ${qty(inv.totalQty)}`],
        },
    totals,
    amountWords: amountInWords(inv.billAmount),
    signatures: [`For ${(await getCompanyName())}`, 'Receiver'],
    notes,
  }
}

let cachedCompanyName: string | null = null
export async function getCompanyName(): Promise<string> {
  if (cachedCompanyName) return cachedCompanyName
  try {
    const row = await db.appOption.findUnique({ where: { key: 'print.companyName' } })
    cachedCompanyName = row?.value ?? 'FiberOps'
  } catch {
    cachedCompanyName = 'FiberOps'
  }
  return cachedCompanyName
}

// ── po: PURCHASE ORDER with resolved item-code lines ──────────────────────
export async function fetchPoPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { party: true, lines: true }
  let po = await db.purchaseOrder.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!po) po = await db.purchaseOrder.findUnique({ where: { poNo: idOrNo }, include })
  if (!po) return null

  const maps = await itemMaps()
  const lineTotal = (l: { qty: number; rate: number }) => (l.qty || 0) * (l.rate || 0)
  const grand = po.lines.reduce((s, l) => s + lineTotal(l), 0)

  return {
    docType: 'po',
    title: 'PURCHASE ORDER',
    docNo: po.poNo,
    docDate: d(po.orderDate),
    party: partyBlock(po.party, 'Supplier'),
    meta: [
      ['PO Type', po.poType],
      ['Delivery Date', d(po.deliveryDate)],
      ['Line Items', String(po.lines.length)],
    ],
    lines: {
      columns: [
        { label: 'S.No', align: 'right' },
        { label: 'Item' },
        { label: 'Type' },
        { label: 'Qty', align: 'right' },
        { label: 'Rate', align: 'right' },
        { label: 'Amount', align: 'right' },
      ],
      rows: po.lines.map((l, i) => [
        i + 1,
        maps[l.itemType]?.get(l.itemId) ?? l.itemId,
        l.itemType,
        qty(l.qty),
        inr(l.rate),
        inr(lineTotal(l)),
      ]),
      footer: [
        `Lines: ${po.lines.length} · Qty: ${qty(po.lines.reduce((s, l) => s + (l.qty || 0), 0))}`,
      ],
    },
    totals: [
      ['Sub Total', inr(grand)],
      ['Total (approx.)', inr(grand)],
    ],
    amountWords: amountInWords(grand),
    signatures: [`For ${(await getCompanyName())}`, 'Supplier'],
    notes: [
      po.notes || 'Prices inclusive of taxes unless stated separately.',
      'Delivery at our factory godown. Quality subject to inward inspection.',
    ],
  }
}

// ── grn: GOODS RECEIPT NOTE ────────────────────────────────────────────────
export async function fetchGrnPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { party: true, godown: true, po: true, lines: true }
  let grn = await db.gRN.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!grn) grn = await db.gRN.findUnique({ where: { grnNo: idOrNo }, include })
  if (!grn) return null

  const maps = await itemMaps()
  const uom = await db.uOM.findMany({ select: { id: true, code: true } })
  const uomMap = new Map(uom.map((u) => [u.id, u.code]))

  return {
    docType: 'grn',
    title: 'GOODS RECEIPT NOTE',
    docNo: grn.grnNo,
    docDate: d(grn.grnDate),
    party: partyBlock(grn.party, 'Received From'),
    meta: [
      ['GRN Type', grn.grnType.replace(/_/g, ' ')],
      ['Godown', grn.godown?.name ?? '—'],
      ['Against PO', grn.po?.poNo ?? '—'],
      ['Party DC Ref', grn.partyDcRef ?? '—'],
    ],
    lines: {
      columns: [
        { label: 'S.No', align: 'right' },
        { label: 'Item' },
        { label: 'Lot' },
        { label: 'Qty', align: 'right' },
        { label: 'Rate', align: 'right' },
        { label: 'Amount', align: 'right' },
      ],
      rows: grn.lines.map((l, i) => [
        i + 1,
        `${maps[l.itemType]?.get(l.itemId) ?? l.itemId} (${l.itemType})`,
        l.lotId ? l.lotId.slice(-8) : '—',
        `${qty(l.qty)}${l.uomId && uomMap.get(l.uomId) ? ' ' + uomMap.get(l.uomId) : ''}`,
        inr(l.rate),
        inr(l.amount),
      ]),
      footer: [`Total Qty: ${qty(grn.totalQty)}`],
    },
    totals: [
      ['Total Value', inr(grn.totalValue)],
    ],
    amountWords: amountInWords(grn.totalValue),
    signatures: [`For ${(await getCompanyName())}`, 'Goods Received By'],
    notes: ['Receipt subject to quality inspection. Shortage/damage claims within 7 days.'],
  }
}

// ── payment: PAYMENT / RECEIPT VOUCHER ─────────────────────────────────────
export async function fetchPaymentPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { party: true, order: true }
  let pay = await db.payment.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!pay) pay = await db.payment.findUnique({ where: { voucherNo: idOrNo }, include })
  if (!pay) return null

  // invoiceId is a relation-less FK column (PITFALLS #21) — separate lookup
  const invoice = pay.invoiceId ? await db.salesInvoice.findUnique({ where: { id: pay.invoiceId } }) : null

  const title = pay.direction === 'in' ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER'
  return {
    docType: 'payment',
    title,
    docNo: pay.voucherNo,
    docDate: d(pay.payDate),
    party: partyBlock(pay.party, pay.direction === 'in' ? 'Received From' : 'Paid To'),
    meta: [
      ['Mode', pay.mode.toUpperCase()],
      ['Reference', pay.reference ?? '—'],
      ['Against Invoice', invoice?.invoiceNo ?? '—'],
      ['Order', pay.order?.orderNo ?? '—'],
    ],
    lines: {
      columns: [
        { label: 'Particulars' },
        { label: 'Amount', align: 'right' },
      ],
      rows: [
        [
          `${pay.direction === 'in' ? 'Received from' : 'Paid to'} ${pay.party?.name ?? '—'}${invoice ? ` against invoice ${invoice.invoiceNo}` : ' (on account)'}${pay.notes ? ` — ${pay.notes}` : ''}`,
          inr(pay.amount),
        ],
      ],
    },
    totals: [
      [pay.direction === 'in' ? 'Amount Received' : 'Amount Paid', inr(pay.amount)],
    ],
    amountWords: amountInWords(pay.amount),
    signatures: [`For ${(await getCompanyName())}`, 'Authorised Signatory'],
    notes: [`Payment mode: ${pay.mode}${pay.reference ? ` · ref ${pay.reference}` : ''}.`],
  }
}

// ── dc: DELIVERY CHALLAN (jobwork) — the goods-accompanying print ─────────
// SPEC-M18 §2-A3: cost-bearing auto-template — totalValue > 0 prints the
// value columns + words + COST BEARING banner; 0 prints the plain challan
// (no values — the statutory non-cost-bearing form jobworkers expect).
export async function fetchDcPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { jobworker: true }
  let jw = await db.jobworkOrder.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!jw) jw = await db.jobworkOrder.findUnique({ where: { dcNo: idOrNo }, include })
  if (!jw) return null

  const parent = jw.orderId ? await db.order.findUnique({ where: { id: jw.orderId } }) : null
  const costBearing = (jw.totalValue || 0) > 0

  return {
    docType: 'dc',
    title: costBearing ? 'DELIVERY CHALLAN (JOBWORK — COST BEARING)' : 'DELIVERY CHALLAN (JOBWORK — NON-COST BEARING)',
    docNo: jw.dcNo,
    docDate: d(jw.outDate),
    party: partyBlock(jw.jobworker, 'Jobworker'),
    meta: [
      ['Process', jw.processType],
      ['Out Date', d(jw.outDate)],
      ['Expected In', d(jw.expectedInDate)],
      ['Parent Order', parent?.orderNo ?? '—'],
      ['Status', jw.status],
    ],
    lines: {
      columns: costBearing
        ? [
            { label: 'Description' },
            { label: 'Qty', align: 'right' },
            { label: 'Rate/Unit (approx.)', align: 'right' },
            { label: 'Value', align: 'right' },
          ]
        : [
            { label: 'Description' },
            { label: 'Qty', align: 'right' },
          ],
      rows: costBearing
        ? [
            [
              `${jw.processType} process — order ${parent?.orderNo ?? '—'}`,
              qty(jw.totalQty),
              jw.totalQty > 0 ? inr(jw.totalValue / jw.totalQty) : '—',
              inr(jw.totalValue),
            ],
          ]
        : [
            [`${jw.processType} process — order ${parent?.orderNo ?? '—'}`, qty(jw.totalQty)],
          ],
      footer: [`Total Qty: ${qty(jw.totalQty)}`],
    },
    totals: costBearing
      ? [
          ['Total Qty', qty(jw.totalQty)],
          ['Process Value', inr(jw.totalValue)],
        ]
      : [
          ['Total Qty', qty(jw.totalQty)],
        ],
    amountWords: costBearing ? amountInWords(jw.totalValue) : undefined,
    signatures: [`For ${(await getCompanyName())}`, 'Jobworker'],
    notes: costBearing
      ? [
          'COST BEARING challan — process value as per agreed jobwork rates.',
          'Goods sent for jobwork — to be returned after processing.',
          'Please return unused material along with the processed goods.',
        ]
      : [
          'NON-COST BEARING challan — no commercial value (jobwork process only).',
          'Goods sent for jobwork — to be returned after processing.',
          'Please return unused material along with the processed goods.',
        ],
  }
}

/**
 * Doc-family print fetchers — SPEC-M8 Wave B: the remaining 15 doc detail
 * families (§2). Same contract as Wave A: resolve by db id OR doc no —
 * id-only for budget / cost-sheet / production-entry (no unique doc-no
 * field on those models) — and build the normalized PrintDoc with every
 * display string pre-formatted via the shared Wave-A helpers. Titles follow
 * each family's legacy paper artifact.
 *
 * Free-FK columns (orderId/buyerId/deptId/… without relations — PITFALLS
 * #21) are resolved via explicit lookups, exactly like the view pages.
 */
import { db } from '@/lib/db'
import type { PrintDoc, PrintParty, PrintLabelCard } from './types'
import { amountInWords } from './amount-words'
import { d, inr, qty, partyBlock, getCompanyName } from './fetchers'
import { code128Svg } from './barcode'
import { istToday } from '@/lib/erp/dates'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const co = () => getCompanyName()
const clean = (s: string | null | undefined) => (s && s.trim() ? s : undefined)

/** decodeURIComponent that never throws (malformed % sequences pass through). */
function safeDecode(s: string): string | null {
  try {
    const d = decodeURIComponent(s)
    return d !== s ? d : null
  } catch {
    return null
  }
}

/** Free-FK party lookup (PITFALLS #21) → PrintParty | undefined. */
async function partyById(partyId: string | null | undefined, label: string): Promise<PrintParty | undefined> {
  if (!partyId) return undefined
  const p = await db.party.findUnique({ where: { id: partyId } }).catch(() => null)
  return partyBlock(p, label)
}

/** Free-FK order lookup → orderNo ('—' when absent). */
async function orderNoById(orderId: string | null | undefined): Promise<string> {
  if (!orderId) return '—'
  const o = await db.order.findUnique({ where: { id: orderId }, select: { orderNo: true } }).catch(() => null)
  return o?.orderNo ?? '—'
}

// ── debit-note: DEBIT NOTE (party ledger adjustment) ──────────────────────
export async function fetchDebitNotePrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { party: true }
  let note = await db.debitNote.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!note) note = await db.debitNote.findUnique({ where: { noteNo: idOrNo }, include })
  if (!note) return null

  return {
    docType: 'debit-note',
    title: 'DEBIT NOTE',
    docNo: note.noteNo,
    docDate: d(note.date),
    party: partyBlock(note.party, 'Party'),
    meta: [
      ['Note Type', note.noteType.replace(/_/g, ' ')],
      ['Fin Year', note.finYear],
      ['Status', cap(note.status)],
    ],
    lines: {
      columns: [{ label: 'Particulars' }, { label: 'Amount', align: 'right' }],
      rows: [[note.reason || `Debit note (${note.noteType}) raised on party account`, inr(note.amount)]],
    },
    totals: [['Debit Amount', inr(note.amount)]],
    amountWords: amountInWords(note.amount),
    signatures: [`For ${await co()}`, 'Party'],
    notes: [
      ...(note.status === 'cancelled' ? ['*** CANCELLED ***'] : []),
      'Debit note adjusts the party ledger — not a tax invoice.',
    ],
  }
}

// ── journal: RECEIPT / PAYMENT / CONTRA / JOURNAL VOUCHER ─────────────────
export async function fetchJournalPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { party: true }
  let j = await db.journal.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!j) j = await db.journal.findUnique({ where: { voucherNo: idOrNo }, include })
  if (!j) return null

  return {
    docType: 'journal',
    title: `${j.voucherType.replace(/_/g, ' ').toUpperCase()} VOUCHER`,
    docNo: j.voucherNo,
    docDate: d(j.date),
    party: partyBlock(j.party, 'Party'),
    meta: [
      ['Voucher Type', cap(j.voucherType)],
      ['Fin Year', j.finYear],
    ],
    lines: {
      columns: [
        { label: 'Account' },
        { label: 'Dr / Cr', align: 'center' },
        { label: 'Amount', align: 'right' },
      ],
      rows: [
        [j.debitAccount, 'Dr', inr(j.amount)],
        [j.creditAccount, 'Cr', inr(j.amount)],
      ],
      footer: [`Narration: ${j.narration ?? '—'}`],
    },
    totals: [['Voucher Amount', inr(j.amount)]],
    amountWords: amountInWords(j.amount),
    signatures: [`For ${await co()}`, 'Authorised Signatory'],
    notes: [clean(j.narration) ?? 'Accounting voucher — internal record.'],
  }
}

// ── budget: BUDGET (id-only — no unique doc no on Budget) ─────────────────
export async function fetchBudgetPrint(idOrNo: string): Promise<PrintDoc | null> {
  const budget = await db.budget.findUnique({ where: { id: idOrNo }, include: { BudgetLine: true } }).catch(() => null)
  if (!budget) return null

  const [orderNo, dept] = await Promise.all([
    orderNoById(budget.orderId),
    budget.deptId
      ? db.department.findUnique({ where: { id: budget.deptId }, select: { name: true } }).catch(() => null)
      : Promise.resolve(null),
  ])
  const actual = budget.BudgetLine.reduce((s, l) => s + (l.actualAmount ?? 0), 0)

  return {
    docType: 'budget',
    title: 'BUDGET',
    docNo: orderNo !== '—' ? `BGT-${orderNo}` : `BGT-${budget.id.slice(-6).toUpperCase()}`,
    docDate: d(budget.createdAt),
    meta: [
      ['Order', orderNo],
      ['Department', dept?.name ?? 'All Departments'],
      ['Fin Year', budget.finYear],
    ],
    lines: {
      columns: [
        { label: 'S.No', align: 'right' },
        { label: 'Component' },
        { label: 'Budgeted', align: 'right' },
        { label: 'Actual', align: 'right' },
      ],
      rows: budget.BudgetLine.map((l, i) => [i + 1, l.workId || 'budget line', inr(l.amount), inr(l.actualAmount ?? 0)]),
    },
    totals: [
      ['Total Budgeted', inr(budget.amount)],
      ['Total Actual', inr(actual)],
      ['Variance', inr(budget.amount - actual)],
    ],
    signatures: ['Prepared By', 'Approved By'],
    notes: ['Internal budget document — budget vs actual reconciles in the Budget vs Actual report.'],
  }
}

// ── cost-sheet: COST SHEET (id-only — version, not a doc no) ──────────────
export async function fetchCostSheetPrint(idOrNo: string): Promise<PrintDoc | null> {
  const cs = await db.costSheet.findUnique({ where: { id: idOrNo }, include: { order: true } }).catch(() => null)
  if (!cs) return null

  const comps: [string, number][] = [
    ['Fabric Cost', cs.fabricCost],
    ['Trim Cost', cs.trimCost],
    ['C.M. Cost', cs.cmCost],
    ['Washing Cost', cs.washingCost],
    ['Packing Cost', cs.packingCost],
    ['Overheads', cs.overheads],
  ]

  return {
    docType: 'cost-sheet',
    title: 'COST SHEET',
    docNo: `v${cs.version}`,
    docDate: d(cs.createdAt),
    meta: [
      ['Order', cs.order?.orderNo ?? '—'],
      ['Version', `v${cs.version}`],
      ['Commission %', `${cs.commissionPct}%`],
      ['Margin %', `${cs.marginPct}%`],
    ],
    lines: {
      columns: [{ label: 'Cost Component' }, { label: 'Amount', align: 'right' }],
      rows: comps.map(([label, amt]) => [label, inr(amt)]),
      footer: [`Selling price ${inr(cs.sellingPrice)} · margin ${inr(cs.sellingPrice - cs.totalCost)}`],
    },
    totals: [
      ['Total Cost', inr(cs.totalCost)],
      ['Selling Price', inr(cs.sellingPrice)],
    ],
    amountWords: amountInWords(cs.sellingPrice),
    signatures: ['Prepared By', 'Approved By'],
    notes: [`Order ${cs.order?.orderNo ?? '—'} cost sheet version ${cs.version}. Internal document.`],
  }
}

// ── expense: EXPENSE VOUCHER ──────────────────────────────────────────────
export async function fetchExpensePrint(idOrNo: string): Promise<PrintDoc | null> {
  let expense = await db.expense.findUnique({ where: { id: idOrNo } }).catch(() => null)
  if (!expense) expense = await db.expense.findUnique({ where: { expNo: idOrNo } })
  if (!expense) return null

  const [orderNo, party] = await Promise.all([
    orderNoById(expense.orderId),
    partyById(expense.partyId, 'Paid To'),
  ])

  return {
    docType: 'expense',
    title: 'EXPENSE VOUCHER',
    docNo: expense.expNo,
    docDate: d(expense.expDate),
    party,
    meta: [
      ['Category', cap(expense.category)],
      ['Order', orderNo],
      ['Fin Year', expense.finYear],
      ['Status', cap(expense.status)],
    ],
    lines: {
      columns: [{ label: 'Particulars' }, { label: 'Amount', align: 'right' }],
      rows: [[clean(expense.narration) || `${expense.category} expense`, inr(expense.amount)]],
    },
    totals: [['Expense Amount', inr(expense.amount)]],
    amountWords: amountInWords(expense.amount),
    signatures: [`For ${await co()}`, 'Payee'],
    notes: ['Expense voucher — internal record, not a tax invoice.'],
  }
}

// ── cut-order: CUTTING ORDER (bundles auto-generated at commit) ───────────
export async function fetchCutOrderPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { order: true, _count: { select: { bundles: true } } }
  let cut = await db.cutOrder.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!cut) cut = await db.cutOrder.findUnique({ where: { cutNo: idOrNo }, include })
  if (!cut) return null

  return {
    docType: 'cut-order',
    title: 'CUTTING ORDER',
    docNo: cut.cutNo,
    docDate: d(cut.cutDate),
    meta: [
      ['Order', cut.order?.orderNo ?? '—'],
      ['Status', cap(cut.status)],
      ['Bundles', String(cut._count.bundles)],
      ['Marker Length', cut.markerLength != null ? `${cut.markerLength} m` : '—'],
      ['No. of Plies', cut.noOfPlies != null ? String(cut.noOfPlies) : '—'],
      ['Efficiency', cut.efficiency != null ? `${cut.efficiency}%` : '—'],
    ],
    lines: {
      columns: [
        { label: 'Description' },
        { label: 'Fabric Issued (kgs)', align: 'right' },
        { label: 'Pcs', align: 'right' },
      ],
      rows: [[`Cutting for order ${cut.order?.orderNo ?? '—'}`, cut.fabricIssued, cut.totalPcs]],
      footer: [`Total Pcs: ${qty(cut.totalPcs)}`],
    },
    totals: [
      ['Fabric Issued', `${qty(cut.fabricIssued)} kgs`],
      ['Total Pcs', qty(cut.totalPcs)],
    ],
    signatures: [`For ${await co()}`, 'Cutting Master'],
    notes: [
      'Bundles are auto-generated at commit (100 pcs per bundle) into godown G1.',
      ...(cut.status === 'acknowledged' ? ['Cutting acknowledged by the cutting table.'] : []),
    ],
  }
}

// ── SPEC-M33 — bundle labels (the physical sticker sheet) ─────────────────
// bundle-labels: ONE cut order → one card per bundle (the sheet the cutter
// sticks on every 100-pc bundle). bundle-label: the single torn-label
// reprint, resolving by bundleNo / barcode / db id.
async function bundleLabelCards(bundles: {
  bundleNo: string; barcode: string; colourId: string | null; sizeId: string | null; qty: number
}[], orderNo: string, styleNo: string | null): Promise<PrintLabelCard[]> {
  // free-FK colour/size lookups (PITFALLS #21)
  const colourIds = new Set(bundles.map((b) => b.colourId).filter(Boolean) as string[])
  const sizeIds = new Set(bundles.map((b) => b.sizeId).filter(Boolean) as string[])
  const [colours, sizes] = await Promise.all([
    colourIds.size ? db.colour.findMany({ where: { id: { in: [...colourIds] } }, select: { id: true, name: true } }) : [],
    sizeIds.size ? db.size.findMany({ where: { id: { in: [...sizeIds] } }, select: { id: true, name: true } }) : [],
  ])
  const colourById = new Map<string, string>(colours.map((c) => [c.id, c.name] as [string, string]))
  const sizeById = new Map<string, string>(sizes.map((s) => [s.id, s.name] as [string, string]))

  return bundles.map((b) => ({
    heading: b.bundleNo,
    meta: [
      ['Order', orderNo],
      ...(styleNo ? [['Style', styleNo] as [string, string]] : []),
      ...(b.colourId && colourById.get(b.colourId) ? [['Colour', colourById.get(b.colourId)!] as [string, string]] : []),
      ...(b.sizeId && sizeById.get(b.sizeId) ? [['Size', sizeById.get(b.sizeId)!] as [string, string]] : []),
      ['Qty', `${qty(b.qty)} pcs`],
    ],
    barcode: code128Svg(b.barcode),
    barcodeText: b.barcode,
  }))
}

export async function fetchBundleLabelsPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { order: { include: { style: true } }, bundles: { orderBy: { bundleNo: 'asc' as const } } }
  let cut = await db.cutOrder.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!cut) cut = await db.cutOrder.findUnique({ where: { cutNo: idOrNo }, include })
  if (!cut) return null

  const orderNo = cut.order?.orderNo ?? '—'
  const styleNo = cut.order?.style?.styleNo ?? null
  const cards = await bundleLabelCards(cut.bundles, orderNo, styleNo)

  return {
    docType: 'bundle-labels',
    title: 'BUNDLE LABELS',
    docNo: cut.cutNo,
    docDate: d(cut.cutDate),
    meta: [
      ['Order', orderNo],
      ...(styleNo ? [['Style', styleNo] as [string, string]] : []),
      ['Bundles', String(cards.length)],
      ['Total Pcs', qty(cut.totalPcs)],
      ['Status', cap(cut.status)],
    ],
    labels: cards,
    notes: [
      'One label per bundle — stick on the bundle tie before despatch to sewing.',
      'Scan the barcode at Production → Bundle / Barcode Entry to post output.',
    ],
  }
}

export async function fetchBundleLabelPrint(idOrNo: string): Promise<PrintDoc | null> {
  // bundleNo carries '/' (CUT-0001/B1) — the print route's [id] param may
  // arrive URL-encoded (%2F, Next keeps it encoded in dynamic segments) or
  // raw. Try both, then the barcode and the db id.
  const candidates = [idOrNo, safeDecode(idOrNo)]
  let bundle: Awaited<ReturnType<typeof db.cutBundle.findUnique>> | null = null
  for (const key of candidates) {
    if (bundle || !key) continue
    bundle = await db.cutBundle.findUnique({ where: { bundleNo: key } }).catch(() => null)
    if (!bundle) bundle = await db.cutBundle.findUnique({ where: { barcode: key } }).catch(() => null)
    if (!bundle) bundle = await db.cutBundle.findUnique({ where: { id: key } }).catch(() => null)
  }
  if (!bundle) return null

  const cut = bundle.cutOrderId
    ? await db.cutOrder.findUnique({ where: { id: bundle.cutOrderId }, include: { order: { include: { style: true } } } }).catch(() => null)
    : null
  const orderNo = cut?.order?.orderNo ?? '—'
  const styleNo = cut?.order?.style?.styleNo ?? null
  const cards = await bundleLabelCards([bundle], orderNo, styleNo)

  return {
    docType: 'bundle-label',
    title: 'BUNDLE LABEL',
    docNo: bundle.bundleNo,
    docDate: cut ? d(cut.cutDate) : istToday(), // OPS-03 — IST business day
    meta: [
      ['Order', orderNo],
      ['Cut Order', cut?.cutNo ?? '—'],
      ['Status', cap(bundle.status.replace(/_/g, ' '))],
    ],
    labels: cards,
    notes: ['Reprint — original labels print with the cut order (Print bundle labels).'],
  }
}


// ── gate-entry / gate-pass: ONE model, gateType variants (§4 rule-2) ──────
async function fetchGatePrint(idOrNo: string, gateType: 'in' | 'out'): Promise<PrintDoc | null> {
  let entry = await db.gateEntry.findUnique({ where: { id: idOrNo } }).catch(() => null)
  if (!entry) entry = await db.gateEntry.findUnique({ where: { entryNo: idOrNo } })
  if (!entry || entry.gateType !== gateType) return null

  const isIn = gateType === 'in'
  const party = await partyById(entry.partyId, isIn ? 'Received From' : 'Issued To')

  return {
    docType: isIn ? 'gate-entry' : 'gate-pass',
    title: isIn ? 'GATE ENTRY' : 'GATE PASS',
    docNo: entry.entryNo,
    docDate: entry.gateDateTime ? new Date(entry.gateDateTime).toISOString().replace('T', ' ').slice(0, 16) : '—',
    party,
    meta: [
      ['Direction', isIn ? 'IN' : 'OUT'],
      ['Vehicle No', entry.vehicleNo ?? '—'],
      ['Ref Doc', entry.refDocNo ?? '—'],
      ['Status', cap(entry.status)],
    ],
    lines: {
      columns: [{ label: 'Particulars' }],
      rows: [[entry.purpose || (isIn ? 'Inward goods movement' : 'Outward goods movement')]],
    },
    signatures: ['Security', isIn ? 'Received By' : 'Issued By'],
    notes: ['Gate log — vehicle in/out record for the factory gate.'],
  }
}
export const fetchGateEntryPrint = (idOrNo: string) => fetchGatePrint(idOrNo, 'in')
export const fetchGatePassPrint = (idOrNo: string) => fetchGatePrint(idOrNo, 'out')

// ── sample: SAMPLE CARD ───────────────────────────────────────────────────
export async function fetchSamplePrint(idOrNo: string): Promise<PrintDoc | null> {
  let sample = await db.sample.findUnique({ where: { id: idOrNo } }).catch(() => null)
  if (!sample) sample = await db.sample.findUnique({ where: { sampleNo: idOrNo } })
  if (!sample) return null

  const [buyer, style] = await Promise.all([
    sample.buyerId ? db.buyer.findUnique({ where: { id: sample.buyerId } }).catch(() => null) : Promise.resolve(null),
    sample.styleId ? db.style.findUnique({ where: { id: sample.styleId } }).catch(() => null) : Promise.resolve(null),
  ])

  return {
    docType: 'sample',
    title: 'SAMPLE CARD',
    docNo: sample.sampleNo,
    docDate: d(sample.sampledOn),
    party: buyer ? { label: 'Buyer', name: buyer.name, code: buyer.code } : undefined,
    meta: [
      ['Style', style?.styleNo ?? '—'],
      ['Sample Type', cap(sample.sampleType)],
      ['Qty', `${qty(sample.qty)} pcs`],
      ['Status', cap(sample.status)],
      ['Enquiry Ref', sample.enquiryRef ?? '—'],
    ],
    lines: {
      columns: [{ label: 'Description' }, { label: 'Qty', align: 'right' }],
      rows: [[
        `${cap(sample.sampleType)} sample — style ${style?.styleNo ?? '—'}${buyer ? ` for ${buyer.name}` : ''}`,
        sample.qty,
      ]],
      footer: [`Total: ${qty(sample.qty)} pcs`],
    },
    signatures: [`For ${await co()}`, 'Buyer'],
    notes: [
      ...(sample.status === 'approved' ? ['Sample APPROVED for production.'] : []),
      ...(sample.status === 'rejected' ? ['Sample REJECTED — resubmit revised sample.'] : []),
      clean(sample.remarks),
    ].filter((n): n is string => !!n),
  }
}

// ── pcs-despatch: DESPATCH CHALLAN (PIECES) with colour/size lines ────────
export async function fetchPcsDespatchPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { lines: true }
  let dc = await db.pcsDespatch.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!dc) dc = await db.pcsDespatch.findUnique({ where: { dcNo: idOrNo }, include })
  if (!dc) return null

  const [orderNo, buyer, colours, sizes] = await Promise.all([
    orderNoById(dc.orderId),
    dc.buyerId ? db.buyer.findUnique({ where: { id: dc.buyerId } }).catch(() => null) : Promise.resolve(null),
    db.colour.findMany({ select: { id: true, name: true } }),
    db.size.findMany({ select: { id: true, name: true } }),
  ])
  const colourMap = new Map(colours.map((c) => [c.id, c.name]))
  const sizeMap = new Map(sizes.map((s) => [s.id, s.name]))
  const value = dc.lines.reduce((s, l) => s + l.qty * (l.rate || 0), 0)

  return {
    docType: 'pcs-despatch',
    title: 'DESPATCH CHALLAN (PIECES)',
    docNo: dc.dcNo,
    docDate: d(dc.despatchDate),
    party: buyer ? { label: 'Buyer', name: buyer.name, code: buyer.code } : undefined,
    meta: [
      ['Order', orderNo],
      ['Vehicle', dc.vehicleNo ?? '—'],
      ['Courier', dc.courierName ?? '—'],
      // SPEC-M41 PRC-08 — logistics block (blank-safe: legacy rows show '—').
      ['LR / AWB', dc.lrNo ?? '—'],
      ['Transporter', dc.transporter ?? '—'],
      ['Freight', dc.freight != null ? inr(dc.freight) : '—'],
      ['Cartons', dc.cartons != null ? String(dc.cartons) : '—'],
      ['Gross Wt (kg)', dc.grossWeightKg != null ? String(dc.grossWeightKg) : '—'],
      ['Status', cap(dc.status)],
      ['Fin Year', dc.finYear],
    ],
    lines: {
      columns: [
        { label: 'S.No', align: 'right' },
        { label: 'Style' },
        { label: 'Colour' },
        { label: 'Size' },
        { label: 'Qty', align: 'right' },
        { label: 'Rate', align: 'right' },
        { label: 'Amount', align: 'right' },
      ],
      rows: dc.lines.map((l, i) => [
        i + 1,
        l.styleNo,
        l.colourId ? colourMap.get(l.colourId) ?? '—' : '—',
        l.sizeId ? sizeMap.get(l.sizeId) ?? '—' : '—',
        qty(l.qty),
        inr(l.rate),
        inr(l.qty * (l.rate || 0)),
      ]),
      footer: [`Total Pcs: ${qty(dc.totalPcs)}`],
    },
    totals: [
      ['Total Pcs', qty(dc.totalPcs)],
      ['Total Value', inr(value)],
    ],
    amountWords: amountInWords(value),
    signatures: [`For ${await co()}`, 'Receiver'],
    notes: ['Pieces despatch challan — goods dispatched as per the above detail.'],
  }
}

// ── packing-list: PACKING LIST with carton lines ──────────────────────────
export async function fetchPackingListPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { lines: true }
  let pack = await db.packingList.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!pack) pack = await db.packingList.findUnique({ where: { packNo: idOrNo }, include })
  if (!pack) return null

  const [despatch, orderNo, buyer, colours, sizes] = await Promise.all([
    pack.despatchId ? db.pcsDespatch.findUnique({ where: { id: pack.despatchId }, select: { dcNo: true } }).catch(() => null) : Promise.resolve(null),
    orderNoById(pack.orderId),
    pack.buyerId ? db.buyer.findUnique({ where: { id: pack.buyerId } }).catch(() => null) : Promise.resolve(null),
    db.colour.findMany({ select: { id: true, name: true } }),
    db.size.findMany({ select: { id: true, name: true } }),
  ])
  const colourMap = new Map(colours.map((c) => [c.id, c.name]))
  const sizeMap = new Map(sizes.map((s) => [s.id, s.name]))
  const packedPcs = pack.lines.reduce((s, l) => s + l.qty, 0)

  return {
    docType: 'packing-list',
    title: 'PACKING LIST',
    docNo: pack.packNo,
    docDate: d(pack.packDate),
    party: buyer ? { label: 'Buyer', name: buyer.name, code: buyer.code } : undefined,
    meta: [
      ['Despatch DC', despatch?.dcNo ?? '—'],
      ['Order', orderNo],
      ['Status', cap(pack.status)],
      ['Fin Year', pack.finYear],
    ],
    lines: {
      columns: [
        { label: 'Carton' },
        { label: 'Style' },
        { label: 'Colour' },
        { label: 'Size' },
        { label: 'Qty', align: 'right' },
        { label: 'Net Kgs', align: 'right' },
      ],
      rows: pack.lines.map((l) => [
        l.cartonNo,
        l.styleNo,
        l.colourId ? colourMap.get(l.colourId) ?? '—' : '—',
        l.sizeId ? sizeMap.get(l.sizeId) ?? '—' : '—',
        qty(l.qty),
        l.netKgs,
      ]),
      footer: [`Cartons: ${qty(pack.totalCartons)} · Pcs: ${qty(packedPcs)}`],
    },
    totals: [
      ['Total Cartons', qty(pack.totalCartons)],
      ['Total Pcs', qty(packedPcs)],
      ['Net / Gross Kgs', `${qty(pack.netKgs)} / ${qty(pack.grossKgs)}`],
    ],
    signatures: [`For ${await co()}`, 'Receiver'],
    notes: [
      ...(despatch ? [`Cartons against despatch challan ${despatch.dcNo}.`] : []),
      clean(pack.notes),
    ].filter((n): n is string => !!n),
  }
}

// ── rejection: REJECTION NOTE ─────────────────────────────────────────────
export async function fetchRejectionPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { order: true, department: true }
  let rej = await db.rejectionEntry.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!rej) rej = await db.rejectionEntry.findUnique({ where: { rejNo: idOrNo }, include })
  if (!rej) return null

  const rejType = rej.rejType.replace(/_/g, ' ')
  const action = rej.action.replace(/_/g, ' ')

  return {
    docType: 'rejection',
    title: 'REJECTION NOTE',
    docNo: rej.rejNo,
    docDate: d(rej.rejDate),
    meta: [
      ['Order', rej.order?.orderNo ?? '—'],
      ['Department', rej.department?.name ?? '—'],
      ['Rejection Type', rejType],
      ['Action', action],
    ],
    lines: {
      columns: [{ label: 'Description' }, { label: 'Qty', align: 'right' }],
      rows: [[
        `${rejType} rejection in ${rej.department?.name ?? 'production'} — action: ${action}${rej.notes ? ` (${rej.notes})` : ''}`,
        qty(rej.qty),
      ]],
      footer: [`Rejected: ${qty(rej.qty)} pcs`],
    },
    totals: [['Rejected Qty', `${qty(rej.qty)} pcs`]],
    signatures: ['Prepared By', 'QC Incharge'],
    notes: ['Rejected pieces move to the rejection ledger per the recorded action.'],
  }
}

// ── production-entry: PRODUCTION / REWORK ENTRY (id-only — bundleNo not unique)
export async function fetchProductionEntryPrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { order: true, department: true, operator: true }
  const entry = await db.productionEntry.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!entry) return null

  return {
    docType: 'production-entry',
    title: entry.rework ? 'REWORK ENTRY' : 'PRODUCTION ENTRY',
    docNo: entry.bundleNo ?? `PE-${entry.id.slice(-6).toUpperCase()}`,
    docDate: d(entry.prodDate),
    meta: [
      ['Order', entry.order?.orderNo ?? '—'],
      ['Department', entry.department?.name ?? '—'],
      ['Operator', entry.operator ? `${entry.operator.name} (${entry.operator.code})` : '—'],
      ['Style', entry.styleNo ?? '—'],
      ...(entry.rework ? ([['Rework', 'Yes']] as [string, string][]) : []),
    ],
    lines: {
      columns: [
        { label: 'Bundle' },
        { label: 'Qty', align: 'right' },
        { label: 'Rate', align: 'right' },
        { label: 'Amount', align: 'right' },
      ],
      rows: [[entry.bundleNo ?? '—', qty(entry.qty), inr(entry.rate), inr(entry.amount)]],
      footer: [`Qty: ${qty(entry.qty)} pcs`],
    },
    totals: [
      ['Qty', `${qty(entry.qty)} pcs`],
      ['Amount', inr(entry.amount)],
    ],
    signatures: [`For ${await co()}`, 'Production Incharge'],
    notes: [
      entry.rework
        ? 'Rework entry — document only, no stock move.'
        : 'Production entry — qty credited to the department output.',
    ],
  }
}

// ── line-issue: LINE ISSUE SLIP ───────────────────────────────────────────
export async function fetchLineIssuePrint(idOrNo: string): Promise<PrintDoc | null> {
  const include = { order: true, line: true }
  let li = await db.lineIssue.findUnique({ where: { id: idOrNo }, include }).catch(() => null)
  if (!li) li = await db.lineIssue.findUnique({ where: { issueNo: idOrNo }, include })
  if (!li) return null

  const lineCode = li.line?.code ?? li.lineId

  return {
    docType: 'line-issue',
    title: 'LINE ISSUE SLIP',
    docNo: li.issueNo,
    docDate: d(li.issueDate),
    meta: [
      ['Order', li.order?.orderNo ?? '—'],
      ['Line', lineCode],
      ['Style', li.styleNo ?? '—'],
      ['Status', cap(li.status)],
    ],
    lines: {
      columns: [{ label: 'Description' }, { label: 'Qty', align: 'right' }],
      rows: [[
        `${li.styleNo ? `Style ${li.styleNo} — ` : ''}pieces issued to line ${lineCode}${li.notes ? ` — ${li.notes}` : ''}`,
        qty(li.qty),
      ]],
      footer: [`Issued: ${qty(li.qty)} pcs`],
    },
    totals: [['Issued Qty', `${qty(li.qty)} pcs`]],
    signatures: [`For ${await co()}`, 'Line Incharge'],
    notes: ['Line issue — pieces moved from WIP store to the sewing line.'],
  }
}

// ── lab-test: LAB TEST REPORT (values JSON → parameter rows) ──────────────
export async function fetchLabTestPrint(idOrNo: string): Promise<PrintDoc | null> {
  let test = await db.labTest.findUnique({ where: { id: idOrNo } }).catch(() => null)
  if (!test) test = await db.labTest.findUnique({ where: { testNo: idOrNo } })
  if (!test) return null

  const [lot, orderNo] = await Promise.all([
    test.lotId ? db.lot.findUnique({ where: { id: test.lotId }, select: { lotNo: true } }).catch(() => null) : Promise.resolve(null),
    orderNoById(test.orderId),
  ])

  // values is a JSON string of parameter results → parameter rows
  let paramRows: (string | number)[][] = []
  if (test.values) {
    try {
      const parsed: unknown = JSON.parse(test.values)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        paramRows = Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)])
      }
    } catch {
      paramRows = [['Value', test.values]]
    }
  }

  return {
    docType: 'lab-test',
    title: 'LAB TEST REPORT',
    docNo: test.testNo,
    docDate: d(test.testedOn),
    meta: [
      ['Item', `${test.itemId} (${test.itemType})`],
      ['Test Type', test.testType.replace(/_/g, ' ')],
      ['Lot', lot?.lotNo ?? '—'],
      ['Order', orderNo],
      ['Tested By', test.testedBy ?? '—'],
    ],
    lines: paramRows.length
      ? { columns: [{ label: 'Parameter' }, { label: 'Result' }], rows: paramRows }
      : undefined,
    totals: [['Result', cap(test.result)]],
    signatures: ['Lab Incharge', `For ${await co()}`],
    notes: [clean(test.remarks) ?? 'Lab test report — internal quality record.'],
  }
}

// ── stock-take: COUNT SHEET (SPEC-M42 INV-01) ─────────────────────────────
// The physical count sheet: system snapshot vs counted (blank while open —
// the sheet is what the floor walks with). Resolves by db id OR takeNo.
export async function fetchStockTakePrint(idOrNo: string): Promise<PrintDoc | null> {
  let take = await db.stockTake.findUnique({ where: { id: idOrNo } }).catch(() => null)
  if (!take) take = await db.stockTake.findUnique({ where: { takeNo: idOrNo } }).catch(() => null)
  if (!take) return null
  const lines = await db.stockTakeLine.findMany({ where: { takeId: take.id } })

  const godown = await db.godown.findUnique({ where: { id: take.godownId } }).catch(() => null)

  // item codes via the item models (StockTakeLine carries itemId — PITFALLS #44)
  const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory', pcs: 'style' }
  const byType: Record<string, Set<string>> = {}
  for (const l of lines) (byType[l.itemType] ??= new Set()).add(l.itemId)
  const codeByItemId = new Map<string, string>()
  for (const [t, ids] of Object.entries(byType)) {
    // per-model select: only the STYLE master carries styleNo — asking yarn/
    // fabric/accessory for it throws Prisma validation (the catch would
    // swallow into empty maps and print raw cuids as item codes)
    const model = ITEM_MODELS[t] ? (db as any)[ITEM_MODELS[t]] : null
    if (!model || !ids.size) continue
    const select = t === 'pcs' ? { id: true, styleNo: true } : { id: true, code: true }
    const items: any[] = await model.findMany({ where: { id: { in: [...ids] } }, select }).catch(() => [])
    for (const i of items) codeByItemId.set(i.id, (i.code ?? i.styleNo) ?? i.id)
  }

  const rows = lines.map((l) => [
    `${codeByItemId.get(l.itemId) ?? l.itemId} (${l.itemType})`,
    qty(l.systemKgs), qty(l.systemMtrs), qty(l.systemPcs),
    l.countedKgs == null ? '____' : qty(l.countedKgs),
    l.countedMtrs == null ? '____' : qty(l.countedMtrs),
    l.countedPcs == null ? '____' : qty(l.countedPcs),
  ])

  return {
    docType: 'stock-take',
    title: 'STOCK TAKE — COUNT SHEET',
    docNo: take.takeNo,
    docDate: d(take.createdAt),
    meta: [
      ['Godown', godown?.code ?? take.godownId],
      ['Status', cap(take.status)],
      ['Lines', String(lines.length)],
      ...(take.committedAt ? [['Committed', d(take.committedAt)] as [string, string]] : []),
    ],
    lines: {
      columns: [
        { label: 'Item' },
        { label: 'Sys kgs', align: 'right' },
        { label: 'Sys mtrs', align: 'right' },
        { label: 'Sys pcs', align: 'right' },
        { label: 'Counted kgs', align: 'right' },
        { label: 'Counted mtrs', align: 'right' },
        { label: 'Counted pcs', align: 'right' },
      ],
      rows,
      footer: [`Counted by: ______________  Date: ____________  Verified by: ______________`],
    },
    signatures: ['Store keeper', `For ${await co()}`],
    notes: [
      'System quantities are the snapshot at take creation — do not adjust from later movements.',
      ...(take.status === 'committed'
        ? ['Variance ADJs for this take are already posted (see the ledger ADJ- rows referencing this ST-).']
        : ['Committing the take posts one ADJ- per variance and makes the take terminal.']),
      clean(take.notes),
    ].filter((n): n is string => !!n),
  }
}

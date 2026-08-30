/**
 * PrintDoc — SPEC-M8 §3: the normalized shape every doc-family fetcher
 * builds and the PrintSheet renders. One shape → one engine (the
 * DocScreen/doc-config pattern, print edition). All display strings are
 * pre-formatted by the fetcher (dates ISO, money en-IN, ₹ prefix) so the
 * sheet stays a dumb renderer.
 */

export interface PrintParty {
  /** Block heading, e.g. 'Bill To' | 'Supplier' | 'Jobworker' | 'Party' */
  label: string
  name: string
  code?: string
  address?: string
  city?: string
  state?: string
  gstin?: string
  phone?: string
}

export interface PrintLines {
  columns: { label: string; align?: 'left' | 'right' | 'center' }[]
  rows: (string | number)[][]
  /** Right-aligned summary rows under the table (e.g. 'Total Qty: 900') */
  footer?: string[]
}

/** A single key-value meta row (rendered as a two-column grid under the party block). */
export type PrintMetaRow = [label: string, value: string]

export interface PrintDoc {
  docType: string
  /** Sheet heading, e.g. 'TAX INVOICE' | 'PURCHASE ORDER' */
  title: string
  /** Original | Duplicate | Triplicate (from ?copy=; default Original) */
  copy?: string
  docNo: string
  docDate: string
  party?: PrintParty
  /** Right-side meta rows (type, delivery date, vehicle, mode…) */
  meta?: PrintMetaRow[]
  lines?: PrintLines
  /** Totals block rows (label → right-aligned value); last row is the grand total */
  totals?: PrintMetaRow[]
  /** Pre-computed 'Rupees … Only' line (amount-words.ts) */
  amountWords?: string
  /** Two signature captions; rendered bottom-left and bottom-right */
  signatures?: [string, string]
  /** Terms / footnotes under the sheet */
  notes?: string[]
  /** SPEC-M27 — inline QR SVG (the invoice family: encodes the live mock IRN;
   *  absent when there is no live IRN — a cancelled IRN never prints). */
  qr?: string
  /** Label under the QR, e.g. 'Scan to verify (mock IRN)'. */
  qrLabel?: string
  /** SPEC-M33 — bundle label cards (the cut-order sticker sheet). Present =
   *  label-card grid mode: one Code128 barcode per bundle, 2 columns. */
  labels?: PrintLabelCard[]
}

/** SPEC-M33 — one physical bundle sticker: heading + meta rows + Code128 SVG. */
export interface PrintLabelCard {
  /** Card heading, e.g. the bundleNo 'CUT-0001/B1' */
  heading: string
  /** Key-value rows (order, style, colour, size, qty…) */
  meta: PrintMetaRow[]
  /** Inline Code128 SVG of CutBundle.barcode */
  barcode: string
  /** Human-readable barcode text under the bars */
  barcodeText: string
}

/** Registry entry: a docType's fetcher (resolves by db id OR doc no). */
export type PrintFetcher = (idOrNo: string) => Promise<PrintDoc | null>

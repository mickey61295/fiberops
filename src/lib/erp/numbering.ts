/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== NumberingService (LLD 01 §3.4 / 03 §7 port) ==============
// One home for finyear-scoped document numbering. Replaces the ~20 copy-pasted
// auto-number blocks inside agent tools. peek() forecasts the next number,
// take() is the same value (final assignment happens at commit time when the
// tool re-executes, so the number is re-resolved then — collision-safe because
// resolve() skips any desired number that is already taken).

import { db } from '@/lib/db'
import { istDateStr } from '@/lib/erp/dates'

/** Fiscal-year code for an ISO date string ('YYYY-MM-DD', the IST business
 * date): Indian FY runs Apr 1 – Mar 31, so month >= 4 starts a new code.
 * Pure — no clock inside (SPEC-M44 FY-01): '2026-04-01' → '26-27',
 * '2027-03-31' → '26-27', '2027-04-01' → '27-28', '2026-03-31' → '25-26'. */
export function fyCodeFor(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(dateStr)
  if (!m) return fyCodeToday() // defensive — istDateStr never emits garbage
  const year = Number(m[1])
  const startsFy = Number(m[2]) >= 4
  const a = startsFy ? year : year - 1
  return `${String(a % 100).padStart(2, '0')}-${String((a + 1) % 100).padStart(2, '0')}`
}

/** The fiscal-year code of TODAY's IST day (the last-resort fallback only). */
export function fyCodeToday(): string {
  return fyCodeFor(istDateStr(new Date()))
}

/** The active financial year code (the FinYear master row the owner marked
 * active at /admin/company; falls back to today's IST-derived code when no
 * row is active — never a frozen literal, SPEC-M44 FY-01). */
export async function activeFinYear(): Promise<string> {
  const fy = await db.finYear.findFirst({ where: { active: true } })
  return fy?.code ?? fyCodeToday()
}

type SequenceDef = {
  /** model on the prisma client, e.g. 'order' */
  model: string
  /** unique field, e.g. 'orderNo' */
  field: string
  /** number template, e.g. 'SO-####' (#### = zero-padded counter, width = # count) */
  template: string
  /** starting counter when no documents exist */
  start: number
}

/** The document-number registry — mirrors every prefix the tools used. */
export const SEQUENCES: Record<string, SequenceDef> = {
  order:          { model: 'order',          field: 'orderNo',     template: 'SO-####',    start: 1001 },
  purchase_order: { model: 'purchaseOrder',  field: 'poNo',        template: 'PO-G-###',   start: 1 },
  purchase_order_yarn:  { model: 'purchaseOrder', field: 'poNo',   template: 'PO-Y-###',   start: 1 },
  purchase_order_fabric: { model: 'purchaseOrder', field: 'poNo',  template: 'PO-F-###',   start: 1 },
  purchase_order_acc: { model: 'purchaseOrder',  field: 'poNo',    template: 'PO-A-###',   start: 1 },
  grn:            { model: 'gRN',            field: 'grnNo',       template: 'GRN-####',   start: 1 },
  invoice:        { model: 'salesInvoice',   field: 'invoiceNo',   template: 'INV-####',   start: 1 },
  cut:            { model: 'cutOrder',       field: 'cutNo',       template: 'CUT-####',   start: 1 },
  jobwork:        { model: 'jobworkOrder',   field: 'dcNo',        template: 'JW-####',    start: 1 },
  despatch:       { model: 'pcsDespatch',    field: 'dcNo',        template: 'DC-####',    start: 1 },
  debit_note:     { model: 'debitNote',      field: 'noteNo',      template: 'DN-####',    start: 1 },
  journal:        { model: 'journal',        field: 'voucherNo',   template: 'V-####',     start: 1 },
  party:          { model: 'party',          field: 'code',        template: 'PRT-####',   start: 1 },
  buyer:          { model: 'buyer',          field: 'code',        template: 'B-####',     start: 1 },
  style:          { model: 'style',          field: 'styleNo',     template: 'STY-####',   start: 1 },
  yarn:           { model: 'yarn',           field: 'code',        template: 'Y-####',     start: 1 },
  fabric:         { model: 'fabric',         field: 'code',        template: 'F-####',     start: 1 },
  accessory:      { model: 'accessory',      field: 'code',        template: 'A-####',     start: 1 },
  godown:         { model: 'godown',         field: 'code',        template: 'G#',         start: 1 },
  department:     { model: 'department',     field: 'code',        template: 'D#',         start: 1 },
  employee:       { model: 'employee',       field: 'code',        template: 'EMP-####',   start: 1 },
  lot:            { model: 'lot',            field: 'lotNo',       template: 'LOT-####',   start: 1 },
  bill:           { model: 'bill',           field: 'billNo',      template: 'BILL-####',  start: 1 },
  payment:        { model: 'payment',        field: 'voucherNo',   template: 'PAY-####',   start: 1 },
  // SPEC-M42 INV-01 — the stock take cycle
  stock_take:     { model: 'stockTake',      field: 'takeNo',      template: 'ST-####',   start: 1 },
  // SPEC-M46 L-02 — the payroll run
  payroll_run:    { model: 'payrollRun',     field: 'runNo',       template: 'PR-####',   start: 1 },
}

function render(template: string, n: number): string {
  const m = template.match(/^(.*?)#+(.*)$/)
  if (!m) return `${template}${n}`
  const [, prefix, suffix] = m
  const width = template.length - prefix.length - suffix.length
  return `${prefix}${String(n).padStart(width, '0')}${suffix}`
}

async function isFree(seq: SequenceDef, value: string): Promise<boolean> {
  const model = (db as any)[seq.model]
  if (!model) throw new Error(`NumberingService: unknown model ${seq.model}`)
  try {
    const existing = await model.findUnique({ where: { [seq.field]: value } })
    return !existing
  } catch {
    // Non-unique field — fall back to a scan.
    const all: any[] = await model.findMany({ where: { [seq.field]: { startsWith: value.slice(0, -2) } } })
    return !all.some((row) => row[seq.field] === value)
  }
}

async function nextFree(seq: SequenceDef): Promise<string> {
  const model = (db as any)[seq.model]
  const prefix = render(seq.template, 0).replace(/0+$/, '') // e.g. 'SO-'
  // Pull all numbers sharing the template prefix and find the first gap.
  let rows: any[] = []
  try {
    rows = await model.findMany({
      where: { [seq.field]: { startsWith: prefix } },
      select: { [seq.field]: true },
    })
  } catch {
    rows = []
  }
  const used = new Set(rows.map((r) => r[seq.field] as string))
  let n = seq.start
  while (used.has(render(seq.template, n))) n++
  return render(seq.template, n)
}

/**
 * Resolve a document number:
 * - if the caller (or the buyer's document) wants a specific number and it is
 *   free → use it (ingestion keeps the buyer's own order numbers);
 * - otherwise auto-assign the next free number for the sequence.
 */
export async function resolveNumber(
  sequenceKey: string,
  desired?: string | null,
): Promise<string> {
  const seq = SEQUENCES[sequenceKey]
  if (!seq) throw new Error(`NumberingService: unknown sequence ${sequenceKey}`)
  const want = desired?.trim()
  if (want && (await isFree(seq, want))) return want
  return nextFree(seq)
}

/** Convenience: forecast the next number without assigning anything. */
export async function peekNumber(sequenceKey: string): Promise<string> {
  const seq = SEQUENCES[sequenceKey]
  if (!seq) throw new Error(`NumberingService: unknown sequence ${sequenceKey}`)
  return nextFree(seq)
}

// ---------------------------------------------------------------------------
// Low-level helpers, extracted VERBATIM from tools.ts (SPEC-M3 §5 Wave A).
// Used by the posting services whose numbering is NOT covered by a SEQUENCES
// entry (program PGM-, lineIssue LI-, rejection REJ-, payment RCP-/PMT-).
// NOTE: these pad to 4 (PGM-0001 style) — tools with their own formats
// (SO-1001 unpadded, PO-Y-001 3-padded) keep their inline logic in the service.
// ---------------------------------------------------------------------------

/** Next free sequential document number, e.g. nextNumber('cutOrder', 'cutNo', 'CUT-') → CUT-0007. */
export async function nextNumber(model: string, field: string, prefix: string, pad = 4): Promise<string> {
  const m = (db as any)[model]
  const all = await m.findMany({ where: { [field]: { startsWith: prefix } } , select: { [field]: true } })
  const used = new Set(all.map((r: any) => r[field]))
  let n = 1
  while (used.has(`${prefix}${String(n).padStart(pad, '0')}`)) n++
  return `${prefix}${String(n).padStart(pad, '0')}`
}

/** Resolve a document number: honour an explicit user-supplied value if free, else auto-assign. */
export async function resolveDocNo(model: string, field: string, prefix: string, desired?: string): Promise<string> {
  if (desired?.trim()) {
    const m = (db as any)[model]
    const exists = await m.findUnique({ where: { [field]: desired.trim() } }).catch(() => null)
    if (!exists) return desired.trim()
  }
  return nextNumber(model, field, prefix)
}

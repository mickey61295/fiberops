/* CHAT-10 CHAT-05 (Phase-6B Batch 2, SPEC-M38 §1) — plan contents display.
 *
 * The approval card used to say "Creates: 3 record(s)" while approving a
 * ₹4-lakh order (agent-panel.tsx:550-581) — the operator approved a NUMBER,
 * not the contents. This pure helper turns plan.creates/updates into
 * display rows: the header doc's fields as field/value pairs (money as ₹
 * en-IN, dates as ISO, booleans as yes/no, ids skipped) + a compact line
 * rollup for the child rows (order lines, PO lines, BOM components…).
 */

export interface PlanFieldRow {
  field: string
  value: string
}

export interface PlanDisplay {
  /** Human label for the head record (table name → readable). */
  label: string
  /** Field/value rows for the first create (or first update's changed data). */
  rows: PlanFieldRow[]
  /** Compact per-line summary for creates[1..] (the line grid). */
  lines: string[]
  /** Rows not shown (line cap overflow). */
  moreLines: number
  /** Updates listed as table+id when there is no create. */
  updates: string[]
}

const TABLE_LABELS: Record<string, string> = {
  order: 'Sales order',
  orderLine: 'Order line',
  purchase_order: 'Purchase order',
  poLine: 'PO line',
  grn: 'GRN',
  grnLine: 'GRN line',
  invoice: 'Invoice',
  cutOrder: 'Cut order',
  jobworkOrder: 'Jobwork DC',
  pcsDespatch: 'Despatch DC',
  despatchLine: 'Despatch line',
  debitNote: 'Debit note',
  journalVoucher: 'Journal',
  journalLine: 'Journal line',
  budget: 'Budget',
  costSheet: 'Cost sheet',
  expense: 'Expense',
  payment: 'Payment',
  stockAdjustment: 'Stock adjustment',
  stockLedger: 'Stock ledger entry',
  gateEntry: 'Gate entry',
  gatePass: 'Gate pass',
  sample: 'Sample',
  packingList: 'Packing list',
  productionEntry: 'Production entry',
  lineIssue: 'Line issue',
  program: 'Program',
  bom: 'BOM',
  bomComponent: 'BOM component',
  rejection: 'Rejection',
  labTest: 'Lab test',
  employee: 'Employee',
  party: 'Party',
  buyer: 'Buyer',
  style: 'Style',
}

/** Money-ish field names → ₹ en-IN formatting (quantities excluded). */
const MONEY_FIELDS = /^(?=.*(?:rate|value|amount|price|balance|total|cost|paid|received|billed|opening|wage|expense))(?!.*(?:qty|pcs|kgs|mtrs|count|nos$)).*$/i
const SKIP_FIELDS = /^id$|Id$|^createdAt$|^updatedAt$/

export function formatMoney(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function formatValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number') {
    if (MONEY_FIELDS.test(field)) return formatMoney(v)
    return v.toLocaleString('en-IN')
  }
  if (typeof v === 'string') {
    // ISO date strings render as dates
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10)
    return v
  }
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** Readable field name: camelCase → Words. */
function fieldLabel(field: string): string {
  const label = field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).toLowerCase()
  return label.trim()
}

const LINE_LINE_FIELDS = ['colourName', 'sizeName', 'itemCode', 'itemType', 'uom', 'bundleNo', 'account', 'particulars', 'description']
const LINE_QTY_FIELDS = ['qty', 'quantity', 'kgs', 'mtrs', 'pcs', 'requiredKgs']
const LINE_MONEY_FIELDS = ['rate', 'amount', 'value', 'price', 'debit', 'credit']

/** One compact line description from a child row's data. */
function describeLine(data: Record<string, unknown>): string {
  const parts: string[] = []
  for (const f of LINE_LINE_FIELDS) {
    const v = data[f]
    if (v !== undefined && v !== null && v !== '') parts.push(String(v))
  }
  for (const f of LINE_QTY_FIELDS) {
    const v = data[f]
    if (typeof v === 'number') parts.push(`${v.toLocaleString('en-IN')} ${f === 'qty' ? 'qty' : f}`)
  }
  for (const f of LINE_MONEY_FIELDS) {
    const v = data[f]
    if (typeof v === 'number' && v !== 0) parts.push(formatMoney(v))
  }
  return parts.join(' · ') || JSON.stringify(data).slice(0, 80)
}

const MAX_ROWS = 14
const MAX_LINES = 6

export function planDisplay(plan: {
  creates?: { table: string; data: Record<string, unknown> }[]
  updates?: { table: string; id: string; data: Record<string, unknown> }[]
}): PlanDisplay {
  const creates = plan.creates ?? []
  const updates = plan.updates ?? []
  const head = creates[0]
  const label = head ? (TABLE_LABELS[head.table] ?? head.table) : updates[0] ? (TABLE_LABELS[updates[0].table] ?? updates[0].table) : 'Record'

  let rows: PlanFieldRow[] = []
  if (head) {
    rows = Object.entries(head.data)
      .filter(([k, v]) => !SKIP_FIELDS.test(k) && v !== '<pending>' && v !== null && v !== undefined && v !== '')
      .slice(0, MAX_ROWS)
      .map(([k, v]) => ({ field: fieldLabel(k), value: formatValue(k, v) }))
  } else if (updates[0]) {
    rows = Object.entries(updates[0].data)
      .filter(([k, v]) => !SKIP_FIELDS.test(k) && v !== null && v !== undefined && v !== '')
      .slice(0, MAX_ROWS)
      .map(([k, v]) => ({ field: fieldLabel(k), value: formatValue(k, v) }))
  }

  const lineRows = creates.slice(1)
  const lines = lineRows.slice(0, MAX_LINES).map((c) => describeLine(c.data))
  const moreLines = Math.max(0, lineRows.length - MAX_LINES)
  const updateList = updates.map((u) => `${TABLE_LABELS[u.table] ?? u.table} ${u.id.slice(0, 8)}`)

  return { label, rows, lines, moreLines, updates: updateList }
}

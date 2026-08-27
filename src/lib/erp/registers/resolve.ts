/**
 * Query parsing + W2 doc-reference resolution — SPEC-M4 §6/§7/§8.1.
 * searchParams are STRINGS: every date goes through new Date() before any
 * prisma arg (PITFALLS #13); invalid dates become "filter off", never a 500.
 * Doc resolution mirrors the Wave C view pages (id OR doc-number).
 */
import type { RegisterConfig, RegisterFilter } from '@/lib/erp/register-configs/types'
import type { RegisterQuery } from './types'
import { db } from '@/lib/db'

/** Flatten Next's searchParams (string | string[] | undefined) → first value. */
export function flattenSearchParams(
  sp: Record<string, string | string[] | undefined> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {}
  if (!sp) return out
  for (const [k, v] of Object.entries(sp)) {
    const first = Array.isArray(v) ? v[0] : v
    if (typeof first === 'string' && first !== '') out[k] = first
  }
  return out
}

const dateOrUndefined = (s: string | undefined, endOfDay = false): Date | undefined => {
  if (!s) return undefined
  const d = new Date(s)
  if (isNaN(d.getTime())) return undefined
  if (endOfDay) d.setHours(23, 59, 59, 999)
  return d
}

const intOr = (s: string | undefined, fallback: number, min: number, max: number): number => {
  const n = parseInt(s ?? '', 10)
  if (isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/**
 * Parse flattened searchParams against a config's declared filters (SPEC-M4 §6).
 * Only keys the config declares are honored — unknown params are ignored.
 */
export function parseRegisterQuery(
  config: RegisterConfig,
  params: Record<string, string>,
): RegisterQuery {
  const keys = new Set(config.filters.map((f) => f.key))
  const q: RegisterQuery = {
    limit: intOr(params.limit, config.defaultLimit ?? 100, 10, 500),
    page: intOr(params.page, 1, 1, 10000),
  }
  if (keys.has('from')) q.from = dateOrUndefined(params.from)
  if (keys.has('to')) q.to = dateOrUndefined(params.to, true)
  if (keys.has('party')) q.party = params.party
  if (keys.has('order')) q.order = params.order
  if (keys.has('godown')) q.godown = params.godown
  if (keys.has('itemType')) q.itemType = params.itemType
  if (keys.has('status')) q.status = params.status
  if (keys.has('variant')) q.variant = params.variant
  if (keys.has('q')) q.q = params.q
  return q
}

/** Render active filters as agent-seed text (W5(b) "Ask about this data"). */
export function filtersAsText(config: RegisterConfig, params: Record<string, string>): string {
  const parts: string[] = []
  for (const f of config.filters) {
    const v = params[f.key]
    if (v) parts.push(`${f.label.toLowerCase()}: ${v}`)
  }
  return parts.join(', ')
}

// ---------------------------------------------------------------------------
// W2 drill-down resolution (SPEC-M4 §8.1)
// ---------------------------------------------------------------------------

/** Doc families a StockLedger txnType can drill into (forward-compatible). */
export const TXN_DOC_FAMILY: Record<string, DocFamily> = {
  purchase_grn: 'grn',
  sales_return: 'grn',
  process_delivery: 'jobwork',
  process_receipt: 'jobwork',
  sales_delivery: 'despatch',
  ready_to_cut_in: 'cut',
  ready_to_cut_out: 'cut',
  // godown_transfer_* / stock_adjustment_* / transfer_* / cut_ack / unit_dc /
  // opening → the ledger row IS the record (PITFALLS #24) — no doc view.
}

export type DocFamily = 'grn' | 'po' | 'jobwork' | 'despatch' | 'invoice' | 'order' | 'cut'

const FAMILY_SPEC: Record<DocFamily, { model: string; numberField: string; view: (id: string) => string }> = {
  grn: { model: 'grn', numberField: 'grnNo', view: (id) => `/procurement/grn/${id}` },
  po: { model: 'purchaseOrder', numberField: 'poNo', view: (id) => `/procurement/po/${id}` },
  jobwork: { model: 'jobworkOrder', numberField: 'dcNo', view: (id) => `/jobwork/order/${id}` },
  despatch: { model: 'pcsDespatch', numberField: 'dcNo', view: (id) => `/pieces/despatch/${id}` },
  invoice: { model: 'salesInvoice', numberField: 'invoiceNo', view: (id) => `/accounts/invoice/${id}` },
  order: { model: 'order', numberField: 'orderNo', view: (id) => `/orders/${id}` },
  cut: { model: 'cutOrder', numberField: 'cutNo', view: (id) => `/cutting/job-order/${id}` },
}

/**
 * Resolve a doc reference (id OR doc number) to its live view href.
 * Returns null when unresolvable — a row then renders UNLINKED (never a
 * dead href, SPEC-M4 acceptance #4).
 */
export async function resolveDocRef(family: DocFamily, ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null
  const spec = FAMILY_SPEC[family]
  const model = (db as any)[spec.model]
  if (!model) return null
  const row = await model
    .findFirst({ where: { OR: [{ id: ref }, { [spec.numberField]: ref }] }, select: { id: true } })
    .catch(() => null)
  return row?.id ? spec.view(row.id) : null
}

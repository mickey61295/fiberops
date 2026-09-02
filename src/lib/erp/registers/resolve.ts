/**
 * Query parsing + W2 doc-reference resolution — SPEC-M4 §6/§7/§8.1.
 * searchParams are STRINGS: every date goes through new Date() before any
 * prisma arg (PITFALLS #13); invalid dates become "filter off", never a 500.
 * Doc resolution mirrors the Wave C view pages (id OR doc-number).
 */
import type { RegisterConfig, RegisterFilter } from '@/lib/erp/register-configs/types'
import type { RegisterQuery } from './types'
import { db } from '@/lib/db'
import { endOfUtcDay } from '@/lib/erp/dates'

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
  // OPS-03 — end-of-day ceiling in explicit UTC (the storage convention for
  // date-only columns); was server-local setHours(23,59,59,999), which changes
  // meaning if the process TZ ever moves.
  return endOfDay ? endOfUtcDay(d) : d
}

const intOr = (s: string | undefined, fallback: number, min: number, max: number): number => {
  const n = parseInt(s ?? '', 10)
  if (isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/**
 * Parse flattened searchParams against a config's declared filters (SPEC-M4 §6).
 * Only keys the config declares are honored — unknown params are ignored.
 * SPEC-M19 §1-A: a declared filter's `preset` applies when the param is absent
 * (day-book home value); an explicit URL param always wins.
 */
export function parseRegisterQuery(
  config: RegisterConfig,
  params: Record<string, string>,
): RegisterQuery {
  const filterByKey = new Map(config.filters.map((f) => [f.key, f]))
  const val = (key: string): string | undefined => params[key] ?? filterByKey.get(key)?.preset
  const keys = new Set(config.filters.map((f) => f.key))
  const q: RegisterQuery = {
    limit: intOr(params.limit, config.defaultLimit ?? 100, 10, 500),
    page: intOr(params.page, 1, 1, 10000),
  }
  if (keys.has('from')) q.from = dateOrUndefined(val('from'))
  if (keys.has('to')) q.to = dateOrUndefined(val('to'), true)
  if (keys.has('party')) q.party = val('party')
  if (keys.has('order')) q.order = val('order')
  if (keys.has('godown')) q.godown = val('godown')
  if (keys.has('itemType')) q.itemType = val('itemType')
  if (keys.has('status')) q.status = val('status')
  if (keys.has('variant')) q.variant = val('variant')
  // SPEC-M43 PRG-01 — the orderType select filter (order register)
  if (keys.has('orderType')) q.orderType = val('orderType')
  if (keys.has('q')) q.q = val('q')
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
  // NOTE: Prisma's client accessor for model GRN is `gRN` (not `grn`) — a
  // `grn` key here silently broke GRN drill-downs until the Wave B math suite
  // caught it (resolveDocRef returned null for every purchase_grn row).
  grn: { model: 'gRN', numberField: 'grnNo', view: (id) => `/procurement/grn/${id}` },
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

/**
 * Item-code id-maps per itemType (PITFALLS #21 — itemId is a plain column).
 * pcs items live in the STYLE master and their "code" is styleNo.
 */
export async function buildItemCodeMaps(
  byType: Record<string, Set<string>>,
): Promise<Record<string, Map<string, string>>> {
  const codeMaps: Record<string, Map<string, string>> = {}
  for (const [t, ids] of Object.entries(byType)) {
    if (!ids.size) continue
    if (t === 'pcs') {
      const items = await db.style.findMany({ where: { id: { in: [...ids] } }, select: { id: true, styleNo: true } })
      codeMaps[t] = new Map(items.map((i) => [i.id, i.styleNo]))
    } else {
      const model = (db as any)[t]
      if (!model) continue
      const items = await model.findMany({ where: { id: { in: [...ids] } }, select: { id: true, code: true } })
      codeMaps[t] = new Map(items.map((i: { id: string; code: string }) => [i.id, i.code]))
    }
  }
  return codeMaps
}

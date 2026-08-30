/**
 * Shared register read services — SPEC-M4 §4 (frozen types).
 * The read-side twin of ADR-001: the SERVICE owns the query, the joins, the
 * relation-less-FK id-maps (PITFALLS #21) and the totals. The register screen
 * calls it with parsed searchParams; the agent tool calls it with its args.
 * Never fork a query — extend the service (additive).
 */

export interface RegisterQuery {
  from?: Date
  to?: Date
  party?: string // party code (services resolve → id)
  order?: string // orderNo
  godown?: string // godown code
  itemType?: string
  status?: string
  variant?: string
  q?: string
  /** CHAT-12 (Phase-6B Batch 2) — buyer id scope for the order register
   * (the agent's list_orders buyerId filter resolves to this). */
  buyerId?: string
  limit: number
  page: number
}

export interface RegisterRow {
  id: string
  /** W2 drill-down href — computed by the service (it owns doc resolution). */
  href?: string | null
  [key: string]: unknown
}

export interface RegisterTotal {
  label: string
  value: number | string
}

export interface RegisterResult {
  rows: RegisterRow[]
  totals?: RegisterTotal[]
  /** one-line summary above the table */
  summary: string
  /** total matching rows (for pagination "rows X–Y of Z") */
  count: number
}

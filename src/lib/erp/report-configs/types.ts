/**
 * ReportConfig frozen types — SPEC-M6 §4. PURE DATA (no functions, no db
 * imports — like register-configs): filters/columns REUSE the register types
 * verbatim so the filter bar + engine rendering are shared. A report adds
 * pack membership + preset defaults over the same query layer.
 */
import type { RegisterFilter, RegisterColumn } from '../register-configs/types'

export type ReportPackId =
  | 'order'
  | 'production'
  | 'inventory'
  | 'accounts'
  | 'costing-hr'
  | 'quality'

export interface ReportPack {
  id: ReportPackId
  label: string
  description: string
}

export interface ReportConfig {
  slug: string
  title: string
  pack: ReportPackId
  description?: string
  /** param form — the same searchParams keys registers use (§9) */
  filters: RegisterFilter[]
  columns: RegisterColumn[]
  /** agent door (render_report always works; this names the READ tool when a
   * register tool exists — the config contract test asserts it exists) */
  agentTools: string[]
  /** W5(b) seed — active filters appended at runtime */
  askPrompt: string
  emptyMessage?: string
  defaultLimit?: number
  /** preset searchParams applied when the runner opens bare (shareable URL
   * still overrides) */
  defaultParams?: Record<string, string>
}

export const REPORT_PACKS: ReportPack[] = [
  { id: 'order', label: 'Order Pack', description: 'Orders, samples, despatch & packing' },
  { id: 'production', label: 'Production Pack', description: 'Output, lines, rejections, operations' },
  { id: 'inventory', label: 'Inventory Pack', description: 'Stock, lots, movements' },
  { id: 'accounts', label: 'Accounts Pack', description: 'Bills, ledgers, outstanding, GST' },
  { id: 'costing-hr', label: 'Costing & HR Pack', description: 'P&L, budgets, wages, expenses' },
  { id: 'quality', label: 'Quality Pack', description: 'Lab tests, approval audit' },
]

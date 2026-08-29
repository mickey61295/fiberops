/**
 * RegisterConfig frozen types — SPEC-M4 §4. PURE DATA (no functions, no db
 * imports — like master-configs): trivially testable, no serializable-subset
 * dance (the engine is a server component).
 */

export type RegisterFilterType =
  | 'dateRange'
  | 'party'
  | 'order'
  | 'godown'
  | 'itemType'
  | 'status'
  | 'select'
  | 'text'

export interface RegisterFilter {
  /** searchParams key: from|to|party|order|godown|itemType|status|variant|q */
  key: string
  label: string
  type: RegisterFilterType
  /** for itemType/status/select */
  options?: { value: string; label: string }[]
  placeholder?: string
  /** SPEC-M19 §1-A: applied when the searchParam is ABSENT — the day-book's
   *  home value (explicit URL params always win). Selects with a preset hide
   *  the "All" option: a material day-book is always type-scoped. */
  preset?: string
}

export interface RegisterColumn {
  /** row key ('orderNo', 'inKgs', 'billAmount'…) */
  name: string
  label: string
  align?: 'left' | 'right'
  /** doc numbers render font-mono */
  mono?: boolean
  format?: 'date' | 'inr' | 'qty' | 'int' | 'badge'
}

export interface RegisterConfig {
  slug: string
  title: string
  description?: string
  filters: RegisterFilter[]
  columns: RegisterColumn[]
  /** chips on the screen + tool-door proof (must exist in the tools registry) */
  agentTools: string[]
  /** W5(b) seed — active filters are appended at runtime */
  askPrompt: string
  emptyMessage?: string
  defaultLimit?: number
}

/** Keys a config's filters may declare (SPEC-M4 §4 frozen set). */
export const REGISTER_FILTER_KEYS = [
  'from',
  'to',
  'party',
  'order',
  'godown',
  'itemType',
  'status',
  'variant',
  'q',
] as const

/** Column formats the engine knows how to render. */
export const REGISTER_COLUMN_FORMATS = ['date', 'inr', 'qty', 'int', 'badge'] as const

// SPEC-M2 §4 — frozen types for the MasterTable archetype.
// Configs are PURE DATA (no functions, no zod) — serializable, importable
// from server, client, tools, and tests.

// 'list' = comma-separated values in the form, string[] in the generated tool
// schema (SPEC-M2 ERRATUM 1 — used only by size-group.sizes)
export type MasterFieldType = 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'textarea' | 'list'

export type MasterCategory = 'commercial' | 'product' | 'org' | 'admin'

export interface MasterField {
  /** input name — scalar Prisma field, or FK input (buyerCode, uomCode, deptCode…) */
  name: string
  label: string
  type: MasterFieldType
  required?: boolean
  /** select options */
  options?: { value: string; label: string }[]
  defaultValue?: string | number | boolean
  placeholder?: string
  /** LLM-facing text → zod .describe() in the generated tool schema */
  description?: string
  /** config slug referenced (FK) — resolved by its codeField first, then titleField */
  refEntity?: string
  /** true → missing ref record is auto-created (SPEC-M2 ERRATUM 2 — fabric.diaValue only) */
  refCreateOnFly?: boolean
  min?: number
  max?: number
}

export interface MasterListColumn {
  /** flattened row field (refs resolved server-side to *Name / *Value) */
  field: string
  label: string
  /** codes → font-mono */
  mono?: boolean
  /** right-align numerics */
  numeric?: boolean
  /** future W2 link target (M3); plain text in M2 */
  refEntity?: string
}

export interface MasterConfig {
  /** /masters/<slug> */
  slug: string
  /** canonical singular key */
  entity: string
  /** plural screen label ('Parties') */
  label: string
  /** 'Party' */
  singular: string
  /** Prisma delegate: 'party' | 'uOM' | 'finYear' | 'govtHoliday' … (first letter lowercased MODEL name) */
  delegate: string
  /** Prisma model name: 'Party' | 'UOM' … */
  model: string
  category: MasterCategory
  /** unique business key ('code' | 'styleNo' | 'lotNo' | 'value' | 'name') */
  codeField?: string
  /** auto-assign prefix when set AND code omitted/taken */
  codePrefix?: string
  codePad?: number
  /** tool-side identifier for update (defaults codeField || 'name') */
  updateKeyField?: string
  titleField: string
  /** flattened fields searched client-side */
  searchFields: string[]
  defaultSort: { field: string; dir: 'asc' | 'desc' }
  listColumns: MasterListColumn[]
  /** create/edit form AND generated tool schema */
  fields: MasterField[]
  createTool: string
  updateTool: string
  listTool: string
  legacyForms: string[]
  notes?: string
}

/** flattened display record: { id, …scalars, buyerName?, uomName?, deptName?, partyName?, diaValue? } */
export type MasterRow = Record<string, unknown> & { id: string }

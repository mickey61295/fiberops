/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §7 — frozen types for the DocScreen archetype, mirroring
// master-configs/types.ts conventions. Configs drive ONE engine
// (components/archetypes/doc-screen.tsx); the SERVICE (src/lib/erp/posting/)
// owns ALL business logic (ADR-001 at transaction scale).
//
// SPEC-M3 ERRATUM (Wave B, documented per the SPEC-M2 erratum precedent):
// 1. DocField/DocLineField gain optional `pickerValueField` — the master record
//    field the W4 picker emits. Defaults to the master config's
//    codeField ?? titleField. Needed because planOrder resolves colour/size by
//    NAME (input keys colourName/sizeName) while buyer/style resolve by code.
// 2. DocConfig gains `schema` (the EXACT shared zod schema from
//    src/lib/erp/schemas/<op>.ts) so the generic form server action can
//    safeParse the coerced payload (§6: "form action coerces FormData → JSON →
//    schema.safeParse"). Server-only field.
// 3. `DocScreenConfig` = DocConfig minus {service, schema} — the serializable
//    subset passed to the CLIENT engine. Functions cannot cross the RSC
//    boundary; the client calls server actions with the slug instead.
// SPEC-M3 ERRATUM (Wave C):
// 4. `numberPrefix`/`numberField` are OPTIONAL — production/rework entries
//    carry no document number (bundleNo is the reference, never auto-assigned)
//    and jobwork-in references an EXISTING dcNo. The engine hides the
//    "<prefix>#### auto if blank" hint when numberPrefix is absent.
// 5. DocLineField gains optional `pickerFrom` — a sibling line-cell name whose
//    VALUE is the master slug for this row's picker (PO lines: itemCode's
//    picker is yarn|fabric|accessory per the row's itemType cell). Falls back
//    to a plain text input until the sibling cell is set.
import type { z } from 'zod'
import type { DocPlanResult } from '../posting/types'

export type DocFieldType = 'text' | 'number' | 'date' | 'select' | 'picker' | 'textarea' | 'readonly'

export interface DocField {
  /** service input key (buyerCode, deliveryDate…) */
  name: string
  label: string
  type: DocFieldType
  required?: boolean
  /** master slug for type 'picker' (W4): 'buyer' | 'style' | … */
  picker?: string
  /** ERRATUM 1 — master record field the picker emits (default: codeField ?? titleField) */
  pickerValueField?: string
  options?: { value: string; label: string }[]
  readOnlyIn?: ('view')[]
  /** header grid width */
  colSpan?: 1 | 2
}

export interface DocLineField {
  name: string
  label: string
  type: DocFieldType
  picker?: string
  /** ERRATUM 1 */
  pickerValueField?: string
  /** ERRATUM 5 (Wave C) — sibling line-cell name whose value IS the master slug */
  pickerFrom?: string
  required?: boolean
  /** ERRATUM 5 companion (Wave C) — select options for line cells (PO itemType) */
  options?: { value: string; label: string }[]
}

export interface DocConfig {
  /** 'order' | 'grn' | … (matches service key) */
  docType: string
  /** route slug segment */
  slug: string
  title: string
  /** 'SO-' — OPTIONAL (ERRATUM 4, Wave C): absent = no auto-number hint */
  numberPrefix?: string
  /** 'orderNo' — OPTIONAL (ERRATUM 4, Wave C) */
  numberField?: string
  /** 1..15 (W1 highlight) */
  chainStage?: number
  /** ERRATUM 2 — the EXACT shared zod schema (schemas/<op>.ts); server-only */
  schema: z.ZodTypeAny
  service: {
    plan: (input: unknown) => Promise<DocPlanResult>
  }
  headerFields: DocField[]
  /** line grid editor when present */
  lineFields?: DocLineField[]
  /** input key for lines[] ('lines' | 'items') */
  linesKey?: string
  /** recent-docs table */
  listColumns: { name: string; label: string; align?: 'left' | 'right' }[]
  /** default 20 */
  recentCount?: number
  /** chips on the screen */
  agentTools: string[]
}

/** ERRATUM 3 — serializable client subset (functions cannot cross RSC boundary). */
export type DocScreenConfig = Omit<DocConfig, 'schema' | 'service'>

/** A flattened recent-docs row for the New-mode table (server-rendered). */
export type DocListRow = Record<string, unknown> & { id: string }

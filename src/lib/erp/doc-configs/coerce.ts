// SPEC-M3 §6 — the form door's coercion step: client form state (all strings)
// → typed service input, driven by the DocConfig fields. The result is then
// safeParse'd by the config's shared zod schema (the EXACT agent contract).
// Mirrors the agent-side parse-with-coercion intent: both doors feed the SAME
// schema before the service sees anything.

export interface DocFormPayload {
  /** header field values — all strings (HTML inputs) */
  header: Record<string, string>
  /** line rows — all strings (cells keyed by lineField.name) */
  lines?: Array<Record<string, string>>
}

/** Coerce one string cell by field type. Empty → undefined (dropped). */
function coerceCell(type: string, raw: string | undefined): unknown {
  if (raw === undefined) return undefined
  const v = raw.trim()
  if (v === '') return undefined
  if (type === 'number') {
    const n = Number(v)
    return Number.isNaN(n) ? v : n // let zod report a non-numeric string
  }
  return v
}

/**
 * Config-driven coercion for the generic doc server actions.
 * - numbers become numbers; empty strings are dropped (zod optionals stay
 *   optional; required-missing is reported by zod, not silently sent as '')
 * - dates stay strings (services own `new Date(...)` — PITFALLS #13)
 * - line rows where EVERY cell is empty are dropped (an accidental blank row
 *   must not fail validation as "Required")
 */
export function coerceDocInput(
  headerFields: Array<{ name: string; type: string }>,
  payload: DocFormPayload,
  linesKey = 'lines',
  lineFields: Array<{ name: string; type: string }> = [],
): Record<string, unknown> {
  const input: Record<string, unknown> = {}
  for (const f of headerFields) {
    if (f.type === 'readonly') continue
    const coerced = coerceCell(f.type, payload.header?.[f.name])
    if (coerced !== undefined) input[f.name] = coerced
  }
  if (lineFields.length > 0 && payload.lines) {
    const rows: Array<Record<string, unknown>> = []
    for (const row of payload.lines) {
      const coercedRow: Record<string, unknown> = {}
      for (const f of lineFields) {
        const c = coerceCell(f.type, row?.[f.name])
        if (c !== undefined) coercedRow[f.name] = c
      }
      if (Object.keys(coercedRow).length > 0) rows.push(coercedRow)
    }
    input[linesKey] = rows
  }
  return input
}

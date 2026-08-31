/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== ZOD VALIDATION WITH LLM TYPE COERCION ==============
// LLMs sometimes pass numbers as strings ("4.5") or booleans as "true".
// After a zod failure, patch only the flagged paths and re-validate.
// Shared by /api/agent (proposal step) AND /api/agent/approve (commit step)
// so a plan proposed with coerced args commits with the SAME coerced args.
//
// SPEC-M30 (QoL1 D-1): this module is the SINGLE source of the arg pipeline.
// normalizeArgs (moved here from the agent route's inline copy) unwraps
// stringified-JSON args FIRST; both doors call
//   normalizeArgs(raw) → parseWithCoercion(schema, normalized) → execute

/** Unwrap LLM habits: an arg passed as a JSON *string* ("{\"a\":1}") becomes
 * the object itself. Recursive; non-objects pass through untouched. */
export function normalizeArgs(args: any): any {
  if (args === null || typeof args !== 'object') return args
  const out: any = Array.isArray(args) ? [] : {}
  for (const [key, val] of Object.entries(args)) {
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          out[key] = JSON.parse(trimmed)
          continue
        } catch {}
      }
      out[key] = val
    } else if (typeof val === 'object') {
      out[key] = normalizeArgs(val)
    } else {
      out[key] = val
    }
  }
  return out
}

function setByPath(obj: any, path: (string | number)[], value: any) {
  let cur = obj
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i]
    cur = cur?.[k as any]
  }
  const last = path[path.length - 1]
  if (cur != null && last !== undefined) {
    ;(cur as any)[last as any] = value
  }
}

function getByPath(obj: any, path: (string | number)[]): any {
  let cur = obj
  for (const k of path) cur = cur?.[k as any]
  return cur
}

export function parseWithCoercion(schema: any, args: any): { ok: true; value: any } | { ok: false; error: any } {
  try {
    return { ok: true, value: schema.parse(args) }
  } catch (first: any) {
    const issues = first?.issues || []
    if (issues.length === 0) return { ok: false, error: first }
    let fixed: any
    try {
      fixed = JSON.parse(JSON.stringify(args))
    } catch {
      return { ok: false, error: first }
    }
    let applied = 0
    for (const issue of issues) {
      const path: (string | number)[] = issue.path || []
      if (path.length === 0) continue
      const current = getByPath(fixed, path)
      if (issue.code === 'invalid_type' && (issue.expected === 'number' || issue.expected === 'integer')) {
        if (typeof current === 'string' && current.trim() !== '' && Number.isFinite(Number(current))) {
          setByPath(fixed, path, Number(current))
          applied++
        }
      } else if (issue.code === 'invalid_type' && issue.expected === 'boolean') {
        if (current === 'true' || current === 'false') {
          setByPath(fixed, path, current === 'true')
          applied++
        }
      }
    }
    if (applied === 0) return { ok: false, error: first }
    try {
      return { ok: true, value: schema.parse(fixed) }
    } catch (second: any) {
      return { ok: false, error: second }
    }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== ZOD VALIDATION WITH LLM TYPE COERCION ==============
// LLMs sometimes pass numbers as strings ("4.5") or booleans as "true".
// After a zod failure, patch only the flagged paths and re-validate.
// Shared by /api/agent (proposal step) AND /api/agent/approve (commit step)
// so a plan proposed with coerced args commits with the SAME coerced args.

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

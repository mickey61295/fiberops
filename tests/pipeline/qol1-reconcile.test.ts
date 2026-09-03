/**
 * qol1-reconcile regression suite — SPEC-QoL1 (docs/CONTEXT/specs/SPEC-QoL1.md)
 * landed on the M39 line after the sixth parallel-session race. Of the survey's
 * four P1 correctness findings, M38/M39 had already closed D-3 (TOCTOU, better:
 * CHAT-06 turnId + drift-compare) and D-4/D-5 (HFX-16/14 narration + streaming).
 * This batch closes what remained: D-2 (malformed tool-call JSON killing the
 * SSE turn), D-1b (the approve door executing unvalidated args), the ghost tool
 * (prompt↔registry drift), and makes parse-with-coercion.ts the canonical
 * shared module again. Behavioral tests exercise the real coercion stack and
 * real registry schemas; route layers follow the hfx-batch0 / chat-batch2
 * source-contract pattern.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { normalizeArgs, parseWithCoercion } from '@/lib/agent/parse-with-coercion'
import { allTools, getTool } from '@/lib/agent/tools'
import { PROMPT_VERSION, SYSTEM_PROMPT } from '@/lib/agent/prompt'
import { ORDER_SCHEMA } from '@/lib/erp/schemas/order'

const read = (rel: string) => readFileSync(rel, 'utf8')

describe('D-1 — parse-with-coercion is the canonical shared module', () => {
  it('exports normalizeArgs + parseWithCoercion (the designed-for-both-doors home)', () => {
    // the module existed unused since M10-era while route.ts carried an inline
    // duplicate; the reconcile moves the stack back to its designed home
    const mod = read('src/lib/agent/parse-with-coercion.ts')
    expect(mod).toContain('export function normalizeArgs')
    expect(mod).toContain('export function parseWithCoercion')
  })

  it('the proposal door IMPORTS the module — no inline duplicate (source contract)', () => {
    const route = read('src/app/api/agent/route.ts')
    expect(route).toContain("import { normalizeArgs, parseWithCoercion } from '@/lib/agent/parse-with-coercion'")
    // the inline copies are gone: the only definitions live in the module
    expect(route).not.toMatch(/function normalizeArgs\(/)
    expect(route).not.toMatch(/function parseWithCoercion\(/)
  })

  it('the approve door IMPORTS the module too (source contract)', () => {
    const approve = read('src/app/api/agent/approve/route.ts')
    expect(approve).toContain("import { normalizeArgs, parseWithCoercion } from '@/lib/agent/parse-with-coercion'")
  })
})

describe('D-1b — the approve door validates BEFORE execute (behavioral + contract)', () => {
  it('parseWithCoercion accepts a real registry schema with coerced args (create_order qty/rate as strings)', () => {
    // the exact LLM mistake the coercion exists for: numbers as strings
    const args = {
      buyerCode: 'B-0001',
      styleNo: 'STY-1001',
      deliveryDate: '2026-11-15',
      lines: [{ colourName: 'Navy', sizeName: 'M', qty: '1000', rate: '240' }],
    }
    const parsed = parseWithCoercion(ORDER_SCHEMA, normalizeArgs(args))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value.lines[0].qty).toBe(1000)
      expect(parsed.value.lines[0].rate).toBe(240)
    }
  })

  it('unfixable args fail LOUDLY with zod issues (never reach execute)', () => {
    const parsed = parseWithCoercion(ORDER_SCHEMA, { buyerCode: 123, deliveryDate: 'x' })
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      const issues = parsed.error?.issues ?? []
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('approve route: the validation block sits between the tool guard and execute, 400 on invalid (source contract)', () => {
    const approve = read('src/app/api/agent/approve/route.ts')
    const guardPos = approve.indexOf("if (!t.isWrite) return Response.json")
    const validatePos = approve.indexOf('const coerced = parseWithCoercion(t.schema, normalizeArgs(effectiveArgs))')
    const executePos = approve.indexOf('await t.execute(coerced.value, actor)')
    expect(guardPos).toBeGreaterThan(-1)
    expect(validatePos).toBeGreaterThan(guardPos)
    expect(executePos).toBeGreaterThan(validatePos)
    // the door executes the COERCED value, never the raw effectiveArgs
    expect(approve).not.toContain('await t.execute(effectiveArgs, actor)')
  })
})

describe('D-2 — malformed tool-call JSON never kills the turn', () => {
  it('the route guards tc.function.arguments and feeds an error TOOL RESULT back (source contract)', () => {
    const route = read('src/app/api/agent/route.ts')
    // the guard wraps the parse…
    expect(route).toContain('args = normalizeArgs(JSON.parse(tc.function.arguments')
    expect(route).toContain('Malformed JSON arguments for')
    // …emits both panel events so the card flips instead of spinning…
    expect(route.match(/type: 'tool-call-start'/g)?.length).toBeGreaterThanOrEqual(2)
    expect(route.match(/type: 'tool-call-end'/g)?.length).toBeGreaterThanOrEqual(2)
    // …pushes a protocol-complete tool message (the model SEES the error)…
    expect(route).toContain('content: JSON.stringify({ error: parseError })')
    // …and continues the per-call loop instead of aborting the turn
    expect(route).not.toContain("const rawArgs = JSON.parse(tc.function.arguments || '{}')")
  })

  it('normalizeArgs unwraps nested JSON strings the model sometimes emits (behavioral)', () => {
    const out = normalizeArgs({
      line: '{"qty": 7}',
      arr: '[1, 2, 3]',
      nested: { inner: '{"ok": true}' },
      plain: 'just text { not json',
      n: 5,
    })
    expect(out.line).toEqual({ qty: 7 })
    expect(out.arr).toEqual([1, 2, 3])
    expect(out.nested.inner).toEqual({ ok: true })
    expect(out.plain).toBe('just text { not json')
    expect(out.n).toBe(5)
  })

  it('parseWithCoercion coercion matrix: numbers, booleans, and the unfixable (behavioral)', () => {
    const S = z.object({ qty: z.number(), flag: z.boolean(), name: z.string() })
    expect(parseWithCoercion(S, { qty: '4.5', flag: 'true', name: 'x' })).toEqual({
      ok: true,
      value: { qty: 4.5, flag: true, name: 'x' },
    })
    // empty-string numbers are NOT coerced ("" → 0 is the classic silent-zero bug)
    const bad = parseWithCoercion(S, { qty: '', flag: 'true', name: 'x' })
    expect(bad.ok).toBe(false)
    // non-numeric strings stay failures
    expect(parseWithCoercion(S, { qty: 'abc', flag: 'true', name: 'x' }).ok).toBe(false)
    // non-"true"/"false" booleans stay failures
    expect(parseWithCoercion(S, { qty: 1, flag: 'yes', name: 'x' }).ok).toBe(false)
  })
})

describe('D-15 — the ghost tool is gone (prompt↔registry sync)', () => {
  it('SYSTEM_PROMPT no longer mentions accept_supplier_bill (no registry tool by that name)', () => {
    expect(SYSTEM_PROMPT).not.toContain('accept_supplier_bill')
    expect(getTool('accept_supplier_bill')).toBeUndefined()
  })

  it('every tool named in the workflow line exists in the registry', () => {
    const line = SYSTEM_PROMPT.split('\n').find((l) => l.includes('Workflow & approvals'))
    expect(line).toBeTruthy()
    const names = (line!.match(/[a-z_]+(?=[,])/g) ?? []).filter((n) => n.length > 2)
    for (const n of names) {
      expect(getTool(n)).withContext(`prompt mentions '${n}' but the registry has no such tool`).toBeDefined()
    }
  })

  it("the qol_prompt_sync probe exists (the survey's drift detector)", () => {
    const src = read('scripts/qol_prompt_sync.mjs')
    expect(src).toContain('NOT in registry')
  })

  it('PROMPT_VERSION bumped for the semantic change (m<milestone>.<rev> scheme)', () => {
    expect(PROMPT_VERSION).toBe('m44-2026-09-03')
  })
})

describe('reconcile bookkeeping', () => {
  it('SPEC-QoL1 doc lives in the specs tree', () => {
    const doc = read('docs/CONTEXT/specs/SPEC-QoL1.md')
    expect(doc).toContain('SPEC-QoL1')
    expect(doc).toContain('D-1')
  })

  it('the registry count is unchanged by the reconcile (232 — no tools added/removed)', () => {
    expect(allTools.length).toBe(253) // M44 CST: +create/update/list_cost_component +get_order_cost // M43 PRG: +set_order_deliveries +correct_program_spec +propose_program_requirements // M42 INV: +create_stock_take +record_stock_counts +advance_stock_take (M39 JWL: +bill_jobwork +list_jobworker_statement)
  })
})

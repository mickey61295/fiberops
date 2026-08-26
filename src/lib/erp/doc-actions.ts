'use server'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SPEC-M3 §3/§10 — the form door's generic server actions. The mirror of the
 * docTool delegates in tools.ts: coerce → shared zod safeParse → the SAME
 * posting service plan/commit (ADR-001 at transaction scale — doc-parity
 * tests enforce the two doors stay identical).
 *
 * planDocAction returns the SERIALIZABLE plan (commit fn stripped) for the
 * DocScreen review step; commitDocAction re-runs plan + commit — the same
 * re-derivation the agent /api/agent/approve flow performs.
 */
import { revalidatePath } from 'next/cache'
import { getDocConfig } from '@/lib/erp/doc-configs'
import { coerceDocInput, type DocFormPayload } from '@/lib/erp/doc-configs/coerce'

export interface DocPlanView {
  text: string
  summary: string
  creates?: { table: string; data: Record<string, unknown> }[]
  updates?: { table: string; id: string; data: Record<string, unknown> }[]
  sideEffects: string[]
}

export type DocActionResult =
  | { ok: true; plan: DocPlanView }
  | { ok: false; errors: string[] }

export type DocCommitResult =
  | { ok: true; doc: any }
  | { ok: false; errors: string[] }

function zodErrors(issues: Array<{ path: Array<string | number>; message: string }>): string[] {
  return issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
}

async function runPlan(slug: string, payload: DocFormPayload): Promise<
  { ok: true; plan: any; config: { slug: string } } | { ok: false; errors: string[] }
> {
  const config = getDocConfig(slug)
  if (!config) return { ok: false, errors: ['Unknown document type'] }
  const coerced = coerceDocInput(config.headerFields, payload, config.linesKey, config.lineFields)
  const parsed = config.schema.safeParse(coerced)
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error.issues as any) }
  try {
    const plan = await config.service.plan(parsed.data)
    if (!plan.ok) return { ok: false, errors: [plan.error] }
    return { ok: true, plan, config }
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] }
  }
}

export async function planDocAction(slug: string, payload: DocFormPayload): Promise<DocActionResult> {
  const r = await runPlan(slug, payload)
  if (!r.ok) return r
  const { commit: _commit, ...view } = r.plan
  return { ok: true, plan: view as DocPlanView }
}

export async function commitDocAction(slug: string, payload: DocFormPayload): Promise<DocCommitResult> {
  const r = await runPlan(slug, payload)
  if (!r.ok) return r
  try {
    const doc = await r.plan.commit()
    // revalidate the screens that list this doc family (Wave B: order routes;
    // future slugs' routes are harmless no-ops — Next ignores unknown paths).
    // Guarded: revalidation must never fail a COMMIT that already succeeded
    // (also keeps the action callable from vitest, outside request scope).
    try {
      revalidatePath('/orders')
      revalidatePath('/orders/new')
      revalidatePath('/')
    } catch {
      /* outside a Next request scope (tests) — commit already durable */
    }
    return { ok: true, doc }
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] }
  }
}

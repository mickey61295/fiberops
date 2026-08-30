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
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'

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

/**
 * Slug → screens that list this doc family (Wave D: all 19 screens; the two
 * ledger-only inventory ops revalidate their New screens + the inventory
 * landing). revalidatePath on unknown paths is a harmless no-op in Next; the
 * guards keep this callable from vitest (outside a request scope).
 */
const SLUG_REVALIDATE: Record<string, string[]> = {
  order: ['/orders', '/orders/new'],
  program: ['/programs/new'],
  'purchase-order': ['/procurement/po', '/procurement'],
  grn: ['/procurement/grn', '/procurement'],
  'jobwork-out': ['/jobwork/order'],
  'jobwork-in': ['/jobwork/receipt', '/jobwork/order'],
  cut: ['/cutting/job-order', '/cutting'],
  'line-issue': ['/production/issue', '/production'],
  production: ['/production/entry', '/production'],
  rework: ['/production/rework', '/production/entry', '/production'],
  rejection: ['/pieces/rejection'],
  despatch: ['/pieces/despatch'],
  'courier-dc': ['/dispatch/courier', '/dispatch'],
  loading: ['/dispatch/loading', '/dispatch'],
  invoice: ['/accounts/invoice', '/accounts'],
  'debit-note': ['/accounts/debit-note', '/accounts'],
  payment: ['/accounts/payments', '/accounts'],
  journal: ['/accounts/journal', '/accounts'],
  'cost-sheet': ['/costing/cost-sheet', '/costing'],
  'stock-adjustment': ['/inventory/adjustment', '/inventory'],
  'godown-transfer': ['/inventory/transfer', '/inventory'],
  // M5 Wave A (SPEC-M5 §7-A)
  budget: ['/costing/budget', '/costing/budget-vs-actual', '/costing'],
  'commercial-invoice': ['/orders/commercial-invoice', '/orders', '/accounts/bills-register'],
  'local-invoice': ['/accounts/invoice/local', '/accounts/invoice', '/accounts'],
  'piece-jobwork-invoice': ['/accounts/invoice/piece', '/accounts/invoice', '/accounts'],
  'supplier-order': ['/procurement/supplier-orders', '/procurement/po', '/procurement'],
  // M5 Wave B (SPEC-M5 §7-B)
  'finished-goods': ['/pieces/finished-goods', '/production/entry', '/production'],
  'operation-entry': ['/production/operations', '/production/entry', '/production'],
  'bundle-barcode': ['/production/bundles', '/production/entry', '/production'],
  'panel-production': ['/cutting/panel-production', '/production/entry', '/cutting'],
  'panel-excess': ['/cutting/panel-excess', '/production/entry', '/cutting'],
  'panel-rej-rework': ['/cutting/panel-rework', '/pieces/rejection', '/cutting'],
  'fabric-rejection-return': ['/cutting/fab-rejection', '/pieces/rejection', '/cutting'],
  'pcs-shortage': ['/pieces/shortage', '/pieces/rejection', '/pieces/despatch'],
  'panel-cutting': ['/cutting/panel', '/cutting/job-order', '/cutting'],
  'line-transfer': ['/production/line-transfer', '/production/issue', '/production'],
  'jobwork-pcs-return': ['/jobwork/pcs-return', '/procurement/grn', '/jobwork'],
  'costing-input': ['/costing/input', '/costing/cost-sheet', '/costing'],
  'wage-payments': ['/hr/wage-payments', '/accounts/payments', '/hr'],
  // M5 Wave D (SPEC-M5 §7-D)
  sample: ['/orders/samples', '/orders'],
  'gate-entry': ['/dispatch/gate-entry', '/dispatch'],
  'gate-pass': ['/dispatch/gate-pass', '/dispatch'],
  'packing-list': ['/pieces/packing-list', '/pieces', '/orders'],
  'lab-test': ['/quality/lab-tests', '/quality'],
  expense: ['/costing/expenses', '/costing'],
  'roll-split': ['/inventory/rolls', '/inventory/lots', '/inventory'],
  'contract-allotment': ['/jobwork/contract', '/jobwork/order', '/jobwork'],
  'program-allotment': ['/programs/allotment', '/programs', '/production'],
  'production-bill': ['/accounts/production-bills', '/hr/wages', '/accounts'],
  // M6 Wave D (SPEC-M6 §7-D — process tail)
  'multi-process-grn': ['/procurement/grn/multi-process', '/procurement/grn', '/procurement'],
  'dc-return': ['/dispatch/dc-return', '/dispatch', '/procurement/grn'],
  'dc-entry': ['/dispatch/dc', '/dispatch'],
  'process-dc': ['/dispatch/dc/process', '/dispatch'],
  'pcs-transfer': ['/pieces/transfer', '/pieces', '/inventory'],
  'ready-to-cut': ['/cutting/ready-to-cut', '/cutting', '/inventory'],
  'opening-stock': ['/inventory/opening-stock', '/inventory'],
  'cutting-issue': ['/cutting/issue', '/cutting', '/production/issue'],
  'cutting-production': ['/cutting/production', '/cutting', '/production/entry'],
  'line-output': ['/production/line-output', '/production/entry', '/production'],
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

export async function commitDocAction(
  slug: string,
  payload: DocFormPayload,
  idempotencyKey?: string,
): Promise<DocCommitResult> {
  const r = await runPlan(slug, payload)
  if (!r.ok) return r
  try {
    // SPEC-M9 §9 M15 — the FORM DOOR audit choke point: runCommit executes the
    // plan's commit (still the ONLY write path) and records the AuditLog row.
    // Outside a request scope (vitest) the actor degrades to 'system'.
    // OPS-04 — idempotencyKey (minted client-side per reviewed plan, passed
    // through by DocScreen) makes the form double-submit post exactly once.
    const user = await getSessionUser().catch(() => null)
    const doc = await runCommit(r.plan, {
      actorName: user?.email ?? 'system',
      actorSource: user ? 'form' : 'system',
      slug,
      idempotencyKey,
    })
    // revalidate the screens that list this doc family (SLUG_REVALIDATE map —
    // Wave C: every screen is force-dynamic, so this is a Router-Cache hint).
    // Guarded: revalidation must never fail a COMMIT that already succeeded
    // (also keeps the action callable from vitest, outside request scope).
    try {
      for (const p of SLUG_REVALIDATE[slug] ?? ['/']) revalidatePath(p)
    } catch {
      /* outside a Next request scope (tests) — commit already durable */
    }
    return { ok: true, doc }
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] }
  }
}

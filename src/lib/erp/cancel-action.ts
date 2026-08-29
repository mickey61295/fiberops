'use server'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SPEC-M18 §4-C1 (Wave C) — the doc-view Cancel/Void door. Server actions that
 * ride the EXISTING update posting services (status transitions only — no new
 * write path, ADR-001 preserved):
 *   order           → planCancelOrder   (same service as the cancel_order tool)
 *   purchase-order  → planPoLifecycle cancel (same service as /procurement/po/close + cancel_purchase_order — guards: already-cancelled, receipts-received)
 *   invoice         → planCancelInvoice (same service as the cancel_invoice tool)
 *   program         → planCancelProgram (ledger net-zero guard unless forced — same service as /programs/cancel)
 *
 * Two-step like every plan door: planCancelDocView returns the SERIALIZABLE
 * plan (summary + sideEffects) for the confirm dialog; commitCancelDocView
 * re-runs plan + commit (the same re-derivation commitDocAction performs).
 */
import { revalidatePath } from 'next/cache'
import { planCancelOrder, planCancelInvoice } from './posting/cancel'
import { planPoLifecycle, planCancelProgram } from './posting/lifecycle'
import type { DocPlanResult } from './posting/types'

export interface CancelPlanView {
  summary: string
  sideEffects: string[]
}

export type CancelActionResult =
  | { ok: true; plan: CancelPlanView }
  | { ok: false; error: string }

export type CancelCommitResult =
  | { ok: true; summary: string }
  | { ok: false; error: string }

/** slugs the view door may cancel (the CLIENT-side copy lives in
 * doc-view-actions.tsx — 'use server' files export async functions only). */
const CANCEL_PLAN: Record<string, (docNo: string, reason: string) => Promise<DocPlanResult>> = {
  order: (docNo, reason) => planCancelOrder({ orderNo: docNo, reason: reason || undefined }),
  'purchase-order': (docNo, reason) => planPoLifecycle({ poNo: docNo, action: 'cancel', reason: reason || undefined }),
  invoice: (docNo, reason) => planCancelInvoice({ invoiceNo: docNo, reason: reason || undefined }),
  program: (docNo, reason) => planCancelProgram({ programNo: docNo, notes: reason || undefined }),
}

/** Screens revalidated after a committed cancel (registers that show status). */
const CANCEL_REVALIDATE: Record<string, string[]> = {
  order: ['/orders', '/orders/new', '/orders/status'],
  'purchase-order': ['/procurement/po', '/procurement', '/procurement/party-balance'],
  invoice: ['/accounts/invoice', '/accounts'],
  program: ['/programs', '/programs/new', '/programs/status'],
}

export async function planCancelDocView(slug: string, docNo: string): Promise<CancelActionResult> {
  const service = CANCEL_PLAN[slug]
  if (!service) return { ok: false, error: `Documents of type '${slug}' cannot be cancelled here` }
  const plan = await service(docNo, '')
  if (!plan.ok) return { ok: false, error: plan.error! }
  return { ok: true, plan: { summary: plan.summary, sideEffects: plan.sideEffects } }
}

export async function commitCancelDocView(slug: string, docNo: string, reason: string): Promise<CancelCommitResult> {
  const service = CANCEL_PLAN[slug]
  if (!service) return { ok: false, error: `Documents of type '${slug}' cannot be cancelled here` }
  const plan = await service(docNo, reason)
  if (!plan.ok) return { ok: false, error: plan.error! }
  try {
    await plan.commit()
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
  try {
    for (const p of CANCEL_REVALIDATE[slug] ?? []) revalidatePath(p)
  } catch {
    /* outside a Next request scope (tests) — commit already durable */
  }
  return { ok: true, summary: plan.summary }
}

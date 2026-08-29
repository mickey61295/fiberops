'use server'
/** SPEC-M6 §7-C-6 — form door for PO cancel/complete (same planPoLifecycle
 *  service as complete_purchase_order; cancel rides the SAME service the
 *  cancel_purchase_order tool uses — guards identical). */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { planPoLifecycle } from '@/lib/erp/posting/lifecycle'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export async function poLifecycleAction(fd: FormData): Promise<LifecycleActionResult> {
  const plan = await planPoLifecycle({
    poNo: String(fd.get('docNo') ?? '').trim(),
    action: String(fd.get('action') ?? 'complete') === 'cancel' ? 'cancel' : 'complete',
    reason: String(fd.get('reason') ?? '').trim() || undefined,
  })
  if (!plan.ok) return { ok: false, text: plan.error! }
  const _user = await getSessionUser().catch(() => null)
  await runCommit(plan, { actorName: _user?.email ?? 'system', actorSource: _user ? 'form' : 'system', action: 'close', entity: 'purchaseOrder' })
  revalidatePath('/procurement/po/close')
  revalidatePath('/procurement/po')
  revalidatePath('/procurement/party-balance')
  return { ok: true, text: `PO settled — ${plan.summary}` }
}

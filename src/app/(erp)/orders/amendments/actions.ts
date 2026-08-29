'use server'
/** SPEC-M6 §7-C-5 — form door for order amendments (same planOrderAmend service as update_order). */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { planOrderAmend } from '@/lib/erp/posting/lifecycle'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export async function amendOrderAction(fd: FormData): Promise<LifecycleActionResult> {
  const totalPcsRaw = String(fd.get('totalPcs') ?? '').trim()
  const plan = await planOrderAmend({
    orderNo: String(fd.get('docNo') ?? '').trim(),
    deliveryDate: String(fd.get('deliveryDate') ?? '').trim() || undefined,
    status: String(fd.get('status') ?? '').trim() || undefined,
    notes: String(fd.get('notes') ?? '').trim() || undefined,
    totalPcs: totalPcsRaw ? Number(totalPcsRaw) : undefined,
  })
  if (!plan.ok) return { ok: false, text: plan.error! }
  const _user = await getSessionUser().catch(() => null)
  await runCommit(plan, { actorName: _user?.email ?? 'system', actorSource: _user ? 'form' : 'system', action: 'amend', entity: 'order' })
  revalidatePath('/orders/amendments')
  revalidatePath('/orders')
  return { ok: true, text: `Order amended — ${plan.summary}` }
}

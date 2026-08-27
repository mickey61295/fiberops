'use server'
/** SPEC-M6 §7-C-6 — form door for close_order (same planCloseOrder service). */
import { revalidatePath } from 'next/cache'
import { planCloseOrder } from '@/lib/erp/posting/lifecycle'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export async function closeOrderAction(fd: FormData): Promise<LifecycleActionResult> {
  const plan = await planCloseOrder({
    orderNo: String(fd.get('docNo') ?? '').trim(),
    force: fd.get('force') === 'on',
    notes: String(fd.get('notes') ?? '').trim() || undefined,
  })
  if (!plan.ok) return { ok: false, text: plan.error! }
  await plan.commit()
  revalidatePath('/orders/close')
  revalidatePath('/orders')
  revalidatePath('/orders/register')
  return { ok: true, text: `Order closed — ${plan.summary}` }
}

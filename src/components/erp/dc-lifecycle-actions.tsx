'use client'

/**
 * SPEC-M41 PRC-05 — the DC view lifecycle row: LAD conversion (loading →
 * despatched) and Deliver (→ delivered, deliveredAt stamped). One two-step
 * button per available transition (the service guards regardless); the SAME
 * planDcTransition service as the deliver_dc agent tool (ADR-001).
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Truck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { dcTransitionAction } from '@/app/(erp)/pieces/despatch/[id]/actions'

export function DcLifecycleActions({ dcNo, status }: { dcNo: string; status: string }) {
  const [busy, setBusy] = useState<'despatched' | 'delivered' | null>(null)
  const router = useRouter()
  if (status === 'delivered' || status === 'draft') return null
  const run = async (to: 'despatched' | 'delivered') => {
    setBusy(to)
    try {
      const r = await dcTransitionAction(dcNo, to)
      if (!r.ok) toast.error(r.text)
      else {
        toast.success(r.text)
        router.refresh()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'transition failed')
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="flex items-center gap-2">
      {status === 'loading' && (
        <Button size="sm" variant="outline" disabled={busy != null} onClick={() => run('despatched')} data-testid="dc-convert-btn">
          {busy === 'despatched' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
          <span className="ml-1.5">Convert to despatch</span>
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={busy != null} onClick={() => run('delivered')} data-testid="dc-deliver-btn">
        {busy === 'delivered' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        <span className="ml-1.5">Mark delivered</span>
      </Button>
    </div>
  )
}

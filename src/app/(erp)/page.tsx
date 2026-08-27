'use client'

/**
 * Dashboard route (SPEC-M1 §9): re-homes the existing Dashboard view.
 * onNavigate maps legacy ViewKeys to real routes.
 */
import { useRouter } from 'next/navigation'
import { Dashboard } from '@/components/erp/dashboard'
import { VIEW_ROUTE, type ViewKey } from '@/components/erp/view-routes'

export default function DashboardPage() {
  const router = useRouter()
  return (
    <Dashboard
      onNavigate={(v: ViewKey) => router.push(VIEW_ROUTE[v] ?? '/')}
      kpiHref={(path: string) => router.push(path)}
    />
  )
}

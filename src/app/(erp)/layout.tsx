import { redirect } from 'next/navigation'
import { AppShell } from '@/components/erp/app-shell'
import { getSessionUser } from '@/lib/auth/current-user'

/**
 * ERP route-group layout (SPEC-M1 §6): every routed page renders inside the
 * registry-driven shell. The route group adds NO url segment.
 *
 * SPEC-M7 §3 (Wave A): the layout is the SECOND guard layer — middleware
 * verifies the cookie edge-side; here the user row is re-checked (deleted /
 * deactivated mid-session → /login) and threaded into the shell for the
 * topbar user chip + logout.
 */
export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</AppShell>
  )
}

/**
 * /login (SPEC-M7 §3) — the ONLY unauthenticated page (middleware matcher
 * excludes it). Server half: a valid session redirects straight into the app;
 * otherwise pick the form — FirstAdminForm while NO user has a password
 * (first-run bootstrap), LoginForm after that.
 */
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth/current-user'
import { LoginForm } from './login-form'
import { FirstAdminForm } from './first-admin-form'

export const dynamic = 'force-dynamic'

function sanitizeNext(raw: string | undefined): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw
  return '/'
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const nextUrl = sanitizeNext(next)

  const user = await getSessionUser()
  if (user) redirect(nextUrl)

  const passwordHolder = await db.user.findFirst({
    where: { passwordHash: { not: null } },
    select: { id: true },
  })

  // First-run hint: pre-fill the existing admin account (e.g. the M6-B master
  // row admin@fiberpro.local) so bootstrap sets ITS password instead of
  // accidentally creating a second admin.
  const existingAdmin = passwordHolder
    ? null
    : await db.user.findFirst({
        where: { role: 'admin' },
        orderBy: { createdAt: 'asc' },
        select: { email: true, name: true },
      })

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-11 w-11 rounded-lg bg-slate-900 text-white font-semibold text-lg mb-3">
            F
          </div>
          <h1 className="text-xl font-semibold text-slate-900">FiberOps ERP</h1>
          <p className="text-sm text-slate-500 mt-1">
            {passwordHolder ? 'Sign in to continue' : 'Set up the first administrator'}
          </p>
        </div>
        {passwordHolder ? (
          <LoginForm nextUrl={nextUrl} />
        ) : (
          <FirstAdminForm prefillEmail={existingAdmin?.email} prefillName={existingAdmin?.name} />
        )}
      </div>
    </div>
  )
}

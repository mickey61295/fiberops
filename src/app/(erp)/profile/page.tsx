/**
 * /profile (SPEC-M57) — the user's own account page (PRD FR-A1 scoped to
 * today per ADR-026: sessions/invites machinery is Batch 2). Server
 * component: the (erp) layout already guards the session; this reads the
 * full row (group + rights + lastLogin + member-since) ONCE and renders
 * three cards: identity (avatar + edit-name), security (change password —
 * the M18 dialog), preferences (voice/TTS — the panel's localStorage
 * truth). Utility page: no menu item (the /parity precedent), reachable
 * from the topbar chip.
 */
import Link from 'next/link'
import { KeyRound, ShieldCheck, SlidersHorizontal, UserRound } from 'lucide-react'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth/current-user'
import { MENU_GROUPS } from '@/lib/erp/menu-registry'
import { ChangePasswordButton } from '@/components/erp/change-password'
import { ProfileNameForm } from '@/components/erp/profile-name-form'
import { ProfileVoicePrefs } from '@/components/erp/profile-voice-prefs'

export const dynamic = 'force-dynamic'

const ist = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default async function ProfilePage() {
  const session = await getSessionUser()
  if (!session) return null // unreachable behind the layout guard; honest fallback

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      createdAt: true,
      lastLoginAt: true,
      active: true,
      userGroup: { select: { name: true, rights: true } },
    },
  })

  const initials = (session.name || session.email)
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const groupRights = Array.isArray(user?.userGroup?.rights) ? (user!.userGroup!.rights as string[]) : null
  const rightsLine =
    groupRights === null
      ? 'All menu groups (no group assigned — ADR-018 back-compat)'
      : groupRights.length === 0
        ? `All menu groups (group "${user?.userGroup?.name}", rights: all)`
        : `${groupRights.length} of ${MENU_GROUPS.length} menu groups (group "${user?.userGroup?.name}")`

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/dashboard" className="hover:text-slate-800 hover:underline">Home</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">My profile</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mt-1">My profile</h1>
        <p className="text-sm text-slate-500">Your account, password, and agent preferences.</p>
      </div>

      {/* identity */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg font-semibold shrink-0">
            {initials || '?'}
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <ProfileNameForm initialName={session.name} />
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap text-sm">
                <span className="text-slate-700">{session.email}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                  {session.role}
                </span>
                {!user?.active && (
                  <span className="text-[10px] uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                    deactivated
                  </span>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm border-t border-slate-100 pt-3">
              <div>
                <dt className="text-xs text-slate-400 flex items-center gap-1"><UserRound className="h-3 w-3" /> Member since</dt>
                <dd className="text-slate-700 mt-0.5">{ist(user?.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Menu access</dt>
                <dd className="text-slate-700 mt-0.5" title={rightsLine}>{rightsLine}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 flex items-center gap-1"><KeyRound className="h-3 w-3" /> Last login</dt>
                <dd className="text-slate-700 mt-0.5">{ist(user?.lastLoginAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* security */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <KeyRound className="h-4 w-4 text-slate-400" /> Password
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Change your own password (verify old → set new, min 8 chars). Your session stays signed in.
            </p>
          </div>
          <ChangePasswordButton />
        </div>
      </section>

      {/* preferences */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" /> Agent preferences
        </div>
        <p className="text-xs text-slate-500 mt-0.5 mb-3">
          These are the same settings the agent panel uses — changing them here changes them everywhere.
        </p>
        <ProfileVoicePrefs />
      </section>
    </div>
  )
}

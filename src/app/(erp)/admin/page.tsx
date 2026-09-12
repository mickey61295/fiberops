/**
 * /admin (SPEC-M59, ADR-026 Batch 1) — the admin hub (PRD FR-B1 scoped to
 * today): the front door for the SIX live admin surfaces, each with a real
 * health line from the DB, plus an honest "Phase-6 roadmap" strip for the
 * planned-but-unbuilt surfaces (roles/matrix, number series, FY close,
 * transaction controls, inventory locks, print templates, login audit) —
 * planned means planned, no fake links. This page also fixes a live
 * defect: four admin screens' breadcrumbs already linked /admin (a 404).
 * Rights: the masters-admin group gates it (the layout's group check —
 * same as /admin/users etc.); registered as menu item admin-hub.
 */
import Link from 'next/link'
import {
  Users, ShieldCheck, SlidersHorizontal, Flag, Building2, ScrollText,
  KeyRound, Hash, CalendarX2, Sliders, Lock, Printer, ClipboardList,
} from 'lucide-react'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** IST midnight of today (the audit "today" window). */
function istMidnight(): Date {
  const now = new Date()
  const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000)
  ist.setUTCHours(0, 0, 0, 0)
  return new Date(ist.getTime() - (5 * 60 + 30) * 60 * 1000)
}

export default async function AdminHubPage() {
  const [
    userCount, activeUsers, groupCount, optionCount, flagRowsOn, activeFinYear, auditToday,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { active: true } }),
    db.userGroup.count(),
    db.appOption.count(),
    db.appOption.count({ where: { key: { startsWith: 'flag:' } } }),
    db.finYear.findFirst({ where: { active: true }, select: { code: true } }),
    db.auditLog.count({ where: { createdAt: { gte: istMidnight() } } }),
  ])

  const cards = [
    {
      href: '/admin/users', icon: Users, title: 'Users & Groups',
      desc: 'Accounts, groups, passwords, activation',
      health: `${userCount} users · ${activeUsers} active · ${groupCount} groups`,
    },
    {
      href: '/admin/menu-rights', icon: ShieldCheck, title: 'Menu Rights',
      desc: 'Which menu groups each group can see',
      health: `${groupCount} groups · rights enforced at the layout layer`,
    },
    {
      href: '/admin/options', icon: SlidersHorizontal, title: 'Options & Settings',
      desc: 'AppOption master (print headers, godown default, backup target)',
      health: `${optionCount} option rows`,
    },
    {
      href: '/admin/settings', icon: Flag, title: 'Feature Flags',
      desc: 'The registry board — toggle with effect notes',
      health: `${flagRowsOn} flag rows set`,
    },
    {
      href: '/admin/company', icon: Building2, title: 'Company / FinYear',
      desc: 'Company card + financial years',
      health: activeFinYear ? `Active FY ${activeFinYear.code}` : 'No active financial year',
    },
    {
      href: '/admin/audit', icon: ScrollText, title: 'Audit Log',
      desc: 'Every committed write, all doors (agent + form)',
      health: `${auditToday} rows today`,
    },
  ]

  const planned = [
    { icon: KeyRound, label: 'Login audit' },
    { icon: Users, label: 'Roles + permission matrix' },
    { icon: Hash, label: 'Number series admin' },
    { icon: CalendarX2, label: 'FY close + period gates' },
    { icon: Sliders, label: 'Transaction controls' },
    { icon: Lock, label: 'Inventory locks' },
    { icon: Printer, label: 'Print template admin' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/masters" className="hover:text-slate-800 hover:underline">Masters &amp; Admin</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Admin Hub</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mt-1">Admin Hub</h1>
        <p className="text-sm text-slate-500">The front door to every admin surface — live health at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="admin-hub-cards">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors">
                <c.icon className="h-4 w-4 text-slate-500 group-hover:text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-800 group-hover:text-emerald-700">{c.title}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">{c.desc}</p>
            <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">{c.health}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <ClipboardList className="h-4 w-4 text-slate-400" /> Phase-6 roadmap
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Planned admin surfaces (PRD-PHASE-6 Modules A/B) — not built yet; each ships with its own milestone.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {planned.map((p) => (
            <span key={p.label} className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-md px-2 py-1" title="Planned (Phase-6)">
              <p.icon className="h-3 w-3" />
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

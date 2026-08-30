import { getSessionUser } from '@/lib/auth/current-user'
import { getDashboardSnapshot, roleProfile, TILE_REGISTRY } from '@/lib/erp/dashboard'
import { Dashboard2 } from '@/components/erp/dashboard-v2'

/**
 * Dashboard route — SPEC-M1 §9 (re-homed) → SPEC-M16 (Dashboard 2.0):
 * SERVER component. The session user's role drives the snapshot (tiles,
 * charts, recent lists) computed in lib/erp/dashboard.ts; the client surface
 * (tiles + customize + recharts) renders from plain serializable props.
 * 'home' is always allowed (ADR-018) — the dashboard ADAPTS to the role,
 * it is never denied.
 */
export default async function DashboardPage() {
  const user = await getSessionUser()
  const role = user?.role ?? 'admin'
  const profile = roleProfile(role)
  const snapshot = await getDashboardSnapshot(role)

  return (
    <Dashboard2
      snapshot={snapshot}
      charts={profile.charts}
      recentPicks={profile.recent}
      defaultTiles={profile.tiles}
      allTiles={TILE_REGISTRY.map(({ id, label }) => ({ id, label }))}
    />
  )
}

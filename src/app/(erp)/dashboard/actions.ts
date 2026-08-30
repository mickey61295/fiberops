'use server'

// SPEC-M16 §3.2 — the dashboard tile-layout save door. Session-guarded; a
// user may only save THEIR OWN role's layout (role mismatch → error object,
// not a redirect — this is a UI preference, not a security surface; the
// tiles themselves are read-only aggregates and the linked pages stay under
// the ADR-018 rights layers). NOT wired through the M15 audit executor: no
// domain write here (documented deviation, SPEC-M16 §3.2 — same class as
// login cookie writes).

import { getSessionUser } from '@/lib/auth/current-user'
import { saveRoleTiles, TILE_REGISTRY } from '@/lib/erp/dashboard'

export interface SaveTilesResult {
  ok: boolean
  error?: string
  tiles?: string[] | null
}

export async function saveDashboardTiles(role: string, tiles: string[] | null): Promise<SaveTilesResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Authentication required' }
  if (user.role !== role) return { ok: false, error: 'You can only customize your own role dashboard' }
  if (tiles !== null) {
    if (!Array.isArray(tiles) || tiles.length > TILE_REGISTRY.length) {
      return { ok: false, error: 'Invalid tile list' }
    }
    const valid = tiles.filter((id) => TILE_REGISTRY.some((t) => t.id === id))
    await saveRoleTiles(role, valid)
    return { ok: true, tiles: valid }
  }
  await saveRoleTiles(role, null) // reset to role defaults
  return { ok: true, tiles: null }
}

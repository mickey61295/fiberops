/**
 * SPEC-M7 Wave B — cookie fixture for scripts that hit the guarded HTTP APIs
 * (/api/erp, /api/agent, /api/agent/approve, /api/upload). The APIs return
 * 401 JSON without a session; this helper logs in through the real door
 * (POST /api/auth/login) and returns the fo_session cookie header value.
 *
 * Usage:
 *   import { login } from './lib/api-auth.mjs'
 *   const { cookie, user } = await login(BASE)
 *   fetch(`${BASE}/api/agent`, { headers: { Cookie: cookie, ... } })
 *
 * Requires the admin password to be seeded (npx tsx scripts/seed_admin.ts,
 * default admin@fiberpro.local / admin123 — override via env FIBERPRO_ADMIN_EMAIL /
 * FIBERPRO_ADMIN_PASSWORD).
 */
export async function login(
  base = 'http://localhost:3000',
  email = process.env.FIBERPRO_ADMIN_EMAIL ?? 'admin@fiberpro.local',
  password = process.env.FIBERPRO_ADMIN_PASSWORD ?? 'admin123',
) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error(
      `api-auth login failed (${res.status}) for ${email} — run: npx tsx scripts/seed_admin.ts`,
    )
  }
  // Set-Cookie: fo_session=<token>; Path=/; HttpOnly; SameSite=Lax
  const setCookie = res.headers.get('set-cookie') || ''
  const cookie = setCookie.split(';')[0].trim()
  if (!cookie.startsWith('fo_session=')) {
    throw new Error(`api-auth: no fo_session cookie in Set-Cookie: ${setCookie}`)
  }
  const body = await res.json().catch(() => ({}))
  return { cookie, user: body.user ?? null }
}

/** Convenience: headers object with the session cookie (spread into fetch). */
export async function authHeaders(base) {
  const { cookie } = await login(base)
  return { Cookie: cookie }
}

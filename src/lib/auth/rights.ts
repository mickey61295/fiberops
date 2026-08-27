/**
 * Menu-rights token + the shared allowed-groups rule (SPEC-M7 §4 Wave C) —
 * EDGE-SAFE, same discipline as session.ts: NO node:crypto, NO Prisma, NO db
 * imports (middleware imports this file). Web Crypto only.
 *
 * The fo_rights cookie mirrors the login-time {role, rights} snapshot so the
 * EDGE middleware can pre-filter routes without a db. It is signed with the
 * same AUTH_SECRET as fo_session. FRESH enforcement is layer 2 — the (erp)
 * layout re-derives allowed groups straight from the DB on every full load —
 * so a missing/stale fo_rights cookie can never GRANT access, and a stale
 * cookie merely delays a newly-granted menu until the next login (ADR-018).
 *
 * Token format: `b64url(JSON{r,g,e}).b64url(hmacSha256(payloadB64))`
 * Cookie: `fo_rights`, httpOnly, sameSite=lax, path=/, 7-day TTL.
 */
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const RIGHTS_COOKIE = 'fo_rights'
export const RIGHTS_TTL_SECONDS = 7 * 24 * 60 * 60 // mirrors the session cookie

/** Groups every logged-in user may reach regardless of rights (the dashboard
 *  is universal — also the safe redirect target, so deny-redirects can never
 *  loop). */
export const ALWAYS_ALLOWED_GROUPS = ['home']

function secretString(): string {
  return process.env.AUTH_SECRET || 'fiberops-dev-secret-change-me'
}

function b64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretString()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return b64url(new Uint8Array(sig))
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export type RightsInfo = { role: string; rights: string[] }

/** Serialize + sign the login-time rights snapshot. */
export async function signRightsToken(
  role: string,
  rights: string[],
  ttlSeconds: number = RIGHTS_TTL_SECONDS,
): Promise<string> {
  const payload = b64url(
    encoder.encode(JSON.stringify({ r: role, g: rights, e: Date.now() + ttlSeconds * 1000 })),
  )
  return `${payload}.${await sign(payload)}`
}

/** Verify a fo_rights cookie value → the snapshot, or null when
 *  invalid/tampered/expired (caller treats null as "no edge info" and falls
 *  through to the layout's fresh DB check). */
export async function verifyRightsToken(
  value: string | null | undefined,
): Promise<RightsInfo | null> {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sig] = parts
  if (!payloadB64 || !sig) return null
  if (!safeEqual(await sign(payloadB64), sig)) return null
  try {
    const parsed = JSON.parse(decoder.decode(fromB64url(payloadB64))) as {
      r?: unknown
      g?: unknown
      e?: unknown
    }
    if (typeof parsed.r !== 'string' || typeof parsed.e !== 'number') return null
    if (parsed.e <= Date.now()) return null
    if (!Array.isArray(parsed.g) || parsed.g.some((x) => typeof x !== 'string')) return null
    return { role: parsed.r, rights: parsed.g as string[] }
  } catch {
    return null
  }
}

/**
 * The ONE rights rule, shared by the edge middleware and the layout (so the
 * two layers can never disagree):
 *   - role 'admin'          → all groups (recovery hatch: admins can always
 *                             reach /admin/users to fix rights)
 *   - rights null/undefined → all groups (no group assigned / no cookie —
 *                             pre-Wave-C users keep full access, ADR-018)
 *   - rights []             → all groups (the [] = all matrix convention)
 *   - otherwise             → the listed ids ∩ valid ids, always ∪ {'home'}
 */
export function computeAllowedGroupIds(opts: {
  role?: string | null
  rights?: string[] | null
  allGroupIds: string[]
}): Set<string> {
  const { role, rights, allGroupIds } = opts
  const all = new Set(allGroupIds)
  if (!rights || rights.length === 0 || role === 'admin') return all
  const allowed = new Set(rights.filter((id) => all.has(id)))
  for (const id of ALWAYS_ALLOWED_GROUPS) if (all.has(id)) allowed.add(id)
  return allowed
}

export type LandingLikeGroup = { id: string; order: number; landingRoute: string }

/** First (lowest-order) allowed group's landing route — the deny-redirect
 *  target. 'home' is always allowed and has order 1, so this resolves to '/'
 *  in practice; the fallback keeps it total. */
export function firstAllowedLandingRoute(
  allowed: Set<string>,
  groups: LandingLikeGroup[],
): string {
  const sorted = [...groups].sort((a, b) => a.order - b.order)
  for (const g of sorted) if (allowed.has(g.id)) return g.landingRoute
  return '/'
}

/**
 * Session token (SPEC-M7 §3) — stateless HMAC-SHA256 signed cookie, EDGE-SAFE:
 * NO node:crypto, NO Prisma, NO db imports (middleware runs on the edge runtime
 * and imports this file). Web Crypto (`globalThis.crypto.subtle`) is available
 * in both the Edge and the Node runtimes.
 *
 * Token format: `b64url(userId).expMs.b64url(hmacSha256(userId + '.' + expMs))`
 * Cookie: `fo_session`, httpOnly, sameSite=lax, path=/, 7-day TTL.
 *
 * AUTH_SECRET comes from env; the dev fallback keeps local/vitest deterministic
 * (documented in ADR-017 — single-tenant dev app, set AUTH_SECRET at deployment).
 */
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const SESSION_COOKIE = 'fo_session'
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function secretString(): string {
  return process.env.AUTH_SECRET || 'fiberops-dev-secret-change-me'
}

function b64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  // btoa is available in Edge + Node 18+
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

/** Constant-time string compare (length leak is acceptable: both are b64url of fixed-width HMAC). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createSessionToken(userId: string, ttlSeconds: number = SESSION_TTL_SECONDS): Promise<string> {
  const expMs = Date.now() + ttlSeconds * 1000
  const payload = `${b64url(encoder.encode(userId))}.${expMs}`
  return `${payload}.${await sign(payload)}`
}

/** Verify a session token → the userId, or null when invalid/tampered/expired. */
export async function verifySessionToken(token: string | null | undefined): Promise<string | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [uidB64, expStr, sig] = parts
  if (!/^\d+$/.test(expStr) || !uidB64 || !sig) return null
  const expMs = Number(expStr)
  if (expMs <= Date.now()) return null
  const expected = await sign(`${uidB64}.${expStr}`)
  if (!safeEqual(expected, sig)) return null
  try {
    const userId = decoder.decode(fromB64url(uidB64))
    return userId.length > 0 ? userId : null
  } catch {
    return null
  }
}

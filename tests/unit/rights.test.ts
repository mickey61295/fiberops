/**
 * SPEC-M7 Wave C — menu-rights unit tests (no HTTP).
 *
 * rights.ts (edge-safe lib):
 *   - sign/verify round-trip; tampered payload / tampered sig / garbage /
 *     wrong arity / expired / malformed JSON / non-string rights entries
 *   - constants frozen (fo_rights cookie name, 7-day TTL)
 *   - computeAllowedGroupIds: admin bypass, null/[] = all, subset ∩ valid ids
 *     ∪ {'home'}, unknown ids dropped, home always in
 *   - firstAllowedLandingRoute: lowest-order allowed group first (home → '/')
 *   - edge purity: the module source never imports node:crypto or Prisma
 *
 * The middleware + layout composition over these primitives is covered by
 * scripts/route_smoke_m7c.sh (live redirect matrix).
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createHmac } from 'node:crypto'
import {
  RIGHTS_COOKIE,
  RIGHTS_TTL_SECONDS,
  ALWAYS_ALLOWED_GROUPS,
  signRightsToken,
  verifyRightsToken,
  computeAllowedGroupIds,
  firstAllowedLandingRoute,
} from '@/lib/auth/rights'

const ALL = ['home', 'orders', 'programs', 'accounts', 'production', 'masters-admin']

/** Craft a token whose payload is ARBITRARY but correctly signed (mirrors the
 *  lib's HMAC with the same secret) — the only way to reach verify's JSON
 *  guards past the signature check. */
function signedToken(payloadObj: unknown): string {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url')
  const sig = createHmac('sha256', process.env.AUTH_SECRET || 'fiberops-dev-secret-change-me')
    .update(payload)
    .digest('base64url')
  return `${payload}.${sig}`
}

describe('rights token (SPEC-M7 Wave C)', () => {
  it('round-trips role + rights', async () => {
    const token = await signRightsToken('merchandiser', ['orders', 'production'])
    const info = await verifyRightsToken(token)
    expect(info).toEqual({ role: 'merchandiser', rights: ['orders', 'production'] })
  })

  it('round-trips an empty rights list (the [] = all snapshot)', async () => {
    const info = await verifyRightsToken(await signRightsToken('admin', []))
    expect(info).toEqual({ role: 'admin', rights: [] })
  })

  it('tampered signature → null', async () => {
    const token = await signRightsToken('hr', ['hr'])
    const parts = token.split('.')
    const forged = `${parts[0]}.${'A'.repeat(parts[1].length)}`
    expect(await verifyRightsToken(forged)).toBeNull()
  })

  it('tampered payload (sig no longer matches) → null', async () => {
    const token = await signRightsToken('hr', ['hr'])
    const parts = token.split('.')
    // flip the payload to a different valid b64url blob
    expect(await verifyRightsToken(`eA.${parts[1]}`)).toBeNull()
  })

  it('garbage / wrong arity → null', async () => {
    expect(await verifyRightsToken('not-a-token')).toBeNull()
    expect(await verifyRightsToken('a.b.c')).toBeNull()
    expect(await verifyRightsToken('')).toBeNull()
    expect(await verifyRightsToken(null)).toBeNull()
    expect(await verifyRightsToken(undefined)).toBeNull()
  })

  it('expired snapshot → null', async () => {
    const token = await signRightsToken('hr', ['hr'], -60)
    expect(await verifyRightsToken(token)).toBeNull()
  })

  it('payload with valid sig but non-JSON body → null', async () => {
    const payload = Buffer.from('not json at all').toString('base64url')
    const sig = createHmac('sha256', process.env.AUTH_SECRET || 'fiberops-dev-secret-change-me')
      .update(payload)
      .digest('base64url')
    expect(await verifyRightsToken(`${payload}.${sig}`)).toBeNull()
  })

  it('non-string entries in the rights array → null', async () => {
    const exp = Date.now() + 60_000
    expect(await verifyRightsToken(signedToken({ r: 'hr', g: ['orders', 42], e: exp }))).toBeNull()
  })

  it('wrong payload shape (role/exp not strings+number) → null', async () => {
    const exp = Date.now() + 60_000
    expect(await verifyRightsToken(signedToken({ g: ['orders'], e: exp }))).toBeNull() // r missing
    expect(await verifyRightsToken(signedToken({ r: 'hr', g: ['orders'] }))).toBeNull() // e missing
    expect(await verifyRightsToken(signedToken({ r: 7, g: ['orders'], e: exp }))).toBeNull() // r not a string
    expect(await verifyRightsToken(signedToken({ r: 'hr', g: 'orders', e: exp }))).toBeNull() // g not an array
  })

  it('constants frozen: cookie name + TTL mirror the session cookie', () => {
    expect(RIGHTS_COOKIE).toBe('fo_rights')
    expect(RIGHTS_TTL_SECONDS).toBe(7 * 24 * 60 * 60)
    expect(ALWAYS_ALLOWED_GROUPS).toEqual(['home'])
  })
})

describe('computeAllowedGroupIds — the ONE rights rule (ADR-018)', () => {
  it('admin role → all groups (recovery hatch)', () => {
    const allowed = computeAllowedGroupIds({ role: 'admin', rights: ['orders'], allGroupIds: ALL })
    expect([...allowed].sort()).toEqual([...ALL].sort())
  })

  it('rights null (no group assigned / no cookie) → all (back-compat)', () => {
    expect([...computeAllowedGroupIds({ role: 'merchandiser', rights: null, allGroupIds: ALL })].sort())
      .toEqual([...ALL].sort())
    expect([...computeAllowedGroupIds({ role: 'merchandiser', rights: undefined, allGroupIds: ALL })].sort())
      .toEqual([...ALL].sort())
  })

  it('rights [] → all (the matrix [] = all convention)', () => {
    const allowed = computeAllowedGroupIds({ role: 'merchandiser', rights: [], allGroupIds: ALL })
    expect([...allowed].sort()).toEqual([...ALL].sort())
  })

  it('subset → the listed ids, unknown ids dropped, home always added', () => {
    const allowed = computeAllowedGroupIds({
      role: 'merchandiser',
      rights: ['orders', 'production', 'does-not-exist'],
      allGroupIds: ALL,
    })
    expect([...allowed].sort()).toEqual(['home', 'orders', 'production'])
  })

  it('home is included even when the rights list omits it', () => {
    const allowed = computeAllowedGroupIds({ role: 'storekeeper', rights: ['production'], allGroupIds: ALL })
    expect(allowed.has('home')).toBe(true)
    expect(allowed.has('production')).toBe(true)
    expect(allowed.has('accounts')).toBe(false)
  })

  it('a rights list of only unknown ids still yields home (no total lockout)', () => {
    const allowed = computeAllowedGroupIds({ role: 'hr', rights: ['nope'], allGroupIds: ALL })
    expect([...allowed]).toEqual(['home'])
  })
})

describe('firstAllowedLandingRoute — the deny-redirect target', () => {
  const GROUPS = [
    { id: 'home', order: 1, landingRoute: '/' },
    { id: 'orders', order: 2, landingRoute: '/orders' },
    { id: 'accounts', order: 11, landingRoute: '/accounts' },
  ]

  it('home (order 1, always allowed) wins → "/" (deny-redirects can never loop)', () => {
    const allowed = computeAllowedGroupIds({ role: 'hr', rights: ['orders'], allGroupIds: GROUPS.map((g) => g.id) })
    expect(firstAllowedLandingRoute(allowed, GROUPS)).toBe('/')
  })

  it('respects group order when home is somehow absent', () => {
    expect(firstAllowedLandingRoute(new Set(['accounts', 'orders']), GROUPS)).toBe('/orders')
  })

  it('fallback "/" when nothing is allowed (total function)', () => {
    expect(firstAllowedLandingRoute(new Set<string>(), GROUPS)).toBe('/')
  })
})

describe('rights.ts edge purity (SPEC-M7 §3 discipline)', () => {
  it('module source imports neither node:crypto nor Prisma', async () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../src/lib/auth/rights.ts'), 'utf8')
    // match IMPORT SYNTAX only (comments may mention node:crypto by name)
    expect(src).not.toMatch(/from\s+['"]node:crypto['"]/)
    expect(src).not.toMatch(/require\(['"]node:crypto['"]\)/)
    expect(src).not.toMatch(/from\s+['"]@prisma\/client['"]/)
    expect(src).not.toMatch(/from\s+['"].*db['"]/)
  })
})

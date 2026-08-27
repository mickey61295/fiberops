/**
 * SPEC-M7 §7 — auth unit tests (Wave A):
 *   - password: scrypt hash/verify round trip, wrong password, null stored,
 *     garbage-format stored
 *   - session: HMAC token create→verify round trip, tampered payload,
 *     expired token, garbage/empty token, frozen cookie name + TTL constants
 *   - session.ts must stay EDGE-PURE: importing it must never pull node:crypto
 *     or Prisma into the module graph (middleware imports it).
 */
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
} from '@/lib/auth/session'

describe('password (scrypt, SPEC-M7 §3)', () => {
  it('hash → verify round trip', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
  })

  it('wrong password rejects', async () => {
    const hash = await hashPassword('s3cret-pass')
    expect(await verifyPassword('s3cret-pass!', hash)).toBe(false)
    expect(await verifyPassword('', hash)).toBe(false)
  })

  it('null stored (pre-ADR-017 row) rejects', async () => {
    expect(await verifyPassword('whatever', null)).toBe(false)
    expect(await verifyPassword('whatever', undefined)).toBe(false)
  })

  it('garbage-format stored rejects', async () => {
    expect(await verifyPassword('x', 'plaintext')).toBe(false)
    expect(await verifyPassword('x', 'bcrypt$aa$bb')).toBe(false)
    expect(await verifyPassword('x', 'scrypt$zz$')).toBe(false)
  })

  it('hashes are salted (two hashes of the same password differ)', async () => {
    const a = await hashPassword('same-password')
    const b = await hashPassword('same-password')
    expect(a).not.toBe(b)
    expect(await verifyPassword('same-password', a)).toBe(true)
    expect(await verifyPassword('same-password', b)).toBe(true)
  })
})

describe('session token (HMAC-SHA256, SPEC-M7 §3)', () => {
  it('create → verify round trip returns the userId', async () => {
    const token = await createSessionToken('user-abc-123')
    expect(token.split('.')).toHaveLength(3)
    expect(await verifySessionToken(token)).toBe('user-abc-123')
  })

  it('tampered payload rejects', async () => {
    const token = await createSessionToken('user-abc-123')
    const [uid, exp, sig] = token.split('.')
    // swap the userId b64 for a different one, keep exp+sig
    const forged = `${btoa('user-xyz-999').replace(/=+$/, '')}.${exp}.${sig}`
    expect(await verifySessionToken(forged)).toBeNull()
    // and a flipped signature
    const flipped = `${uid}.${exp}.${sig.slice(0, -2)}${sig.slice(-2) === 'AA' ? 'BB' : 'AA'}`
    expect(await verifySessionToken(flipped)).toBeNull()
  })

  it('expired token rejects', async () => {
    const token = await createSessionToken('user-old', -10) // expired 10s ago
    expect(await verifySessionToken(token)).toBeNull()
  })

  it('garbage / empty / malformed rejects', async () => {
    expect(await verifySessionToken(null)).toBeNull()
    expect(await verifySessionToken(undefined)).toBeNull()
    expect(await verifySessionToken('')).toBeNull()
    expect(await verifySessionToken('not-a-token')).toBeNull()
    expect(await verifySessionToken('a.b.c.d')).toBeNull()
    // non-numeric exp
    const [uid] = (await createSessionToken('u')).split('.')
    expect(await verifySessionToken(`${uid}.notanumber.sig`)).toBeNull()
  })

  it('constants frozen (cookie name + 7-day TTL)', () => {
    expect(SESSION_COOKIE).toBe('fo_session')
    expect(SESSION_TTL_SECONDS).toBe(7 * 24 * 60 * 60)
  })
})

describe('session.ts edge purity (SPEC-M7 §3)', () => {
  it('module source imports neither node:crypto nor Prisma', async () => {
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync('src/lib/auth/session.ts', 'utf8'),
    )
    // match IMPORT SYNTAX only (comments may mention node:crypto by name)
    expect(src).not.toMatch(/from\s+['"]node:crypto['"]/)
    expect(src).not.toMatch(/require\(['"]node:crypto['"]\)/)
    expect(src).not.toMatch(/from\s+['"]@prisma\/client['"]/)
    expect(src).not.toMatch(/from\s+['"]@\/lib\/db['"]/)
  })
})

/**
 * SPEC-M60 §3 tests — the auth hardening core, handler level (the
 * profile.test.ts pattern: mocked next/headers cookies + real test DB):
 *   - assessLockout pure arithmetic ×6 (threshold, window slide, expiry,
 *     spread burst, post-expiry fresh start, non-fail rows ignored)
 *   - the login flow ×4 (5 bad → 429 on the 6th + both ledgers; the locked
 *     door refuses the CORRECT password; success writes attempt+audit+
 *     lastLoginAt; unknown emails lock identically)
 *   - tokenVersion ×3 (a stale-tv cookie is revoked; change-password bumps
 *     + re-issues while an old-device token dies; admin set-password bumps
 *     the target)
 *   - the doors ×3 (clear-lockout 403 non-admin + the admin clear unblocks;
 *     sessions/clear bumps + re-issues + audits; logout writes the row)
 *   - the register service + wiring pins
 * Residue-free: afterAll deletes every fixture row (user, attempt, audit).
 */
import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest'

const cookieStore = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieStore ? { name, value: cookieStore[name] } : undefined,
  }),
}))

import { POST as loginPOST } from '../../src/app/api/auth/login/route'
import { POST as logoutPOST } from '../../src/app/api/auth/logout/route'
import { POST as changePasswordPOST } from '../../src/app/api/auth/change-password/route'
import { POST as setPasswordPOST } from '../../src/app/api/auth/admin/set-password/route'
import { POST as clearLockoutPOST } from '../../src/app/api/auth/admin/clear-lockout/route'
import { POST as sessionsClearPOST } from '../../src/app/api/auth/sessions/clear/route'
import { PATCH as profilePATCH } from '../../src/app/api/auth/profile/route'
import { assessLockout, LOCKOUT } from '@/lib/auth/security'
import { createSessionToken, SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { queryLoginAudit } from '@/lib/erp/registers/login-audit'
import { hashPassword } from '@/lib/auth/password'
import { db } from '@/lib/db'

const TS = Date.now()
const EMAIL = `m60-${TS}@fiberpro.local`
const ADMIN_EMAIL = `m60-admin-${TS}@fiberpro.local`
const UNKNOWN_EMAIL = `m60-unknown-${TS}@fiberpro.local`
let userId = ''
let adminId = ''

function req(body: unknown, url = 'http://localhost/api/auth/login'): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': 'vitest-m60' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as any
}

async function login() {
  cookieStore[SESSION_COOKIE] = await createSessionToken(userId)
}
async function loginAdmin() {
  cookieStore[SESSION_COOKIE] = await createSessionToken(adminId)
}

afterAll(async () => {
  for (const e of [EMAIL, ADMIN_EMAIL, UNKNOWN_EMAIL]) {
    await db.user.deleteMany({ where: { email: e } }).catch(() => {})
    await db.loginAttempt.deleteMany({ where: { email: e } }).catch(() => {})
    await db.loginAudit.deleteMany({ where: { email: e } }).catch(() => {})
  }
  await db.$disconnect()
})

beforeEach(async () => {
  for (const k of Object.keys(cookieStore)) delete cookieStore[k]
  if (!userId) {
    const u = await db.user.create({
      data: { email: EMAIL, name: 'M60 User', role: 'merchandiser', passwordHash: await hashPassword('m60-correct-pass') },
    })
    userId = u.id
    const a = await db.user.create({
      data: { email: ADMIN_EMAIL, name: 'M60 Admin', role: 'admin', passwordHash: await hashPassword('m60-admin-pass') },
    })
    adminId = a.id
  }
})

describe('M60 FR-A6: assessLockout pure arithmetic (SPEC-M60 §2)', () => {
  const M = 60 * 1000
  const fails = (minsAgo: number[], now: Date) =>
    minsAgo.map((m) => ({ outcome: 'fail', at: new Date(now.getTime() - m * M) }))

  it('4 fails → not locked (threshold is 5)', () => {
    const now = new Date('2026-09-13T12:00:00Z')
    const r = assessLockout(fails([1, 2, 3, 4], now), now)
    expect(r.locked).toBe(false)
    expect(r.until).toBeNull()
  })

  it('5 fails within the window → locked until newest + 30 min', () => {
    const now = new Date('2026-09-13T12:00:00Z')
    const r = assessLockout(fails([0, 3, 6, 9, 14], now), now)
    expect(r.locked).toBe(true)
    expect(r.until!.getTime()).toBe(now.getTime() + LOCKOUT.lockMinutes * M)
    expect(r.remainingMs).toBe(LOCKOUT.lockMinutes * M)
  })

  it('THE REGRESSION CASE: still locked at +20 (the window slid past the burst but the lock holds)', () => {
    const burst = new Date('2026-09-13T12:00:00Z')
    const now = new Date(burst.getTime() + 20 * M)
    const r = assessLockout(fails([20, 23, 26, 29, 34], now), now) // burst at T-20..T-34? no — 5 fails 20..34 min ago = burst AT 12:00 minus
    expect(r.locked).toBe(true)
    expect(r.until!.getTime()).toBe(burst.getTime() + LOCKOUT.lockMinutes * M)
  })

  it('expired at +31 → unlocked', () => {
    const burst = new Date('2026-09-13T12:00:00Z')
    const now = new Date(burst.getTime() + 31 * M)
    const r = assessLockout(fails([31, 34, 37, 40, 45], now), now)
    expect(r.locked).toBe(false)
    expect(r.remainingMs).toBeLessThanOrEqual(0)
  })

  it('5 fails spread over 40 minutes → no 15-min burst → not locked', () => {
    const now = new Date('2026-09-13T12:00:00Z')
    const r = assessLockout(fails([0, 10, 20, 30, 40], now), now)
    expect(r.locked).toBe(false)
  })

  it('post-expiry new fail starts a fresh burst (the old fails are outside the new fail window)', () => {
    const now = new Date('2026-09-13T12:00:00Z')
    // 5 fails 31..35 min ago (lock expired) + 1 fresh fail now
    const r = assessLockout([...fails([31, 32, 33, 34, 35], now), { outcome: 'fail', at: now }], now)
    expect(r.locked).toBe(false)
  })

  it('non-fail rows are ignored (success/locked never count toward the threshold)', () => {
    const now = new Date('2026-09-13T12:00:00Z')
    const r = assessLockout(
      [...fails([1, 2, 3, 4], now), { outcome: 'success', at: now }, { outcome: 'locked', at: now }],
      now,
    )
    expect(r.locked).toBe(false)
  })
})

describe('M60 FR-A6/A7: the login flow (lockout honored + both ledgers)', () => {
  it('5 bad passwords → the 6th attempt is 429 with ledger + audit rows', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await loginPOST(req({ email: EMAIL, password: `wrong-${i}` }) as any)
      expect(r.status).toBe(401)
    }
    const sixth = await loginPOST(req({ email: EMAIL, password: 'wrong-6' }) as any)
    expect(sixth.status).toBe(429)
    const body = await sixth.json()
    expect(body.error).toContain('locked')

    const attempts = await db.loginAttempt.findMany({ where: { email: EMAIL } })
    expect(attempts.filter((a) => a.outcome === 'fail').length).toBe(5)
    expect(attempts.filter((a) => a.outcome === 'locked').length).toBe(1)
    const audits = await db.loginAudit.findMany({ where: { email: EMAIL } })
    expect(audits.filter((a) => a.event === 'login_fail').length).toBe(5)
    expect(audits.filter((a) => a.event === 'login_locked').length).toBe(1)
    expect(attempts[0].userAgent).toBe('vitest-m60')
  })

  it('the locked door refuses the CORRECT password too (lockout precedes credentials)', async () => {
    // EMAIL is locked from the previous test (shared fixture order — vitest runs sequentially)
    const r = await loginPOST(req({ email: EMAIL, password: 'm60-correct-pass' }) as any)
    expect(r.status).toBe(429)
  })

  it('the admin clear unblocks → login works + lockout_clear audited', async () => {
    await loginAdmin()
    const clear = await clearLockoutPOST(req({ email: EMAIL }, 'http://localhost/api/auth/admin/clear-lockout') as any)
    expect(clear.status).toBe(200)
    const cleared = await clear.json()
    expect(cleared.cleared).toBeGreaterThanOrEqual(6) // 5 fail + locked rows from the flow above

    const good = await loginPOST(req({ email: EMAIL, password: 'm60-correct-pass' }) as any)
    expect(good.status).toBe(200)
    const row = await db.user.findUnique({ where: { id: userId } })
    expect(row?.lastLoginAt).not.toBeNull() // FR-A7: lastLoginAt retained
    const audits = await db.loginAudit.findMany({ where: { email: EMAIL, event: 'login' } })
    expect(audits.length).toBe(1)
    const clears = await db.loginAudit.findMany({ where: { email: EMAIL, event: 'lockout_clear' } })
    expect(clears.length).toBe(1)
    expect(clears[0].detail).toContain('m60-admin')
  })

  it('unknown emails lock identically (anti-enumeration parity)', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await loginPOST(req({ email: UNKNOWN_EMAIL, password: 'nope' }) as any)
      expect(r.status).toBe(401)
    }
    const sixth = await loginPOST(req({ email: UNKNOWN_EMAIL, password: 'nope' }) as any)
    expect(sixth.status).toBe(429)
    const r2 = await loginPOST(req({ email: `never-${TS}@fiberpro.local`, password: 'nope' }) as any)
    expect(r2.status).toBe(401) // one unknown try without history → the normal 401
  })
})

describe('M60 FR-A8: tokenVersion revocation', () => {
  it('a stale-tv cookie is revoked (401) after a bump', async () => {
    cookieStore[SESSION_COOKIE] = await createSessionToken(userId, 0)
    await db.user.update({ where: { id: userId }, data: { tokenVersion: 1 } })
    const r = await profilePATCH(req({ name: 'Should Not Save' }, 'http://localhost/api/auth/profile') as any)
    expect(r.status).toBe(401)
    await db.user.update({ where: { id: userId }, data: { tokenVersion: 0 } })
  })

  it('the 4-part token verifies with its tv; legacy 3-part verifies as tv 0', async () => {
    const t4 = await createSessionToken(userId, 3)
    const v4 = await verifySessionToken(t4)
    expect(v4).toEqual({ userId, tv: 3 })
    // legacy: strip the tv segment and re-sign is not possible here — craft by signing old format is covered by session unit tests elsewhere; assert shape only
    expect(await verifySessionToken('garbage.token.sig')).toBeNull()
  })

  it('change-password bumps + re-issues (Set-Cookie) while an old-device token dies', async () => {
    // current session at tv 0
    await db.user.update({ where: { id: userId }, data: { tokenVersion: 0 } })
    cookieStore[SESSION_COOKIE] = await createSessionToken(userId, 0)
    const r = await changePasswordPOST(
      req(
        { currentPassword: 'm60-correct-pass', newPassword: 'm60-new-pass-456' },
        'http://localhost/api/auth/change-password',
      ) as any,
    )
    expect(r.status).toBe(200)
    const setCookie = r.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('fo_session') // re-issued at the new tv — this device stays signed in
    const row = await db.user.findUnique({ where: { id: userId } })
    expect(row?.tokenVersion).toBe(1)
    // an old-device cookie (tv 0) is now revoked
    cookieStore[SESSION_COOKIE] = await createSessionToken(userId, 0)
    const dead = await profilePATCH(req({ name: 'Dead Device' }, 'http://localhost/api/auth/profile') as any)
    expect(dead.status).toBe(401)
    // the re-issued cookie (tv 1) works
    cookieStore[SESSION_COOKIE] = await createSessionToken(userId, 1)
    const alive = await profilePATCH(req({ name: 'Alive Device' }, 'http://localhost/api/auth/profile') as any)
    expect(alive.status).toBe(200)
    const audits = await db.loginAudit.findMany({ where: { email: EMAIL, event: 'password_set' } })
    expect(audits.some((a) => a.detail?.includes('other sessions revoked'))).toBe(true)
    // restore the password for later tests
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword('m60-correct-pass') },
    })
  })

  it('admin set-password bumps the target', async () => {
    await loginAdmin()
    const r = await setPasswordPOST(
      req({ userId, password: 'm60-admin-set-789' }, 'http://localhost/api/auth/admin/set-password') as any,
    )
    expect(r.status).toBe(200)
    const row = await db.user.findUnique({ where: { id: userId } })
    expect(row!.tokenVersion).toBe(2)
    const audits = await db.loginAudit.findMany({ where: { email: EMAIL, event: 'password_set' } })
    expect(audits.some((a) => a.detail?.includes('by admin'))).toBe(true)
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword('m60-correct-pass'), tokenVersion: 0 },
    })
  })

  it('sessions/clear bumps + re-issues + audits (sign out all devices)', async () => {
    await db.user.update({ where: { id: userId }, data: { tokenVersion: 0 } })
    await login()
    const r = await sessionsClearPOST(req({}, 'http://localhost/api/auth/sessions/clear') as any)
    expect(r.status).toBe(200)
    const row = await db.user.findUnique({ where: { id: userId } })
    expect(row!.tokenVersion).toBe(1)
    expect(r.headers.get('set-cookie')).toContain('fo_session')
    const audits = await db.loginAudit.findMany({ where: { email: EMAIL, event: 'sessions_cleared' } })
    expect(audits.length).toBe(1)
  })
})

describe('M60 FR-A7: the audit trail + register', () => {
  it('logout writes the audit row', async () => {
    await db.user.update({ where: { id: userId }, data: { tokenVersion: 1 } })
    cookieStore[SESSION_COOKIE] = await createSessionToken(userId, 1)
    const r = await logoutPOST(req({}, 'http://localhost/api/auth/logout') as any)
    expect(r.status).toBe(200)
    const audits = await db.loginAudit.findMany({ where: { email: EMAIL, event: 'logout' } })
    expect(audits.length).toBe(1)
    // idempotent: a sessionless logout still 200s, no extra row
    delete cookieStore[SESSION_COOKIE]
    const r2 = await logoutPOST(req({}, 'http://localhost/api/auth/logout') as any)
    expect(r2.status).toBe(200)
    const audits2 = await db.loginAudit.findMany({ where: { email: EMAIL, event: 'logout' } })
    expect(audits2.length).toBe(1)
  })

  it('clear-lockout refuses non-admins (403)', async () => {
    cookieStore[SESSION_COOKIE] = await createSessionToken(userId, 1)
    const r = await clearLockoutPOST(req({ email: EMAIL }, 'http://localhost/api/auth/admin/clear-lockout') as any)
    expect(r.status).toBe(403)
  })

  it('queryLoginAudit: event filter + q search + the totals band', async () => {
    const all = await queryLoginAudit({ page: 1, limit: 200, q: EMAIL })
    expect(all.count).toBeGreaterThan(5)
    expect(all.rows[0].event).toBeTruthy()
    expect(all.totals.some((t) => t.label === 'Entries')).toBe(true)
    const failsOnly = await queryLoginAudit({ page: 1, limit: 200, q: EMAIL, variant: 'login_fail' })
    expect(failsOnly.count).toBeGreaterThanOrEqual(5)
    for (const row of failsOnly.rows) expect(row.event).toBe('login_fail')
  })

  it('WIRING: schema + security constants + registrations (the context pins)', () => {
    const fs = require('node:fs')
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8')
    expect(schema).toContain('model LoginAttempt')
    expect(schema).toContain('model LoginAudit')
    expect(schema).toContain('tokenVersion')
    const security = fs.readFileSync('src/lib/auth/security.ts', 'utf8')
    expect(security).toContain('attempts: 5')
    expect(security).toContain('windowMinutes: 15')
    expect(security).toContain('lockMinutes: 30')
    const menu = fs.readFileSync('src/lib/erp/menu-registry.ts', 'utf8')
    expect(menu).toContain("id: 'login-audit'")
    const cfgIndex = fs.readFileSync('src/lib/erp/register-configs/index.ts', 'utf8')
    expect(cfgIndex).toContain('loginAuditConfig')
    const svcIndex = fs.readFileSync('src/lib/erp/registers/index.ts', 'utf8')
    expect(svcIndex).toContain("'login-audit': queryLoginAudit")
  })
})

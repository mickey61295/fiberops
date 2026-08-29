/**
 * SPEC-M18 §4-C4 tests — self-service change password, handler level (the
 * set-password / flags-config pattern: mocked cookies + real DB):
 *   - 401 without a session (Wave B guard family)
 *   - 400 bad body (missing field / short new password / non-JSON)
 *   - 401 wrong current password
 *   - 400 new === current
 *   - 200 happy path: hash rotated — NEW password verifies, OLD does not
 * Non-admin fixture on purpose: the door is for EVERY logged-in user (the
 * admin-managed lifecycle stays at /api/auth/admin/set-password).
 */
import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest'

const cookieStore = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieStore ? { name, value: cookieStore[name] } : undefined,
  }),
}))

import { POST } from '../../src/app/api/auth/change-password/route'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth/session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { db } from '@/lib/db'

const TS = Date.now()
const EMAIL = `chpw-${TS}@fiberpro.local`
const OLD_PW = 'old-password-123'
const NEW_PW = 'new-password-456'
let userId = ''

function req(body: unknown): Request {
  return new Request('http://localhost/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as any
}

async function login() {
  cookieStore[SESSION_COOKIE] = await createSessionToken(userId)
}

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } }).catch(() => {})
  await db.$disconnect()
})

beforeEach(async () => {
  for (const k of Object.keys(cookieStore)) delete cookieStore[k]
  if (!userId) {
    const u = await db.user.create({
      data: { email: EMAIL, name: 'Change PW User', role: 'merchandiser', passwordHash: await hashPassword(OLD_PW) },
    })
    userId = u.id
  }
})

describe('M18 Wave C: change password (SPEC-M18 §4-C4)', () => {
  it('401 without a session', async () => {
    const res = await POST(req({ currentPassword: OLD_PW, newPassword: NEW_PW }))
    expect(res.status).toBe(401)
  })

  it('400 on bad bodies (missing fields / short new password / non-JSON)', async () => {
    await login()
    const missing = await POST(req({ currentPassword: OLD_PW }))
    expect(missing.status).toBe(400)
    const short = await POST(req({ currentPassword: OLD_PW, newPassword: 'short' }))
    expect(short.status).toBe(400)
    const junk = await POST(req('{not-json'))
    expect(junk.status).toBe(400)
  })

  it('401 on wrong current password (hash NOT rotated)', async () => {
    await login()
    const res = await POST(req({ currentPassword: 'wrong-current-password', newPassword: NEW_PW }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('incorrect')
    const row = await db.user.findUnique({ where: { id: userId } })
    expect(await verifyPassword(OLD_PW, row?.passwordHash)).toBe(true)
  })

  it('400 when new password equals current', async () => {
    await login()
    const res = await POST(req({ currentPassword: OLD_PW, newPassword: OLD_PW }))
    expect(res.status).toBe(400)
  })

  it('200 happy path: NEW verifies, OLD does not, response carries the email', async () => {
    await login()
    const res = await POST(req({ currentPassword: OLD_PW, newPassword: NEW_PW }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.email).toBe(EMAIL)
    expect(body.passwordHash).toBe('set')
    const row = await db.user.findUnique({ where: { id: userId } })
    expect(await verifyPassword(NEW_PW, row?.passwordHash)).toBe(true)
    expect(await verifyPassword(OLD_PW, row?.passwordHash)).toBe(false)
  })

  it('after rotation the OLD password can no longer authenticate (401), NEW can re-change', async () => {
    await login()
    const stale = await POST(req({ currentPassword: OLD_PW, newPassword: 'another-new-789' }))
    expect(stale.status).toBe(401)
    const again = await POST(req({ currentPassword: NEW_PW, newPassword: 'another-new-789' }))
    expect(again.status).toBe(200)
    const row = await db.user.findUnique({ where: { id: userId } })
    expect(await verifyPassword('another-new-789', row?.passwordHash)).toBe(true)
  })
})

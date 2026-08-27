/**
 * SPEC-M7 Wave C — /api/auth/admin/set-password route contract (handler-level,
 * mocked cookies + real db fixtures):
 *
 *   - 401 JSON without a session (Wave B guard runs first)
 *   - 403 for a logged-in NON-admin
 *   - 400 zod: empty body, short password, password+clear together, neither
 *   - 404 unknown userId
 *   - 400 clearing your own password (self-lockout guard)
 *   - admin sets → passwordHash updates and verifyPassword accepts the new one
 *   - admin clears → passwordHash null (login door closed until re-set)
 */
import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest'

const cookieStore = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieStore ? { name, value: cookieStore[name] } : undefined,
  }),
}))

import { POST } from '../../src/app/api/auth/admin/set-password/route'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth/session'
import { verifyPassword } from '@/lib/auth/password'
import { db } from '@/lib/db'

const TS = Date.now()
const ADMIN_EMAIL = `pwadmin-${TS}@fiberpro.local`
const PEON_EMAIL = `pwpeon-${TS}@fiberpro.local`
let adminId = ''
let peonId = ''

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `pwadmin-${TS}` } } }).catch(() => {})
  await db.user.deleteMany({ where: { email: { startsWith: `pwpeon-${TS}` } } }).catch(() => {})
  await db.$disconnect()
})

beforeEach(async () => {
  for (const k of Object.keys(cookieStore)) delete cookieStore[k]
  if (!adminId) {
    const a = await db.user.create({ data: { email: ADMIN_EMAIL, name: 'PW Admin', role: 'admin' } })
    adminId = a.id
  }
  if (!peonId) {
    const p = await db.user.create({ data: { email: PEON_EMAIL, name: 'PW Peon', role: 'merchandiser' } })
    peonId = p.id
  }
})

function req(body: unknown): Request {
  return new Request('http://localhost/api/auth/admin/set-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as any
}

async function loginAs(id: string) {
  cookieStore[SESSION_COOKIE] = await createSessionToken(id)
}

describe('POST /api/auth/admin/set-password (SPEC-M7 Wave C)', () => {
  it('no session → 401 JSON', async () => {
    const res = await POST(req({ userId: peonId, password: 'newpassword1' }) as any)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Authentication required' })
  })

  it('logged-in non-admin → 403', async () => {
    await loginAs(peonId)
    const res = await POST(req({ userId: peonId, password: 'newpassword1' }) as any)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Admin role required' })
  })

  it('empty body → 400', async () => {
    await loginAs(adminId)
    const res = await POST(req(null) as any)
    expect(res.status).toBe(400)
  })

  it('short password → 400', async () => {
    await loginAs(adminId)
    const res = await POST(req({ userId: peonId, password: 'short' }) as any)
    expect(res.status).toBe(400)
  })

  it('password + clear together → 400', async () => {
    await loginAs(adminId)
    const res = await POST(req({ userId: peonId, password: 'newpassword1', clear: true }) as any)
    expect(res.status).toBe(400)
  })

  it('neither password nor clear → 400', async () => {
    await loginAs(adminId)
    const res = await POST(req({ userId: peonId }) as any)
    expect(res.status).toBe(400)
  })

  it('unknown userId → 404', async () => {
    await loginAs(adminId)
    const res = await POST(req({ userId: 'does-not-exist', password: 'newpassword1' }) as any)
    expect(res.status).toBe(404)
  })

  it('admin sets a password → hash verifies, {ok, passwordHash:"set"}', async () => {
    await loginAs(adminId)
    const res = await POST(req({ userId: peonId, password: 'set-pass-123' }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.passwordHash).toBe('set')
    expect(body.user.email).toBe(PEON_EMAIL)

    const row = await db.user.findUnique({ where: { id: peonId } })
    expect(row?.passwordHash).toBeTruthy()
    expect(await verifyPassword('set-pass-123', row!.passwordHash!)).toBe(true)
    expect(await verifyPassword('wrong-password', row!.passwordHash!)).toBe(false)
  })

  it('admin sets the admin\u2019s OWN password (change) → allowed', async () => {
    await loginAs(adminId)
    const res = await POST(req({ userId: adminId, password: 'own-pass-123' }) as any)
    expect(res.status).toBe(200)
    const row = await db.user.findUnique({ where: { id: adminId } })
    expect(await verifyPassword('own-pass-123', row!.passwordHash!)).toBe(true)
  })

  it('admin clears another user\u2019s password → passwordHash null', async () => {
    await loginAs(adminId)
    const res = await POST(req({ userId: peonId, clear: true }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.passwordHash).toBeNull()
    const row = await db.user.findUnique({ where: { id: peonId } })
    expect(row?.passwordHash).toBeNull()
  })

  it('clearing your own password → 400 (self-lockout guard)', async () => {
    await loginAs(adminId)
    const res = await POST(req({ userId: adminId, clear: true }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/own password/i)
  })
})

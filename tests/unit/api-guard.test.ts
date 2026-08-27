/**
 * SPEC-M7 Wave B — API guard unit tests: requireApiSession() over a mocked
 * cookies() surface (it is the first line of every guarded route handler:
 * /api/erp, /api/agent, /api/agent/approve, /api/upload, /api/seed).
 *
 *   - no cookie → 401 JSON {"error":"Authentication required"}
 *   - garbage / tampered token → 401
 *   - token for a missing user → 401
 *   - token for a deactivated user → 401 (the second-layer rule)
 *   - valid token → the session user passes through
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

const cookieStore = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieStore ? { name, value: cookieStore[name] } : undefined,
  }),
}))

import { requireApiSession } from '@/lib/auth/api-guard'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth/session'
import { db } from '@/lib/db'

const TS = Date.now()
const EMAIL = `guard-${TS}@fiberpro.local`
let userId = ''

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `guard-${TS}` } } }).catch(() => {})
  await db.$disconnect()
})

beforeEach(() => {
  for (const k of Object.keys(cookieStore)) delete cookieStore[k]
})

async function expect401(guard: Awaited<ReturnType<typeof requireApiSession>>) {
  expect(guard.user).toBeUndefined()
  expect(guard.error).toBeInstanceOf(Response)
  expect(guard.error!.status).toBe(401)
  const body = await guard.error!.json()
  expect(body).toEqual({ error: 'Authentication required' })
}

describe('requireApiSession (SPEC-M7 Wave B)', () => {
  it('no cookie at all → 401 JSON', async () => {
    await expect401(await requireApiSession())
  })

  it('garbage token → 401 JSON', async () => {
    cookieStore[SESSION_COOKIE] = 'not-a-token'
    await expect401(await requireApiSession())
  })

  it('tampered token (valid shape, forged signature) → 401 JSON', async () => {
    cookieStore[SESSION_COOKIE] = 'Ym9ndXMuZm9yZWlnbmVyLnRlc3Q.OTk5OTk5OTk5OTk5OTk.AAAA'
    await expect401(await requireApiSession())
  })

  it('token for a DELETED user → 401 (second layer, SPEC-M7 §3)', async () => {
    cookieStore[SESSION_COOKIE] = await createSessionToken('no-such-user-id')
    await expect401(await requireApiSession())
  })

  it('token for a DEACTIVATED user → 401', async () => {
    const u = await db.user.create({
      data: { email: `inactive-${TS}@fiberpro.local`, name: 'Inactive Guard', role: 'viewer', active: false },
    })
    cookieStore[SESSION_COOKIE] = await createSessionToken(u.id)
    await expect401(await requireApiSession())
  })

  it('valid token for an active user → the user passes through', async () => {
    const created = await db.user.create({
      data: { email: EMAIL, name: 'Guard Test', role: 'admin' },
    })
    userId = created.id
    cookieStore[SESSION_COOKIE] = await createSessionToken(created.id)
    const guard = await requireApiSession()
    expect(guard.error).toBeUndefined()
    expect(guard.user).toEqual({ id: created.id, name: 'Guard Test', email: EMAIL, role: 'admin' })
  })
})

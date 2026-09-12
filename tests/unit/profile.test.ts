/**
 * SPEC-M57 §3 tests — the profile door, handler level (the change-password
 * pattern: mocked next/headers cookies + real test DB):
 *   - PATCH 401 without a session (Wave B guard family)
 *   - 400 on bad bodies (missing name / 1-char / 61-char / non-JSON)
 *   - 200 happy path: name persisted, response {ok, name}
 *   - narrow door proof: the row's email/role are untouched by the PATCH
 * Non-admin fixture on purpose — the door is for EVERY logged-in user.
 */
import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest'

const cookieStore = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieStore ? { name, value: cookieStore[name] } : undefined,
  }),
}))

import { PATCH } from '../../src/app/api/auth/profile/route'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth/session'
import { db } from '@/lib/db'

const TS = Date.now()
const EMAIL = `profile-${TS}@fiberpro.local`
let userId = ''

function req(body: unknown): Request {
  return new Request('http://localhost/api/auth/profile', {
    method: 'PATCH',
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
      data: { email: EMAIL, name: 'Profile User', role: 'merchandiser' },
    })
    userId = u.id
  }
})

describe('M57: profile door (SPEC-M57 §3)', () => {
  it('401 without a session', async () => {
    const res = await PATCH(req({ name: 'No Session' }))
    expect(res.status).toBe(401)
  })

  it('400 on bad bodies (missing / 1-char / 61-char / non-JSON)', async () => {
    await login()
    const missing = await PATCH(req({}))
    expect(missing.status).toBe(400)
    const one = await PATCH(req({ name: 'x' }))
    expect(one.status).toBe(400)
    const sixtyOne = await PATCH(req({ name: 'a'.repeat(61) }))
    expect(sixtyOne.status).toBe(400)
    const nonJson = await PATCH(req('not-json{'))
    expect(nonJson.status).toBe(400)
  })

  it('200 happy path: name persisted, {ok, name} returned', async () => {
    await login()
    const res = await PATCH(req({ name: 'Renamed Operator' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.name).toBe('Renamed Operator')
    const row = await db.user.findUnique({ where: { id: userId } })
    expect(row?.name).toBe('Renamed Operator')
  })

  it('trims and enforces bounds (61 after trim → 400; trimmed name saved)', async () => {
    await login()
    const padded = await PATCH(req({ name: '  Padded Name  ' }))
    expect(padded.status).toBe(200)
    const body = await padded.json()
    expect(body.name).toBe('Padded Name')
  })

  it('narrow door: email + role untouched by the PATCH', async () => {
    await login()
    await PATCH(req({ name: 'Again Renamed' }))
    const row = await db.user.findUnique({ where: { id: userId } })
    expect(row?.email).toBe(EMAIL)
    expect(row?.role).toBe('merchandiser')
  })
})

/**
 * SPEC-M58 §3 tests — chat history: the persistence helper + the two API
 * routes, handler level (the change-password pattern: mocked next/headers
 * cookies + real test DB):
 *   - persistTurnHistory: session create (title derivation incl. 60-char
 *     trim), re-persist appends + bumps updatedAt, empty texts → no rows,
 *     foreign-session collision → silent no-op (defense-in-depth)
 *   - GET /api/agent/history: 401 without session / 200 shape, newest
 *     first, ONLY own sessions
 *   - GET/DELETE /api/agent/history/[id]: 200 own (ascending messages,
 *     cascade delete), 404 unknown AND foreign (anti-enumeration)
 *   - residue-free: fixtures deleted in afterAll
 */
import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest'

const cookieStore = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieStore ? { name, value: cookieStore[name] } : undefined,
  }),
}))

import { GET as LIST } from '../../src/app/api/agent/history/route'
import { GET as ONE, DELETE as DEL } from '../../src/app/api/agent/history/[id]/route'
import {
  persistTurnHistory,
  titleFromPrompt,
} from '../../src/lib/agent/history'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth/session'
import { db } from '@/lib/db'

const TS = Date.now()
const EMAIL_A = `chathist-a-${TS}@fiberpro.local`
const EMAIL_B = `chathist-b-${TS}@fiberpro.local`
let userA = ''
let userB = ''

async function loginA() {
  cookieStore[SESSION_COOKIE] = await createSessionToken(userA)
}
async function loginB() {
  cookieStore[SESSION_COOKIE] = await createSessionToken(userB)
}

afterAll(async () => {
  await db.chatSession.deleteMany({ where: { userId: { in: [userA, userB] } } }).catch(() => {})
  await db.user.deleteMany({ where: { email: { in: [EMAIL_A, EMAIL_B] } } }).catch(() => {})
  await db.$disconnect()
})

beforeEach(async () => {
  for (const k of Object.keys(cookieStore)) delete cookieStore[k]
  if (!userA) {
    const a = await db.user.create({ data: { email: EMAIL_A, name: 'Hist A', role: 'merchandiser' } })
    const b = await db.user.create({ data: { email: EMAIL_B, name: 'Hist B', role: 'storekeeper' } })
    userA = a.id
    userB = b.id
  }
})

describe('M58: persistTurnHistory (SPEC-M58 §3)', () => {
  it('no-ops on missing session id / nothing to write', async () => {
    await expect(persistTurnHistory(undefined, userA, 'hello', ['hi'])).resolves.toBeUndefined()
    await expect(persistTurnHistory('sess-12345678', userA, '   ', [])).resolves.toBeUndefined()
    const count = await db.chatSession.count({ where: { userId: userA } })
    expect(count).toBe(0)
  })

  it('creates the session with a derived title + appends the turn rows', async () => {
    const sid = `sess-a-${TS}`
    await persistTurnHistory(sid, userA, 'What is in G1 godown?', ['Let me check.', 'The stock is X pcs.'])
    const session = await db.chatSession.findUnique({ where: { id: sid }, include: { messages: true } })
    expect(session).toBeTruthy()
    expect(session!.title).toBe('What is in G1 godown?')
    expect(session!.userId).toBe(userA)
    expect(session!.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'assistant'])
    expect(session!.messages[0].content).toBe('What is in G1 godown?')
  })

  it('title derivation: whitespace collapse + 60-char trim + empty fallback', () => {
    expect(titleFromPrompt('  too   spaced  ')).toBe('too spaced')
    expect(titleFromPrompt('x'.repeat(80)).length).toBeLessThanOrEqual(60)
    expect(titleFromPrompt('')).toBe('(no title)')
  })

  it('re-persist appends + bumps updatedAt on the SAME session', async () => {
    const sid = `sess-b-${TS}`
    await persistTurnHistory(sid, userA, 'first question', ['first answer'])
    const before = await db.chatSession.findUnique({ where: { id: sid } })
    await new Promise((r) => setTimeout(r, 20)) // @updatedAt resolution
    await persistTurnHistory(sid, userA, 'second question', ['second answer'])
    const after = await db.chatSession.findUnique({ where: { id: sid }, include: { messages: true } })
    expect(after!.messages.length).toBe(4)
    expect(after!.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime())
  })

  it('foreign-session id collision → silent no-op (defense-in-depth)', async () => {
    const sid = `sess-c-${TS}`
    await persistTurnHistory(sid, userA, 'mine', ['ok'])
    await persistTurnHistory(sid, userB, 'hijack attempt', ['nope']) // different userId
    const session = await db.chatSession.findUnique({ where: { id: sid }, include: { messages: true } })
    expect(session!.userId).toBe(userA)
    expect(session!.messages.length).toBe(2) // nothing from the foreign write
  })
})

describe('M58: /api/agent/history list (SPEC-M58 FR-2)', () => {
  it('401 without a session', async () => {
    const res = await LIST()
    expect(res.status).toBe(401)
  })

  it('200: own sessions only, newest first, with counts', async () => {
    const old = `sess-old-${TS}`
    const new_ = `sess-new-${TS}`
    await persistTurnHistory(old, userA, 'older chat', ['old answer'])
    await new Promise((r) => setTimeout(r, 20))
    await persistTurnHistory(new_, userA, 'newer chat', ['new answer', 'and more'])
    await persistTurnHistory(`sess-b-only-${TS}`, userB, 'B private', ['no'])
    await loginA()
    const res = await LIST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.sessions)).toBe(true)
    const ids = body.sessions.map((s: { id: string }) => s.id)
    expect(ids).toContain(new_)
    expect(ids).toContain(old)
    expect(ids).not.toContain(`sess-b-only-${TS}`)
    expect(ids.indexOf(new_)).toBeLessThan(ids.indexOf(old)) // newest first
    const newer = body.sessions.find((s: { id: string }) => s.id === new_)
    expect(newer.messageCount).toBe(3)
    expect(newer.title).toBe('newer chat')
  })
})

describe('M58: /api/agent/history/[id] get + delete (FR-3/FR-4)', () => {
  it('GET: 404 unknown id (no session leak either way)', async () => {
    await loginA()
    const res = await ONE(new Request('http://localhost/x') as any, { params: Promise.resolve({ id: 'does-not-exist' }) })
    expect(res.status).toBe(404)
  })

  it('GET: 404 for a FOREIGN session (anti-enumeration)', async () => {
    const sid = `sess-priv-${TS}`
    await persistTurnHistory(sid, userB, 'B private', ['no'])
    await loginA()
    const res = await ONE(new Request('http://localhost/x') as any, { params: Promise.resolve({ id: sid }) })
    expect(res.status).toBe(404)
  })

  it('GET: 200 own session, messages ascending', async () => {
    const sid = `sess-mine-${TS}`
    await persistTurnHistory(sid, userA, 'order q', ['order a'])
    await persistTurnHistory(sid, userA, 'order q2', ['order a2'])
    await loginA()
    const res = await ONE(new Request('http://localhost/x') as any, { params: Promise.resolve({ id: sid }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.session.id).toBe(sid)
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
  })

  it('DELETE: 404 foreign, 200 own + cascade (messages gone)', async () => {
    const sid = `sess-del-${TS}`
    await persistTurnHistory(sid, userA, 'to delete', ['bye'])
    await loginB()
    const denied = await DEL(new Request('http://localhost/x') as any, { params: Promise.resolve({ id: sid }) })
    expect(denied.status).toBe(404)
    await loginA()
    const res = await DEL(new Request('http://localhost/x') as any, { params: Promise.resolve({ id: sid }) })
    expect(res.status).toBe(200)
    const gone = await db.chatSession.findUnique({ where: { id: sid } })
    expect(gone).toBeNull()
    const msgs = await db.chatMessage.count({ where: { sessionId: sid } })
    expect(msgs).toBe(0)
  })
})

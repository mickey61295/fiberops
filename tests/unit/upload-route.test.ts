/**
 * SPEC-M3 §12 — /api/upload route contract. POST multipart (field `file`):
 * sanitize → write to upload/ → extract → { ok, fileName, …, text }. GET lists.
 * Rejections: bad extension (415), missing field (400), path traversal (400).
 * SPEC-M7 Wave B — the route is session-guarded now: a valid fo_session
 * cookie (mocked next/headers + a fixture user) rides every call, and the
 * guard itself is asserted first (401 JSON without it).
 */
import { describe, it, expect, afterAll, vi, beforeEach } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const cookieStore = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieStore ? { name, value: cookieStore[name] } : undefined,
  }),
}))

import { POST, GET } from '../../src/app/api/upload/route'
import { UPLOAD_DIR } from '../../src/lib/agent/docExtract'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth/session'
import { db } from '@/lib/db'

const stamp = Date.now()
const created: string[] = []
let fixtureUserId = ''

beforeEach(async () => {
  for (const k of Object.keys(cookieStore)) delete cookieStore[k]
  if (!fixtureUserId) {
    const u = await db.user.create({
      data: { email: `upload-route-${stamp}@fiberpro.local`, name: 'Upload Route', role: 'admin' },
    })
    fixtureUserId = u.id
  }
  cookieStore[SESSION_COOKIE] = await createSessionToken(fixtureUserId)
})

afterAll(async () => {
  for (const f of created) {
    await fs.rm(path.join(UPLOAD_DIR, f), { force: true }).catch(() => {})
  }
  if (fixtureUserId) {
    await db.user.delete({ where: { id: fixtureUserId } }).catch(() => {})
  }
  await db.$disconnect()
})

function fileRequest(name: string, content: string, type = 'text/plain') {
  const fd = new FormData()
  fd.append('file', new File([content], name, { type }))
  return new Request('http://localhost/api/upload', { method: 'POST', body: fd }) as any
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>
}

describe('/api/upload — SPEC-M3 §12 rebuild', () => {
  it('SPEC-M7 Wave B: no session → 401 JSON (POST and GET)', async () => {
    for (const k of Object.keys(cookieStore)) delete cookieStore[k]
    const r401 = await POST(fileRequest(`wd-noauth-${stamp}.txt`, 'x'))
    expect(r401.status).toBe(401)
    expect(await json(r401)).toEqual({ error: 'Authentication required' })
    const g401 = await GET()
    expect(g401.status).toBe(401)
    expect(await json(g401)).toEqual({ error: 'Authentication required' })
  })

  it('POST txt: writes, extracts, returns the text (ok + chars)', async () => {
    const name = `wd-upload-${stamp}.txt`
    const res = await POST(fileRequest(name, 'PO SYNTH-123 buyer CUS001 qty 500 rate 92'))
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.ok).toBe(true)
    expect(body.fileName).toBe(name)
    expect(body.chars).toBeGreaterThan(0)
    expect(String(body.text)).toContain('SYNTH-123')
    created.push(name)
  })

  it('POST same name twice: de-collisions with a -2 suffix (append-only, never overwrite)', async () => {
    const name = `wd-dup-${stamp}.txt`
    const r1 = await POST(fileRequest(name, 'first'))
    const r2 = await POST(fileRequest(name, 'second'))
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    const b1 = await json(r1)
    const b2 = await json(r2)
    expect(b1.fileName).toBe(name)
    expect(b2.fileName).toBe(`wd-dup-${stamp}-2.txt`)
    created.push(String(b1.fileName), String(b2.fileName))
  })

  it('POST rejects unsupported extensions with 415', async () => {
    const res = await POST(fileRequest(`wd-bad-${stamp}.exe`, 'binary'))
    expect(res.status).toBe(415)
    const body = await json(res)
    expect(body.ok).toBe(false)
  })

  it('POST sanitizes path-traversal names to the bare basename (never escapes upload/)', async () => {
    // sanitizeFileName's contract: strip the directory component — the file
    // lands INSIDE upload/ under the safe basename (de-collided if one exists).
    const res = await POST(fileRequest('../../etc/passwd.txt', 'nope'))
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.ok).toBe(true)
    expect(String(body.fileName)).toMatch(/^passwd(-\d+)?\.txt$/)
    created.push(String(body.fileName))
  })

  it('POST missing file field → 400', async () => {
    const fd = new FormData()
    fd.append('other', 'x')
    const res = await POST(new Request('http://localhost/api/upload', { method: 'POST', body: fd }) as any)
    expect(res.status).toBe(400)
  })

  it('GET lists uploads (ok + count + files array)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.files)).toBe(true)
    expect(Number(body.count)).toBeGreaterThan(0)
  })
})

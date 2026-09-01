/**
 * SPEC-M11 C5 — feature-flag registry shape + /api/config route contract
 * (handler-level, the set-password test pattern: mocked cookies + real DB
 * fixtures, restore-on-exit):
 *
 * Registry (no DB):
 *   - 28 LLD-07 defs, unique names, valid valueType/category enums
 *   - non-trivial descriptions (the per-flag effect notes the UI renders)
 *   - the 4 populated categories (tolerance 21 / commercial 5 / module 1 /
 *     company 1); number defaults finite; boolean defaults parse
 *
 * Route (POST = admin door, GET = FlagsProvider):
 *   - 401 both verbs without a session (Wave B guard; GET guarded since M11)
 *   - 403 logged-in non-admin
 *   - 400 zod: empty body, missing value
 *   - 400 unknown flag name — the registry drift-safe rule (exact message)
 *   - 400 non-finite number for a number flag
 *   - 200 admin boolean flip → typed response + AppOption row persisted
 *   - 200 admin number set → typed number response + row persisted
 *   - GET (admin) reflects typed values + the 28-entry registry
 */
import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest'

const cookieStore = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieStore ? { name, value: cookieStore[name] } : undefined,
  }),
}))

import { GET, POST } from '../../src/app/api/config/route'
import { FLAG_DEFS } from '@/lib/erp/flags'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth/session'
import { db } from '@/lib/db'

const TS = Date.now()
const ADMIN_EMAIL = `flagadmin-${TS}@fiberpro.local`
const PEON_EMAIL = `flagpeon-${TS}@fiberpro.local`
let adminId = ''
let peonId = ''

// flags this test touches — captured pre-test, restored post-test
const TOUCHED = ['po_bud', 'grn_dev'] as const
const preValues: Record<string, string | null> = {}

afterAll(async () => {
  for (const name of TOUCHED) {
    const key = `flag:${name}`
    if (preValues[name] === null) {
      await db.appOption.deleteMany({ where: { key } }).catch(() => {})
    } else if (preValues[name] !== undefined) {
      await db.appOption
        .update({ where: { key }, data: { value: preValues[name]! } })
        .catch(() => {})
    }
  }
  await db.user.deleteMany({ where: { email: { startsWith: `flagadmin-${TS}` } } }).catch(() => {})
  await db.user.deleteMany({ where: { email: { startsWith: `flagpeon-${TS}` } } }).catch(() => {})
  await db.$disconnect()
})

beforeEach(async () => {
  for (const k of Object.keys(cookieStore)) delete cookieStore[k]
  if (!adminId) {
    const a = await db.user.create({ data: { email: ADMIN_EMAIL, name: 'Flag Admin', role: 'admin' } })
    adminId = a.id
    for (const name of TOUCHED) {
      const row = await db.appOption.findUnique({ where: { key: `flag:${name}` } })
      preValues[name] = row?.value ?? null
    }
  }
  if (!peonId) {
    const p = await db.user.create({ data: { email: PEON_EMAIL, name: 'Flag Peon', role: 'merchandiser' } })
    peonId = p.id
  }
})

function req(body: unknown): Request {
  return new Request('http://localhost/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as any
}

async function loginAs(id: string) {
  cookieStore[SESSION_COOKIE] = await createSessionToken(id)
}

describe('flag registry shape (LLD-07, SPEC-M11)', () => {
  it('has exactly 38 defs with unique names (28 LLD-07 + 4 M13 notification + M41 po_appr + M42 INV ×5)', () => {
    expect(FLAG_DEFS.length).toBe(38)
    const names = FLAG_DEFS.map((f) => f.name)
    expect(new Set(names).size).toBe(38)
  })

  it('every def has a valid valueType, category and non-trivial description', () => {
    for (const f of FLAG_DEFS) {
      expect(['number', 'boolean', 'string'], f.name).toContain(f.valueType)
      expect(['tolerance', 'numbering', 'module', 'commercial', 'company', 'notification'], f.name).toContain(f.category)
      expect(f.description.length, `${f.name} description`).toBeGreaterThanOrEqual(10)
    }
  })

  it('populates the known categories with the expected counts', () => {
    const byCat = (c: string) => FLAG_DEFS.filter((f) => f.category === c).length
    expect(byCat('tolerance')).toBe(22) // M42 block_negative_stock joins
    expect(byCat('commercial')).toBe(6) // M41 po_appr joins
    expect(byCat('module')).toBe(5) // gendcdays + M42 waste_godown_code/waste_scrap_rate/opn_fy_gate/opn_fy_window_days
    expect(byCat('company')).toBe(1)
    expect(byCat('notification')).toBe(4) // SPEC-M9 §9 M13
  })

  it('defaults are well-formed (finite numbers, parseable booleans)', () => {
    for (const f of FLAG_DEFS) {
      if (f.valueType === 'number') expect(Number.isFinite(Number(f.value)), f.name).toBe(true)
      if (f.valueType === 'boolean') expect(['true', 'false'], f.name).toContain(f.value)
    }
  })
})

describe('/api/config route (SPEC-M11 C1)', () => {
  it('GET without a session → 401 (guarded since M11)', async () => {
    const res = await GET()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Authentication required' })
  })

  it('POST without a session → 401', async () => {
    const res = await POST(req({ name: 'po_bud', value: 'false' }) as any)
    expect(res.status).toBe(401)
  })

  it('POST logged-in non-admin → 403', async () => {
    await loginAs(peonId)
    const res = await POST(req({ name: 'po_bud', value: 'false' }) as any)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Admin role required' })
  })

  it('POST empty body → 400', async () => {
    await loginAs(adminId)
    const res = await POST(req(null) as any)
    expect(res.status).toBe(400)
  })

  it('POST missing value → 400', async () => {
    await loginAs(adminId)
    const res = await POST(req({ name: 'po_bud' }) as any)
    expect(res.status).toBe(400)
  })

  it('POST unknown flag → 400 with the drift-safe message (never 500)', async () => {
    await loginAs(adminId)
    const res = await POST(req({ name: 'evil_flag_not_in_registry', value: '1' }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/not in the registry/)
  })

  it('POST non-finite number for a number flag → 400', async () => {
    await loginAs(adminId)
    const res = await POST(req({ name: 'grn_dev', value: 'not-a-number' }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/expects a number/)
  })

  it('admin flips a boolean → 200 typed response + AppOption row persisted', async () => {
    await loginAs(adminId)
    const res = await POST(req({ name: 'po_bud', value: false }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.flag.name).toBe('po_bud')
    expect(body.flag.value).toBe(false)
    expect(body.flag.stored).toBe('false')
    expect(body.flag.valueType).toBe('boolean')
    expect(body.flag.category).toBe('tolerance')
    const row = await db.appOption.findUnique({ where: { key: 'flag:po_bud' } })
    expect(row?.value).toBe('false')
  })

  it('admin sets a number (string body) → 200 typed number + row persisted', async () => {
    await loginAs(adminId)
    const res = await POST(req({ name: 'grn_dev', value: '7' }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.flag.value).toBe(7)
    expect(body.flag.valueType).toBe('number')
    const row = await db.appOption.findUnique({ where: { key: 'flag:grn_dev' } })
    expect(row?.value).toBe('7')
  })

  it('GET (admin) reflects the typed values + the 38-entry registry', async () => {
    await loginAs(adminId)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.flags.po_bud).toBe(false)
    expect(body.flags.grn_dev).toBe(7)
    expect(Object.keys(body.flags).length).toBe(38)
    expect(body.registry.length).toBe(38)
    expect(body.registry[0]).toMatchObject({ name: expect.any(String), valueType: expect.any(String) })
  })
})

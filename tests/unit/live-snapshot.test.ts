/**
 * M9 Wave A — live tracker unit tests.
 *
 *  - assessHealth(): the pure threshold rules (db down wins; latency and
 *    approval-count warn thresholds).
 *  - LIVE_FAMILIES: registry shape — unique keys/models, every family has a
 *    doc-no field, the 12 flow families are pinned.
 *  - collectLiveSnapshot(): live shape against the dev DB — parity block
 *    mirrors parityStats(), families carry today/week counts, events cap at
 *    12 and arrive newest-first, workload keys always present.
 */
import { describe, it, expect, afterAll } from 'vitest'
import { db } from '@/lib/db'
import {
  assessHealth,
  collectLiveSnapshot,
  LIVE_FAMILIES,
  type HealthLevel,
} from '@/lib/erp/live-snapshot'
import { parityStats } from '@/lib/erp/menu-registry'

afterAll(async () => {
  await db.$disconnect().catch(() => {})
})

describe('live tracker — assessHealth thresholds (pure)', () => {
  const base = { dbOk: true, dbLatencyMs: 5, pendingApprovals: 0 }

  it('db down is ALWAYS health=down, regardless of other inputs', () => {
    expect(assessHealth({ ...base, dbOk: false })).toBe<HealthLevel>('down')
    expect(assessHealth({ dbOk: false, dbLatencyMs: 999, pendingApprovals: 999 })).toBe<HealthLevel>('down')
  })

  it('latency over 250ms warns; 250ms exactly is still ok', () => {
    expect(assessHealth({ ...base, dbLatencyMs: 250 })).toBe<HealthLevel>('ok')
    expect(assessHealth({ ...base, dbLatencyMs: 251 })).toBe<HealthLevel>('warn')
  })

  it('pending approvals over 50 warn; 50 exactly is still ok', () => {
    expect(assessHealth({ ...base, pendingApprovals: 50 })).toBe<HealthLevel>('ok')
    expect(assessHealth({ ...base, pendingApprovals: 51 })).toBe<HealthLevel>('warn')
  })

  it('healthy inputs are ok', () => {
    expect(assessHealth({ dbOk: true, dbLatencyMs: 12, pendingApprovals: 7 })).toBe<HealthLevel>('ok')
  })
})

describe('live tracker — family registry shape', () => {
  it('has the 12 flow-critical families pinned', () => {
    expect(LIVE_FAMILIES.map((f) => f.key)).toEqual([
      'orders',
      'programs',
      'pos',
      'grns',
      'invoices',
      'payments',
      'production',
      'jobwork',
      'despatch',
      'journals',
      'samples',
      'gate',
    ])
  })

  it('keys and models are unique; labels + doc-no fields present', () => {
    expect(new Set(LIVE_FAMILIES.map((f) => f.key)).size).toBe(LIVE_FAMILIES.length)
    expect(new Set(LIVE_FAMILIES.map((f) => f.model)).size).toBe(LIVE_FAMILIES.length)
    for (const f of LIVE_FAMILIES) {
      expect(f.label.length).toBeGreaterThan(0)
      expect(f.noField).toMatch(/No$/) // the schema's unique doc-no convention
    }
  })

  it('every family model exists as a Prisma delegate', () => {
    for (const f of LIVE_FAMILIES) {
      expect((db as any)[f.model], f.model).toBeDefined()
    }
  })
})

describe('live tracker — collectLiveSnapshot shape (dev DB)', () => {
  it('returns a complete, internally consistent snapshot', async () => {
    const snap = await collectLiveSnapshot()

    // timestamp parses and is recent (within a minute)
    const ts = Date.parse(snap.ts)
    expect(Number.isFinite(ts)).toBe(true)
    expect(Math.abs(Date.now() - ts)).toBeLessThan(60_000)

    // health is one of the three levels and consistent with its inputs
    expect(['ok', 'warn', 'down']).toContain(snap.health)
    expect(snap.health).toBe(
      assessHealth({
        dbOk: snap.server.dbOk,
        dbLatencyMs: snap.server.dbLatencyMs,
        pendingApprovals: snap.workload.pendingApprovals,
      }),
    )

    // parity block mirrors parityStats() exactly (same source of truth)
    const p = parityStats()
    expect(snap.parity).toEqual({
      liveItems: p.liveItems,
      totalItems: p.totalItems,
      liveGroups: p.liveGroups,
      totalGroups: p.totalGroups,
      coveragePct: p.coveragePct,
      legacyLive: p.legacyLive,
      legacyMapped: p.legacyMapped,
    })

    // families: one entry per registry family, counts are numbers (-1 = query error)
    expect(snap.families).toHaveLength(LIVE_FAMILIES.length)
    for (const f of snap.families) {
      expect(Number.isInteger(f.today)).toBe(true)
      expect(Number.isInteger(f.week)).toBe(true)
      expect(f.week).toBeGreaterThanOrEqual(f.today) // today ⊆ week window
    }

    // events: capped at 12, newest first, every event carries kind/label/ref
    expect(snap.events.length).toBeLessThanOrEqual(12)
    for (let i = 1; i < snap.events.length; i++) {
      expect(snap.events[i - 1].ts >= snap.events[i].ts).toBe(true)
    }
    for (const e of snap.events) {
      expect(e.kind.length).toBeGreaterThan(0)
      expect(e.label.length).toBeGreaterThan(0)
      expect(e.ref.length).toBeGreaterThanOrEqual(0)
    }

    // workload keys all present
    for (const k of [
      'openOrders',
      'openPOs',
      'pendingApprovals',
      'draftInvoices',
      'activePrograms',
      'agentTurnsToday',
    ]) {
      expect(snap.workload).toHaveProperty(k)
    }
  })

  it('server block carries runtime diagnostics', async () => {
    const snap = await collectLiveSnapshot()
    expect(snap.server.dbOk).toBe(true) // the dev DB answers SELECT 1
    expect(snap.server.dbLatencyMs).toBeGreaterThanOrEqual(0)
    expect(snap.server.uptimeSec).toBeGreaterThanOrEqual(0)
    expect(snap.server.memoryRssMb).toBeGreaterThan(0)
    expect(snap.server.nodeEnv.length).toBeGreaterThan(0)
  })
})

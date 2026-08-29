/**
 * LIVE SNAPSHOT — the live tracker's single data collector (M9 Wave A).
 *
 * One function, `collectLiveSnapshot()`, gathers everything the /live page
 * renders: server health (db round-trip latency, uptime, RSS), parity stats
 * (reused verbatim from the menu registry — the parity tracker is the sibling
 * this view is modeled on), per-family document activity (today / 7-day
 * counts), workload counters (open orders/POs, pending approvals, drafts,
 * active programs, agent turns) and a merged recent-events feed.
 *
 * Design notes:
 *  - Reads ONLY. No schema change, no writes, no revalidation — safe to call
 *    from a page render, an API route or the SSE stream on every tick.
 *  - Family queries go through the (db as any)[model] delegate pattern already
 *    established in registers/resolve.ts (dynamic model access, config-driven).
 *  - `import type { LiveSnapshot }` is erased at compile time, so the client
 *    component can share the shape without dragging Prisma into the bundle.
 */
import { db } from '@/lib/db'
import { parityStats } from '@/lib/erp/menu-registry'

// ---------------------------------------------------------------------------
// Types (shared server → client via `import type`)
// ---------------------------------------------------------------------------

export type HealthLevel = 'ok' | 'warn' | 'down'

export interface LiveEvent {
  ts: string // ISO
  kind: string // family key | 'approval' | 'agent'
  label: string
  ref: string // doc no / entityId / user
  detail?: string
}

export interface LiveFamilyStat {
  key: string
  label: string
  today: number
  week: number
}

export interface LiveSnapshot {
  ts: string
  health: HealthLevel
  server: {
    dbOk: boolean
    dbLatencyMs: number
    uptimeSec: number
    memoryRssMb: number
    nodeEnv: string
  }
  parity: {
    liveItems: number
    totalItems: number
    liveGroups: number
    totalGroups: number
    coveragePct: number
    legacyLive: number
    legacyMapped: number
  }
  families: LiveFamilyStat[]
  workload: {
    openOrders: number
    openPOs: number
    pendingApprovals: number
    draftInvoices: number
    activePrograms: number
    agentTurnsToday: number
  }
  events: LiveEvent[]
}

// ---------------------------------------------------------------------------
// Family registry — the doc families the tracker watches. The 12 flow-critical
// families (money + chain); every entry has a UNIQUE doc-no field so events
// always carry a human reference.
// ---------------------------------------------------------------------------

export interface LiveFamily {
  key: string
  label: string
  model: keyof typeof db | string // Prisma delegate name (lowercase model)
  noField: string
}

export const LIVE_FAMILIES: LiveFamily[] = [
  { key: 'orders', label: 'Orders', model: 'order', noField: 'orderNo' },
  { key: 'programs', label: 'Programs', model: 'program', noField: 'programNo' },
  { key: 'pos', label: 'Purchase Orders', model: 'purchaseOrder', noField: 'poNo' },
  { key: 'grns', label: 'GRNs', model: 'gRN', noField: 'grnNo' },
  { key: 'invoices', label: 'Invoices', model: 'salesInvoice', noField: 'invoiceNo' },
  { key: 'payments', label: 'Payments', model: 'payment', noField: 'voucherNo' },
  { key: 'production', label: 'Production Entries', model: 'productionEntry', noField: 'bundleNo' },
  { key: 'jobwork', label: 'Jobwork DCs', model: 'jobworkOrder', noField: 'dcNo' },
  { key: 'despatch', label: 'Pcs Despatch', model: 'pcsDespatch', noField: 'dcNo' },
  { key: 'journals', label: 'Journals', model: 'journal', noField: 'voucherNo' },
  { key: 'samples', label: 'Samples', model: 'sample', noField: 'sampleNo' },
  { key: 'gate', label: 'Gate Entries', model: 'gateEntry', noField: 'entryNo' },
]

// ---------------------------------------------------------------------------
// Health assessment — pure, exported for unit tests.
// ---------------------------------------------------------------------------

export function assessHealth(input: {
  dbOk: boolean
  dbLatencyMs: number
  pendingApprovals: number
}): HealthLevel {
  if (!input.dbOk) return 'down'
  if (input.dbLatencyMs > 250) return 'warn'
  if (input.pendingApprovals > 50) return 'warn'
  return 'ok'
}

// ---------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
}

async function dbLatency(): Promise<{ dbOk: boolean; dbLatencyMs: number }> {
  const t0 = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return { dbOk: true, dbLatencyMs: Date.now() - t0 }
  } catch {
    return { dbOk: false, dbLatencyMs: Date.now() - t0 }
  }
}

export async function collectLiveSnapshot(): Promise<LiveSnapshot> {
  const todayStart = startOfToday()
  const weekStart = startOfWeek()

  // Health probe + workload counters run in parallel with the family sweep.
  const [latency, familyStats, familyEvents, workload] = await Promise.all([
    dbLatency(),
    (async () => {
      const out: LiveFamilyStat[] = []
      for (const f of LIVE_FAMILIES) {
        const model = (db as any)[f.model]
        if (!model) {
          out.push({ key: f.key, label: f.label, today: -1, week: -1 })
          continue
        }
        try {
          const [today, week] = await Promise.all([
            model.count({ where: { createdAt: { gte: todayStart } } }),
            model.count({ where: { createdAt: { gte: weekStart } } }),
          ])
          out.push({ key: f.key, label: f.label, today, week })
        } catch {
          out.push({ key: f.key, label: f.label, today: -1, week: -1 })
        }
      }
      return out
    })(),
    (async () => {
      // Latest 2 docs per family, merged with approvals + agent turns below.
      const events: LiveEvent[] = []
      for (const f of LIVE_FAMILIES) {
        const model = (db as any)[f.model]
        if (!model) continue
        try {
          const rows: Array<Record<string, unknown>> = await model.findMany({
            orderBy: { createdAt: 'desc' },
            take: 2,
            select: { createdAt: true, [f.noField]: true },
          })
          for (const r of rows) {
            events.push({
              ts: (r.createdAt as Date).toISOString(),
              kind: f.key,
              label: f.label,
              ref: String(r[f.noField] ?? '—'),
            })
          }
        } catch {
          /* family skipped on error — the feed stays useful */
        }
      }
      return events
    })(),
    (async () => {
      try {
        const [
          openOrders,
          openPOs,
          pendingApprovals,
          draftInvoices,
          activePrograms,
          agentTurnsToday,
        ] = await Promise.all([
          db.order.count({ where: { status: 'open' } }),
          db.purchaseOrder.count({ where: { status: { in: ['open', 'partial'] } } }),
          db.approval.count({ where: { status: 'pending' } }),
          db.salesInvoice.count({ where: { status: 'draft' } }),
          db.program.count({ where: { status: { in: ['open', 'in_progress'] } } }),
          db.agentTurn.count({ where: { createdAt: { gte: todayStart } } }),
        ])
        return {
          openOrders,
          openPOs,
          pendingApprovals,
          draftInvoices,
          activePrograms,
          agentTurnsToday,
        }
      } catch {
        return {
          openOrders: -1,
          openPOs: -1,
          pendingApprovals: -1,
          draftInvoices: -1,
          activePrograms: -1,
          agentTurnsToday: -1,
        }
      }
    })(),
  ])

  // Approvals + agent turns join the event feed (latest 3 each).
  const extraEvents: LiveEvent[] = []
  try {
    const approvals = await db.approval.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { entity: true, entityId: true, status: true, requestedBy: true, createdAt: true },
    })
    for (const a of approvals) {
      extraEvents.push({
        ts: a.createdAt.toISOString(),
        kind: 'approval',
        label: `Approval · ${a.entity}`,
        ref: a.entityId,
        detail: `${a.status} · by ${a.requestedBy}`,
      })
    }
  } catch {
    /* skipped */
  }
  try {
    const turns = await db.agentTurn.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { prompt: true, userId: true, createdAt: true },
    })
    for (const t of turns) {
      extraEvents.push({
        ts: t.createdAt.toISOString(),
        kind: 'agent',
        label: 'Agent turn',
        ref: t.userId,
        detail: t.prompt.slice(0, 60) + (t.prompt.length > 60 ? '…' : ''),
      })
    }
  } catch {
    /* skipped */
  }

  const events = [...familyEvents, ...extraEvents]
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, 12)

  const p = parityStats()
  const mem = process.memoryUsage()

  return {
    ts: new Date().toISOString(),
    health: assessHealth({
      dbOk: latency.dbOk,
      dbLatencyMs: latency.dbLatencyMs,
      pendingApprovals: workload.pendingApprovals,
    }),
    server: {
      dbOk: latency.dbOk,
      dbLatencyMs: latency.dbLatencyMs,
      uptimeSec: Math.round(process.uptime()),
      memoryRssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      nodeEnv: process.env.NODE_ENV ?? 'development',
    },
    parity: {
      liveItems: p.liveItems,
      totalItems: p.totalItems,
      liveGroups: p.liveGroups,
      totalGroups: p.totalGroups,
      coveragePct: p.coveragePct,
      legacyLive: p.legacyLive,
      legacyMapped: p.legacyMapped,
    },
    families: familyStats,
    workload,
    events,
  }
}

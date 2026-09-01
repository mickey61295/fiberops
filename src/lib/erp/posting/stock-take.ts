/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M42 INV-01 — the stock take cycle (ST-####). The append-only ledger
// becomes verifiable against physical reality: a take snapshots the godown's
// CurrentStock buckets (ALL FOUR uoms — buckets are multi-uom), the operator
// records physical counts, and COMMITTING auto-drafts one ADJ-#### leg per
// (line, uom) with non-zero variance (add/less, notes referencing the ST-,
// rate = the bucket's current WAC — a correction reprices nothing). State
// graph: open → counting → draft → committed (terminal). Free-form ADJ-
// stays as the manual correction door; the ST is the auditable one.
//
// Doors: the three agent tools + the /inventory/stock-take form actions —
// one service, both doors (ADR-001). ADJ numbers mint INSIDE the commit
// transaction (scan over tx) — the docKey unique anchor catches a racing
// mint LOUDLY (OPS-05), never a silent double-post.

import { db } from '@/lib/db'
import { postLedger, docKeyViolation } from './ledger'
import { resolveDocNo } from '../numbering'
import { dateOrIstToday } from '@/lib/erp/dates'
import type { DocPlanResult } from './types'
import type { StockTakeInput, StockCountInput, StockTakeAdvanceInput } from '../schemas/stock-take'

const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory', pcs: 'style' }
const UOM_COLS = ['kgs', 'mtrs', 'pcs', 'bags'] as const
type Uom = (typeof UOM_COLS)[number]

const EPS = 1e-9

/** ADJ-#### scanned over the transaction client (mints inside the commit —
 * StockLedger.docNo is NOT unique, count-don't-resolve, the stock-adj twin). */
async function nextAdjNo(tx: any): Promise<string> {
  const all = await tx.stockLedger.findMany({ where: { docNo: { startsWith: 'ADJ-' } }, select: { docNo: true } })
  const used = new Set(all.map((r: any) => r.docNo))
  let n = 1
  while (used.has(`ADJ-${String(n).padStart(4, '0')}`)) n++
  return `ADJ-${String(n).padStart(4, '0')}`
}

/** A line is fully counted when every uom with a non-zero SYSTEM qty has a
 *  non-null counted value (partial-uom counts don't freeze a draft). */
function uncountedUoms(line: any): string[] {
  const out: string[] = []
  for (const uom of UOM_COLS) {
    if (Math.abs(line[`system${uom[0].toUpperCase()}${uom.slice(1)}`] ?? 0) > EPS && line[`counted${uom[0].toUpperCase()}${uom.slice(1)}`] == null) {
      out.push(uom)
    }
  }
  return out
}

// ───────── create: snapshot the godown ─────────

export async function planStockTake(args: StockTakeInput): Promise<DocPlanResult> {
  const godown = await db.godown.findUnique({ where: { code: args.godownCode } })
  if (!godown) return { ok: false, error: `Godown ${args.godownCode} not found` }
  const where: any = { godownId: godown.id }
  if (args.itemType) {
    if (!ITEM_MODELS[args.itemType]) {
      return { ok: false, error: `itemType must be yarn | fabric | accessory | pcs (got '${args.itemType}')` }
    }
    where.itemType = args.itemType
  }
  const buckets = await db.currentStock.findMany({ where })
  const live = buckets.filter((b: any) => Math.abs(b.bags) > EPS || Math.abs(b.kgs) > EPS || Math.abs(b.mtrs) > EPS || Math.abs(b.pcs) > EPS)
  if (!live.length) {
    return { ok: false, error: `No stock buckets in godown ${args.godownCode}${args.itemType ? ` for itemType ${args.itemType}` : ''} — a count sheet needs something to count` }
  }

  const takeNo = await resolveDocNo('stockTake', 'takeNo', 'ST-')
  const takeDate = dateOrIstToday(args.takeDate)

  return {
    ok: true,
    text: `Proposed stock take ${takeNo} of godown ${args.godownCode}: ${live.length} item line${live.length === 1 ? '' : 's'} snapshotted from current stock (status open).`,
    summary: `Stock take | ${takeNo} | godown ${args.godownCode} | ${live.length} lines | ${live.reduce((s: number, b: any) => s + (b.kgs || 0), 0).toFixed(1)} kgs · ${live.reduce((s: number, b: any) => s + (b.pcs || 0), 0)} pcs on book`,
    creates: [
      { table: 'stockTake', data: { takeNo, godownId: godown.id, status: 'open', notes: args.notes ?? null, createdAt: takeDate } },
      ...live.map((b: any) => ({
        table: 'stockTakeLine',
        data: {
          takeId: `(${takeNo})`,
          itemType: b.itemType, itemId: b.itemId,
          systemBags: b.bags, systemKgs: b.kgs, systemMtrs: b.mtrs, systemPcs: b.pcs,
        },
      })),
    ],
    sideEffects: [
      'Counts are enterable while the take is open or counting',
      'Committing drafts one ADJ- per variance and marks the take committed (terminal)',
    ],
    async commit() {
      return db.$transaction(async (tx) => {
        const takeNoFinal = await resolveDocNo('stockTake', 'takeNo', 'ST-', takeNo)
        const take = await tx.stockTake.create({
          data: { takeNo: takeNoFinal, godownId: godown.id, status: 'open', notes: args.notes ?? null, createdAt: takeDate },
        })
        await tx.stockTakeLine.createMany({
          data: live.map((b: any) => ({
            takeId: take.id,
            itemType: b.itemType, itemId: b.itemId,
            systemBags: b.bags, systemKgs: b.kgs, systemMtrs: b.mtrs, systemPcs: b.pcs,
          })),
        })
        return { id: take.id, takeNo: takeNoFinal, status: take.status }
      })
    },
  }
}

// ───────── count entry: physical reality onto the sheet ─────────

export async function planStockTakeCount(args: StockCountInput): Promise<DocPlanResult> {
  const take = await db.stockTake.findUnique({ where: { takeNo: args.takeNo }, include: { lines: true } })
  if (!take) return { ok: false, error: `Stock take ${args.takeNo} not found` }
  if (take.status === 'draft') {
    return { ok: false, error: `Stock take ${args.takeNo} is already DRAFT — counts are frozen; re-open is not supported (correct with a new take after committing, or amend via ADJ-)` }
  }
  if (take.status === 'committed') {
    return { ok: false, error: `Stock take ${args.takeNo} is COMMITTED (terminal) — its variance ADJs are already posted` }
  }

  // StockTakeLine carries itemId only — resolve the input's itemCodes through
  // the item models (PITFALLS #44), and map the take's lines for errors.
  const codeByItemId = new Map<string, string>()
  for (const l of take.lines) {
    const model = ITEM_MODELS[l.itemType]
    const item = model ? await (db as any)[model].findUnique({ where: { id: l.itemId } }).catch(() => null) : null
    if (item) codeByItemId.set(l.itemId, (item.code ?? item.styleNo) ?? l.itemId)
  }
  const resolved: Array<{ line: any; patch: Record<string, number> }> = []
  const seen = new Set<string>()
  for (const c of args.lines) {
    const key = `${c.itemType}:${c.itemCode}`
    if (seen.has(key)) return { ok: false, error: `Duplicate count line ${c.itemType} ${c.itemCode} — combine into one line` }
    seen.add(key)
    const model = ITEM_MODELS[c.itemType]
    const item = model ? await (db as any)[model].findUnique({ where: { code: c.itemCode } }) : null
    const line = item ? take.lines.find((l: any) => l.itemType === c.itemType && l.itemId === item.id) : undefined
    if (!line || !item) {
      const lineList = take.lines.map((l: any) => `${l.itemType}/${codeByItemId.get(l.itemId) ?? l.itemId}`).join(', ')
      return { ok: false, error: `Stock take ${args.takeNo} has no ${c.itemType} line for ${c.itemCode} (its lines: ${lineList || 'none'})` }
    }
    const patch: Record<string, number> = {}
    for (const uom of UOM_COLS) {
      if (c[uom] != null) patch[`counted${uom[0].toUpperCase()}${uom.slice(1)}`] = c[uom]!
    }
    if (!Object.keys(patch).length) {
      return { ok: false, error: `Count line ${c.itemType} ${c.itemCode} carries no uom values — pass kgs/mtrs/pcs/bags` }
    }
    resolved.push({ line, patch })
  }

  return {
    ok: true,
    text: `Recording physical counts on ${take.takeNo}: ${resolved.length} line${resolved.length === 1 ? '' : 's'} updated.`,
    summary: `Count entry | ${take.takeNo} | ${resolved.length} lines | status stays ${take.status}`,
    updates: resolved.map(({ line, patch }) => ({ table: 'stockTakeLine', id: line.id, data: patch })),
    sideEffects: ['Advance the take to draft when every line is fully counted (each system-non-zero uom has a count)'],
    async commit() {
      return db.$transaction(async (tx) => {
        for (const { line, patch } of resolved) {
          await tx.stockTakeLine.update({ where: { id: line.id }, data: patch })
        }
        return { takeNo: take.takeNo, lines: resolved.length }
      })
    },
  }
}

// ───────── advance: the state graph + the variance ADJs ─────────

const NEXT_STATUS: Record<string, string | null> = { open: 'counting', counting: 'draft', draft: 'committed', committed: null }

export async function planStockTakeAdvance(args: StockTakeAdvanceInput): Promise<DocPlanResult> {
  const take = await db.stockTake.findUnique({ where: { takeNo: args.takeNo }, include: { lines: true } })
  if (!take) return { ok: false, error: `Stock take ${args.takeNo} not found` }
  const next = NEXT_STATUS[take.status]
  if (take.status === 'committed') {
    return { ok: false, error: `Stock take ${args.takeNo} is COMMITTED (terminal) — start a new take for the next cycle count` }
  }
  if (args.to !== next) {
    return { ok: false, error: `Stock take ${args.takeNo} is '${take.status}' — the only legal next step is '${next}' (asked for '${args.to}')` }
  }

  // draft: every line fully counted
  if (args.to === 'draft') {
    const incomplete = take.lines.filter((l: any) => uncountedUoms(l).length > 0)
    if (incomplete.length) {
      const codeByItemId = new Map<string, string>()
      for (const l of incomplete) {
        const model = ITEM_MODELS[l.itemType]
        const item = model ? await (db as any)[model].findUnique({ where: { id: l.itemId } }).catch(() => null) : null
        if (item) codeByItemId.set(l.itemId, (item.code ?? item.styleNo) ?? l.itemId)
      }
      const list = incomplete.slice(0, 8).map((l: any) => `${l.itemType}/${codeByItemId.get(l.itemId) ?? l.itemId} (missing ${uncountedUoms(l).join('/')})`).join('; ')
      return { ok: false, error: `${incomplete.length} line(s) not fully counted — ${list}${incomplete.length > 8 ? ' …' : ''}. Record the counts first (record_stock_counts).` }
    }
  }

  // committed: preview the variance legs (rates re-read at commit time)
  const legs: Array<{ line: any; uom: Uom; variance: number }> = []
  for (const l of take.lines) {
    for (const uom of UOM_COLS) {
      const cap = uom[0].toUpperCase() + uom.slice(1)
      const counted = l[`counted${cap}`]
      if (counted == null) continue
      const variance = (counted as number) - (l[`system${cap}`] ?? 0)
      if (Math.abs(variance) > EPS) legs.push({ line: l, uom, variance })
    }
  }

  return {
    ok: true,
    text: args.to === 'committed'
      ? `Committing ${take.takeNo}: ${legs.length} ADJ- variance leg${legs.length === 1 ? '' : 's'} will post (${legs.reduce((s, x) => s + Math.abs(x.variance), 0).toFixed(2)} units net) and the take becomes terminal.`
      : `Advancing ${take.takeNo} to '${args.to}'.`,
    summary: `Stock take advance | ${take.takeNo} | ${take.status} → ${args.to}${args.to === 'committed' ? ` | ${legs.length} variance legs` : ''}`,
    updates: [{ table: 'stockTake', id: take.id, data: { status: args.to, ...(args.notes?.trim() ? { notes: args.notes.trim() } : {}) } }],
    sideEffects: args.to === 'committed'
      ? [
          ...legs.map((x) => `ADJ- ${x.line.itemType} ${x.uom}: ${x.variance > 0 ? 'add' : 'less'} ${Math.abs(x.variance).toFixed(2)} (system → counted)`),
          'CurrentStock buckets move to the counted quantities',
        ]
      : [args.to === 'counting' ? 'Count entry stays available until draft' : 'Counts freeze — committing posts the variance ADJs'],
    async commit() {
      return db.$transaction(async (tx) => {
        if (args.to === 'committed') {
          const godownId = take.godownId
          for (const leg of legs) {
            const docNo = await nextAdjNo(tx)
            const cap = leg.uom[0].toUpperCase() + leg.uom.slice(1)
            const bucket = await tx.currentStock.findFirst({
              where: { itemType: leg.line.itemType, itemId: leg.line.itemId, godownId, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null },
            })
            const rate = bucket?.rate ?? 0
            const qty = Math.abs(leg.variance)
            const inQty = leg.variance > 0 ? { [leg.uom]: qty } as any : {}
            const outQty = leg.variance < 0 ? { [leg.uom]: qty } as any : {}
            await postLedger(tx, {
              txnType: leg.variance > 0 ? 'stock_adjustment_add' : 'stock_adjustment_less',
              itemType: leg.line.itemType, itemId: leg.line.itemId, godownId,
              docNo, docKey: docNo, docDate: new Date(),
              rate, notes: `Stock take ${take.takeNo} — count variance`,
              in: inQty, out: outQty,
            })
          }
        }
        const updated = await tx.stockTake.update({
          where: { id: take.id },
          data: { status: args.to, ...(args.to === 'committed' ? { committedAt: new Date() } : {}), ...(args.notes?.trim() ? { notes: args.notes.trim() } : {}) },
        })
        return { id: updated.id, takeNo: updated.takeNo, status: updated.status, legs: args.to === 'committed' ? legs.length : 0 }
      }).catch((err: unknown) => {
        throw docKeyViolation(err, take.takeNo) ?? err
      })
    },
  }
}

// re-export for the pages/tools that need the live state math
export { uncountedUoms }

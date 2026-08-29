/**
 * SPEC-M18 §4-C3 (Wave C) — rate memory (playbook §7-R): the read-only
 * last_rate door. Given party + itemType + itemCode, return the most recent
 * PO or GRN line rate for that pair, so the New PO grid can auto-fill a blank
 * rate cell with what this supplier was last paid (the operator overrides by
 * typing — the fill only ever lands on a BLANK cell).
 *
 * Read-only: no writes, no ledger effects. Exposed via
 * GET /api/erp?resource=last_rate&party=&itemType=&itemCode= (session-guarded
 * with the rest of the /api/erp family).
 */
import { db } from '@/lib/db'

const ITEM_MODELS = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' } as const
export type RateMemoryItemType = keyof typeof ITEM_MODELS

export interface LastRateHit {
  rate: number
  /** which document family the rate came from */
  source: 'PO' | 'GRN'
  docNo: string
  /** yyyy-mm-dd */
  date: string
}

const iso = (dt: Date | null | undefined): string => (dt ? new Date(dt).toISOString().slice(0, 10) : '')

/**
 * Latest rate for party+item across POLine and GRNLine (whichever document is
 * newer wins). Cancelled POs are excluded; GRNs have no status to exclude.
 * Returns null when the pair has no history (caller leaves the cell blank).
 */
export async function findLastRate(
  partyCode: string,
  itemType: string,
  itemCode: string,
): Promise<LastRateHit | null> {
  const model = (ITEM_MODELS as Record<string, string | undefined>)[itemType]
  if (!model) return null
  const party = await db.party.findUnique({ where: { code: partyCode }, select: { id: true } })
  if (!party) return null
  const item = await (db as any)[model].findFirst({ where: { code: itemCode }, select: { id: true } })
  if (!item) return null

  const [poLine, grnLine] = await Promise.all([
    db.pOLine.findFirst({
      where: {
        itemType,
        itemId: item.id,
        po: { partyId: party.id, status: { not: 'cancelled' } },
      },
      orderBy: [{ po: { orderDate: 'desc' } }, { id: 'desc' }],
      select: { rate: true, po: { select: { poNo: true, orderDate: true } } },
    }),
    db.gRNLine.findFirst({
      where: { itemType, itemId: item.id, grn: { partyId: party.id } },
      orderBy: [{ grn: { grnDate: 'desc' } }, { id: 'desc' }],
      select: { rate: true, grn: { select: { grnNo: true, grnDate: true } } },
    }),
  ])

  const poTime = poLine?.po.orderDate ? new Date(poLine.po.orderDate).getTime() : 0
  const grnTime = grnLine?.grn.grnDate ? new Date(grnLine.grn.grnDate).getTime() : 0
  if (!poTime && !grnTime) return null

  if (grnTime >= poTime && grnLine) {
    return { rate: grnLine.rate, source: 'GRN', docNo: grnLine.grn.grnNo, date: iso(grnLine.grn.grnDate) }
  }
  if (poLine) {
    return { rate: poLine.rate, source: 'PO', docNo: poLine.po.poNo, date: iso(poLine.po.orderDate) }
  }
  return null
}

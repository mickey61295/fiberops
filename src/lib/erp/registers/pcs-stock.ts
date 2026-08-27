/**
 * Pcs Stock register service — SPEC-M4 §5 row 9 (FrmPieceStock family).
 * CurrentStock (itemType='pcs') + Godown, grouped style × godown (order drill).
 * Thin binding over queryStockRegister (variant='pcs') — one query path.
 */
import type { RegisterQuery, RegisterResult } from './types'
import { queryStockRegister } from './stock-register'

export async function queryPcsStock(q: RegisterQuery): Promise<RegisterResult> {
  // q search rides the stock-register grouping via item-code maps; the pcs
  // variant only surfaces style rows, so filter after grouping is unnecessary.
  const res = await queryStockRegister({ ...q, itemType: 'pcs', variant: 'pcs' })
  const rows = q.q
    ? res.rows.filter((r) => String(r.itemCode ?? '').toLowerCase().includes(q.q!.toLowerCase()))
    : res.rows
  const count = q.q ? rows.length : res.count
  return {
    ...res,
    rows,
    count,
    summary: `${count} pcs stock rows · value ₹${(res.totals?.find((t) => t.label === 'Value')?.value ?? 0).toLocaleString('en-IN')}`,
  }
}

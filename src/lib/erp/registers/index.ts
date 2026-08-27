/**
 * Register service registry — SPEC-M4 §4. The ONE place slug → query is
 * bound. Tests assert the bijection against register-configs (§12).
 * order-status is deliberately NOT here (board archetype — SPEC-M4 §10; the
 * Wave C board page + get_order_status tool import it directly).
 */
import type { RegisterQuery, RegisterResult } from './types'
import { queryStockLedger } from './stock-ledger'
import { queryOrderRegister } from './order-register'
import { queryDailyInOut } from './daily-inout'
import { queryInhandOrders } from './inhand'
import { queryPartyBalance } from './party-balance'
import { queryStockRegister } from './stock-register'
import { queryLots } from './lots'
import { queryIoHistory } from './io-history'
import { queryPcsStock } from './pcs-stock'
import { queryProductionStatus } from './production-status'
import { queryJobwork } from './jobwork'
import { queryBillsRegister } from './bills'
import { querySupplierBills } from './supplier-bills'
import { queryPartyLedger } from './party-ledger'
import { queryBudgetVsActual } from './budget'
import { queryApprovalAudit } from './approval-audit'
import { queryRateConfirmation } from './rate-confirmation'
import { queryPieceRates } from './piece-rates'
import { queryWages } from './wages'

export const REGISTER_SERVICES: Record<string, (q: RegisterQuery) => Promise<RegisterResult>> = {
  'stock-ledger': queryStockLedger,
  'order-register': queryOrderRegister,
  'daily-in-out': queryDailyInOut,
  'inhand-orders': queryInhandOrders,
  'party-balance': queryPartyBalance,
  'stock-register': queryStockRegister,
  'lot-tracking': queryLots,
  'io-history': queryIoHistory,
  'pcs-stock': queryPcsStock,
  'production-status': queryProductionStatus,
  'jobwork-register': queryJobwork,
  'bills-register': queryBillsRegister,
  'supplier-bills': querySupplierBills,
  'party-ledger': queryPartyLedger,
  'budget-vs-actual': queryBudgetVsActual,
  'approval-audit': queryApprovalAudit,
  'rate-confirmation': queryRateConfirmation,
  'piece-rate-confirmation': queryPieceRates,
  'production-wages': queryWages,
}

export type { RegisterQuery, RegisterResult, RegisterRow, RegisterTotal } from './types'

/**
 * Register service registry — SPEC-M4 §4. The ONE place slug → query is
 * bound. Tests assert the bijection against register-configs (§12).
 */
import type { RegisterQuery, RegisterResult } from './types'
import { queryStockLedger } from './stock-ledger'
import { queryOrderRegister } from './order-register'
import { queryDailyInOut } from './daily-inout'

export const REGISTER_SERVICES: Record<string, (q: RegisterQuery) => Promise<RegisterResult>> = {
  'stock-ledger': queryStockLedger,
  'order-register': queryOrderRegister,
  'daily-in-out': queryDailyInOut,
}

export type { RegisterQuery, RegisterResult, RegisterRow, RegisterTotal } from './types'

/**
 * Register config registry — SPEC-M4 §4/§7. Pure data; the SERVICE registry
 * (registers/index.ts) is bound by the same slug (tests assert bijection).
 */
import type { RegisterConfig } from './types'
import { stockLedgerConfig } from './stock-ledger'
import { orderRegisterConfig } from './order-register'
import { dailyInOutConfig } from './daily-in-out'
import { inhandOrdersConfig } from './inhand-orders'
import { partyBalanceConfig } from './party-balance'
import { stockRegisterConfig } from './stock-register'
import { lotTrackingConfig } from './lot-tracking'
import { ioHistoryConfig } from './io-history'
import { pcsStockConfig } from './pcs-stock'
import { productionStatusConfig } from './production-status'
import { jobworkRegisterConfig } from './jobwork-register'
import { billsRegisterConfig } from './bills-register'
import { supplierBillsConfig } from './supplier-bills'
import { partyLedgerConfig } from './party-ledger'
import { budgetVsActualConfig } from './budget-vs-actual'
import { approvalAuditConfig } from './approval-audit'
import { rateConfirmationConfig } from './rate-confirmation'
import { pieceRateConfirmationConfig } from './piece-rate-confirmation'

export const REGISTER_CONFIGS: RegisterConfig[] = [
  stockLedgerConfig,
  orderRegisterConfig,
  dailyInOutConfig,
  inhandOrdersConfig,
  partyBalanceConfig,
  stockRegisterConfig,
  lotTrackingConfig,
  ioHistoryConfig,
  pcsStockConfig,
  productionStatusConfig,
  jobworkRegisterConfig,
  billsRegisterConfig,
  supplierBillsConfig,
  partyLedgerConfig,
  budgetVsActualConfig,
  approvalAuditConfig,
  rateConfirmationConfig,
  pieceRateConfirmationConfig,
]

export function getRegisterConfig(slug: string): RegisterConfig | undefined {
  return REGISTER_CONFIGS.find((c) => c.slug === slug)
}

export type { RegisterConfig, RegisterFilter, RegisterColumn } from './types'

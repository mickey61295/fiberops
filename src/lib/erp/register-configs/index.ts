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
import { jobworkerStatementConfig } from './jobworker-statement' // SPEC-M39 JWL-07
import { operatorStatementConfig } from './operator-statement' // SPEC-M45 L-01
import { billsRegisterConfig } from './bills-register'
import { supplierBillsConfig } from './supplier-bills'
import { partyLedgerConfig } from './party-ledger'
import { budgetVsActualConfig } from './budget-vs-actual'
import { approvalAuditConfig } from './approval-audit'
import { rateConfirmationConfig } from './rate-confirmation'
import { pieceRateConfirmationConfig } from './piece-rate-confirmation'
import { productionWagesConfig } from './wages'
import { programStatusConfig, currentStockConfig } from './m6-wave-c'
import {
  yarnStockConfig, fabricStockConfig, accStockConfig, generalStockConfig,
  itemwiseStockConfig, orderwisePcsConfig,
} from './material-stock'
import {
  cuttingRegisterConfig, lineIssueRegisterConfig, supplierPendingConfig,
  poRegisterConfig, supplierHistoryConfig,
} from './wave-b'
import { closingStockConfig } from './closing-stock'
import { auditLogConfig } from './audit-log'
import { attendanceConfig } from './attendance'
import { despatchRegisterConfig } from './despatch-register' // SPEC-M41 PRC-05
import { wastePercentConfig } from './waste-percent' // SPEC-M42 INV-05

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
  jobworkerStatementConfig, // SPEC-M39 (Phase-6B Batch 3) JWL-07
  operatorStatementConfig, // SPEC-M45 (Module L Batch 1) L-01
  billsRegisterConfig,
  supplierBillsConfig,
  partyLedgerConfig,
  budgetVsActualConfig,
  approvalAuditConfig,
  rateConfirmationConfig,
  pieceRateConfirmationConfig,
  productionWagesConfig,
  programStatusConfig, // SPEC-M6 §7-C-2
  currentStockConfig, // SPEC-M6 §7-C-3
  yarnStockConfig, // SPEC-M19 §1-B
  fabricStockConfig, // SPEC-M19 §1-B
  accStockConfig, // SPEC-M19 §1-B
  generalStockConfig, // SPEC-M19 §1-B
  itemwiseStockConfig, // SPEC-M19 §1-B
  orderwisePcsConfig, // SPEC-M19 §1-C
  cuttingRegisterConfig, // SPEC-M19 §2 Wave B
  lineIssueRegisterConfig, // SPEC-M19 §2 Wave B
  supplierPendingConfig, // SPEC-M19 §2 Wave B
  poRegisterConfig, // SPEC-M19 §2 Wave B
  supplierHistoryConfig, // SPEC-M19 §2 Wave B
  closingStockConfig, // SPEC-M19 §4 Wave D
  auditLogConfig, // SPEC-M9 §9 M15 — admin audit viewer
  attendanceConfig, // SPEC-M20 (Gap D) — attendance day-book
  despatchRegisterConfig, // SPEC-M41 (Phase-6B Batch 5) PRC-05 — despatch day-book
  wastePercentConfig, // SPEC-M42 (Phase-6B Batch 6) INV-05 — waste % KPI
]

export function getRegisterConfig(slug: string): RegisterConfig | undefined {
  return REGISTER_CONFIGS.find((c) => c.slug === slug)
}

export type { RegisterConfig, RegisterFilter, RegisterColumn } from './types'

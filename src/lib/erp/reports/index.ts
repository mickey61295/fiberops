/**
 * Report service registry — SPEC-M6 §4. The ONE place report slug → query is
 * bound (the registers/index.ts twin). 28 entries: 16 BINDINGS to existing
 * register services (a report and its register share ONE service — never
 * fork a query) + 12 new aggregates. Tests assert the bijection against
 * report-configs (§12-1). (M30: the 15/13 split in the old header was
 * stale — gap-audit §8-3; 16+12 verified by grep.)
 */
import type { RegisterQuery, RegisterResult } from '../registers/types'
import { REGISTER_SERVICES } from '../registers'
import {
  queryLineWip,
  queryRejectionSummary,
  queryOperationSummary,
  queryExpensesSummary,
  querySampleStatus,
  queryLabTestsReport,
  queryCostSheetSummary,
} from './core-reports'
import {
  queryOrderStatusSummary,
  queryDespatchPackingSummary,
  queryOutstandingSummary,
  queryGstSummary,
  queryDailyPnl,
} from './chain-money-reports'

export type ReportService = (q: RegisterQuery) => Promise<RegisterResult>

/** Bind a register service as a report service (same query shape). */
const bind = (slug: string): ReportService => {
  const svc = REGISTER_SERVICES[slug]
  if (!svc) throw new Error(`report binding: register service '${slug}' not found`)
  return svc as ReportService
}

export const REPORT_SERVICES: Record<string, ReportService> = {
  // ---- bindings (16): ONE service, two screens ----
  'order-register': bind('order-register'),
  'inhand-orders': bind('inhand-orders'),
  'production-status': bind('production-status'),
  'daily-in-out': bind('daily-in-out'),
  'stock-register': bind('stock-register'),
  'stock-ledger': bind('stock-ledger'),
  'lot-tracking': bind('lot-tracking'),
  'io-history': bind('io-history'),
  'bills-register': bind('bills-register'),
  'supplier-bills': bind('supplier-bills'),
  'party-ledger': bind('party-ledger'),
  'party-balance': bind('party-balance'),
  'budget-vs-actual': bind('budget-vs-actual'),
  'production-wages': bind('production-wages'),
  'approval-audit': bind('approval-audit'),
  'current-stock': bind('current-stock'), // M6-C: the /inventory/stock register landed — bind, don't fork
  // ---- new aggregates (12) ----
  'line-wip': queryLineWip,
  'rejection-summary': queryRejectionSummary,
  'operation-summary': queryOperationSummary,
  'expenses-summary': queryExpensesSummary,
  'sample-status': querySampleStatus,
  'lab-tests': queryLabTestsReport,
  'cost-sheet-summary': queryCostSheetSummary,
  'order-status-summary': queryOrderStatusSummary,
  'despatch-packing-summary': queryDespatchPackingSummary,
  'outstanding-summary': queryOutstandingSummary,
  'gst-summary': queryGstSummary,
  'daily-unit-pnl': queryDailyPnl,
}

export function getReportService(slug: string): ReportService | undefined {
  return REPORT_SERVICES[slug]
}

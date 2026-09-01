/**
 * PRINT_DOCS registry — SPEC-M8 §3: docType → fetcher. ONE route serves all
 * families (`/print/[docType]/[id]`). Wave A: the 5 print-critical families
 * (fetchers.ts); Wave B: the remaining 15 doc detail families
 * (fetchers-b.ts) — every doc detail page can now print (SPEC-M8 §2).
 */
import type { PrintFetcher } from './types'
import { fetchInvoicePrint, fetchPoPrint, fetchGrnPrint, fetchPaymentPrint, fetchDcPrint } from './fetchers'
import { fetchOrderPrint } from './fetchers-order'
import {
  fetchDebitNotePrint,
  fetchJournalPrint,
  fetchBudgetPrint,
  fetchCostSheetPrint,
  fetchExpensePrint,
  fetchCutOrderPrint,
  fetchBundleLabelsPrint,
  fetchBundleLabelPrint,
  fetchGateEntryPrint,
  fetchGatePassPrint,
  fetchSamplePrint,
  fetchPcsDespatchPrint,
  fetchPackingListPrint,
  fetchRejectionPrint,
  fetchProductionEntryPrint,
  fetchLineIssuePrint,
  fetchLabTestPrint,
  fetchStockTakePrint, // SPEC-M42 INV-01 — the count sheet
} from './fetchers-b'

export const PRINT_DOCS: Record<string, PrintFetcher> = {
  // SPEC-M18 §2-A1: the order sheet — previously unprintable (gap audit §3)
  order: fetchOrderPrint,
  invoice: fetchInvoicePrint,
  po: fetchPoPrint,
  grn: fetchGrnPrint,
  payment: fetchPaymentPrint,
  dc: fetchDcPrint,
  // Wave B — SPEC-M8 §2: the remaining 15 doc detail families
  'debit-note': fetchDebitNotePrint,
  journal: fetchJournalPrint,
  budget: fetchBudgetPrint,
  'cost-sheet': fetchCostSheetPrint,
  expense: fetchExpensePrint,
  'cut-order': fetchCutOrderPrint,
  // SPEC-M33 — the bundle sticker sheet (cut order) + the single reprint
  'bundle-labels': fetchBundleLabelsPrint,
  'bundle-label': fetchBundleLabelPrint,
  'gate-entry': fetchGateEntryPrint,
  'gate-pass': fetchGatePassPrint,
  sample: fetchSamplePrint,
  'pcs-despatch': fetchPcsDespatchPrint,
  'packing-list': fetchPackingListPrint,
  rejection: fetchRejectionPrint,
  'production-entry': fetchProductionEntryPrint,
  'line-issue': fetchLineIssuePrint,
  'lab-test': fetchLabTestPrint,
  // SPEC-M42 INV-01 — the stock-take count sheet
  'stock-take': fetchStockTakePrint,
}

export function getPrintDocTypes(): string[] {
  return Object.keys(PRINT_DOCS)
}

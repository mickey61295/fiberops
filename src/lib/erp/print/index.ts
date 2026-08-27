/**
 * PRINT_DOCS registry — SPEC-M8 §3: docType → fetcher. ONE route serves all
 * families (`/print/[docType]/[id]`). Wave A: the 5 print-critical families
 * (fetchers.ts); Wave B: the remaining 15 doc detail families
 * (fetchers-b.ts) — every doc detail page can now print (SPEC-M8 §2).
 */
import type { PrintFetcher } from './types'
import { fetchInvoicePrint, fetchPoPrint, fetchGrnPrint, fetchPaymentPrint, fetchDcPrint } from './fetchers'
import {
  fetchDebitNotePrint,
  fetchJournalPrint,
  fetchBudgetPrint,
  fetchCostSheetPrint,
  fetchExpensePrint,
  fetchCutOrderPrint,
  fetchGateEntryPrint,
  fetchGatePassPrint,
  fetchSamplePrint,
  fetchPcsDespatchPrint,
  fetchPackingListPrint,
  fetchRejectionPrint,
  fetchProductionEntryPrint,
  fetchLineIssuePrint,
  fetchLabTestPrint,
} from './fetchers-b'

export const PRINT_DOCS: Record<string, PrintFetcher> = {
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
  'gate-entry': fetchGateEntryPrint,
  'gate-pass': fetchGatePassPrint,
  sample: fetchSamplePrint,
  'pcs-despatch': fetchPcsDespatchPrint,
  'packing-list': fetchPackingListPrint,
  rejection: fetchRejectionPrint,
  'production-entry': fetchProductionEntryPrint,
  'line-issue': fetchLineIssuePrint,
  'lab-test': fetchLabTestPrint,
}

export function getPrintDocTypes(): string[] {
  return Object.keys(PRINT_DOCS)
}

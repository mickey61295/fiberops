/**
 * PRINT_DOCS registry — SPEC-M8 §3: docType → fetcher. ONE route serves all
 * families (`/print/[docType]/[id]`). Wave A: the 5 print-critical families;
 * Wave B+ families are each a ~40-line fetcher away (SPEC-M8 §2).
 */
import type { PrintFetcher } from './types'
import { fetchInvoicePrint, fetchPoPrint, fetchGrnPrint, fetchPaymentPrint, fetchDcPrint } from './fetchers'

export const PRINT_DOCS: Record<string, PrintFetcher> = {
  invoice: fetchInvoicePrint,
  po: fetchPoPrint,
  grn: fetchGrnPrint,
  payment: fetchPaymentPrint,
  dc: fetchDcPrint,
}

export function getPrintDocTypes(): string[] {
  return Object.keys(PRINT_DOCS)
}

/**
 * PRINT_DOC_BY_DOCTYPE — doc-config docType → /print docType map (SPEC-M17 §2-D).
 *
 * WHY a separate module: print/index.ts imports the db (server-only); DocScreen is
 * a client component and cannot import it. This map is pure data — importable from
 * client, server AND vitest.
 *
 * Scope (frozen): ONLY the 20 families the doc VIEW pages already print via
 * DocPrintLink (the exact set asserted by tests/unit/print-doc-map.test.ts). The
 * variant families (local-invoice, multi-process-grn, courier-dc, opening-stock,
 * cutting-production, panel-*, rework, pcs-transfer, …) are deliberately UNMAPPED
 * here — they join with the print-fidelity milestone (SPEC-M17 §3 non-goals).
 */

export const PRINT_DOC_BY_DOCTYPE: Record<string, string> = {
  // accounts
  invoice: 'invoice',
  'debit-note': 'debit-note',
  payment: 'payment',
  journal: 'journal',
  // procurement
  'purchase-order': 'po',
  grn: 'grn',
  // costing
  'cost-sheet': 'cost-sheet',
  budget: 'budget',
  expense: 'expense',
  // cutting / production
  cut: 'cut-order',
  production: 'production-entry',
  'line-issue': 'line-issue',
  // pieces / dispatch
  despatch: 'pcs-despatch',
  'packing-list': 'packing-list',
  rejection: 'rejection',
  'gate-entry': 'gate-entry',
  'gate-pass': 'gate-pass',
  // jobwork (the DC print is the jobwork delivery challan)
  'jobwork-out': 'dc',
  // quality / orders
  'lab-test': 'lab-test',
  sample: 'sample',
}

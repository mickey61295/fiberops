/**
 * SPEC-M18 §4-C2 (Wave C) — the Duplicate door's route map: doc slug → the
 * family's New-form route. PURE DATA, client-safe (no server imports — the
 * same neutrality rule as print/doc-type-map.ts).
 *
 * Mirrors the SLUG_REVALIDATE keys in lib/erp/doc-actions.ts (every doc
 * family that has a New screen). Verified by tests/unit/doc-view-actions.test:
 * every key resolves against the doc-config registry and every route is a
 * LIVE_ROUTES member — a wrong route here fails the suite, not the operator.
 *
 * Duplicate mechanics (client-only, zero server work): DocViewActions stashes
 * the viewed doc { docNo, header, lines } in sessionStorage under
 * `fo.duplicate.<slug>` and pushes this route; the New DocScreen consumes the
 * stash once on mount (skips the number field — fresh auto number), seeds
 * header + lines, and toasts the source doc.
 */
export const NEW_ROUTE_BY_SLUG: Record<string, string> = {
  order: '/orders/new',
  program: '/programs/new',
  'purchase-order': '/procurement/po',
  grn: '/procurement/grn',
  'jobwork-out': '/jobwork/order',
  'jobwork-in': '/jobwork/receipt',
  cut: '/cutting/job-order',
  'line-issue': '/production/issue',
  production: '/production/entry',
  rework: '/production/rework',
  rejection: '/pieces/rejection',
  despatch: '/pieces/despatch',
  'courier-dc': '/dispatch/courier',
  loading: '/dispatch/loading',
  invoice: '/accounts/invoice',
  'debit-note': '/accounts/debit-note',
  'supplier-bill': '/accounts/bill', // SPEC-M40 PAY-03
  payment: '/accounts/payments',
  journal: '/accounts/journal',
  'cost-sheet': '/costing/cost-sheet',
  'stock-adjustment': '/inventory/adjustment',
  'godown-transfer': '/inventory/transfer',
  // M5 Wave A
  budget: '/costing/budget',
  'commercial-invoice': '/orders/commercial-invoice',
  'local-invoice': '/accounts/invoice/local',
  'piece-jobwork-invoice': '/accounts/invoice/piece',
  'supplier-order': '/procurement/supplier-orders',
  // M5 Wave B
  'finished-goods': '/pieces/finished-goods',
  'operation-entry': '/production/operations',
  'bundle-barcode': '/production/bundles',
  'panel-production': '/cutting/panel-production',
  'panel-excess': '/cutting/panel-excess',
  'panel-rej-rework': '/cutting/panel-rework',
  'fabric-rejection-return': '/cutting/fab-rejection',
  'pcs-shortage': '/pieces/shortage',
  'panel-cutting': '/cutting/panel',
  'line-transfer': '/production/line-transfer',
  'jobwork-pcs-return': '/jobwork/pcs-return',
  'costing-input': '/costing/input',
  'wage-payments': '/hr/wage-payments',
  // M5 Wave D
  sample: '/orders/samples',
  'gate-entry': '/dispatch/gate-entry',
  'gate-pass': '/dispatch/gate-pass',
  'packing-list': '/pieces/packing-list',
  'lab-test': '/quality/lab-tests',
  expense: '/costing/expenses',
  'roll-split': '/inventory/rolls',
  'contract-allotment': '/jobwork/contract',
  'program-allotment': '/programs/allotment',
  'production-bill': '/accounts/production-bills',
  // M6 Wave D
  'multi-process-grn': '/procurement/grn/multi-process',
  'dc-return': '/dispatch/dc-return',
  'dc-entry': '/dispatch/dc',
  'process-dc': '/dispatch/dc/process',
  'pcs-transfer': '/pieces/transfer',
  'ready-to-cut': '/cutting/ready-to-cut',
  'opening-stock': '/inventory/opening-stock',
  'waste-receipt': '/inventory/waste-receipt', // SPEC-M21 — the DocScreen IS the new route (no [id] view)
  'cutting-issue': '/cutting/issue',
  'cutting-production': '/cutting/production',
  'line-output': '/production/line-output',
}

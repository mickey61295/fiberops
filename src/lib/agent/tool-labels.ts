/* CHAT-12 (Phase-6B Batch 2, SPEC-M38 §1) — humanized tool labels.
 *
 * Tool chips showed raw snake_case names (create_purchase_order,
 * get_party_ledger) — machine identifiers in a human conversation. This map
 * gives the ~45 most-reached tools an operator-facing label; everything
 * else falls back to a prettifier (underscores → words, create/get prefixes
 * expanded). The raw name stays available in the expandable args section.
 */

const LABELS: Record<string, string> = {
  create_order: 'Create sales order',
  get_order: 'View order',
  list_orders: 'List orders',
  update_order: 'Update order',
  create_sample: 'Create sample',
  create_packing_list: 'Create packing list',
  create_purchase_order: 'Create purchase order',
  get_purchase_order: 'View purchase order',
  list_purchase_orders: 'List purchase orders',
  create_supplier_order: 'Create supplier order',
  receive_grn: 'Receive GRN',
  accept_grn: 'Accept GRN',
  get_stock: 'Check stock',
  get_stock_ledger: 'Stock ledger',
  transfer_stock: 'Transfer stock',
  post_stock_adjustment: 'Adjust stock',
  create_stock_take: 'Stock take',
  record_stock_counts: 'Record counts',
  advance_stock_take: 'Advance take',
  create_payroll_run: 'Payroll run',
  commit_payroll_run: 'Commit payroll',
  create_gate_entry: 'Gate entry',
  create_gate_pass: 'Gate pass',
  create_cut_order: 'Create cut order',
  list_cut_orders: 'List cut orders',
  get_bundle: 'Scan bundle',
  create_program: 'Create program',
  issue_to_line: 'Issue to line',
  post_production_entry: 'Production entry',
  post_finished_goods: 'Finished goods',
  scan_bundle: 'Scan bundle',
  get_line_status: 'Line status',
  get_program_status: 'Program status',
  create_jobwork_order: 'Jobwork DC out',
  receive_jobwork: 'Receive jobwork',
  return_jobwork_pcs: 'Return jobwork pcs',
  list_jobworks: 'List jobworks',
  accept_jobwork_pcs: 'Accept jobwork (GAN)',
  bill_jobwork: 'Bill jobwork',
  list_jobworker_statement: 'Jobworker statement',
  create_pcs_despatch: 'Despatch pcs',
  list_despatches: 'List despatches',
  create_sales_invoice: 'Create invoice',
  create_commercial_invoice: 'Commercial invoice',
  record_payment: 'Record payment',
  create_journal: 'Create journal',
  // SPEC-M40 (Batch 4, PAY) — the supplier-bill + reversal doors
  create_supplier_bill: 'Create supplier bill',
  create_bill_pass: 'Pass supplier bill',
  // SPEC-M41 (Phase-6B Batch 5, PRC)
  update_purchase_order: 'Amend purchase order',
  create_purchase_return: 'Purchase return',
  list_purchase_returns: 'List purchase returns',
  deliver_dc: 'DC delivery',
  clear_gate_entry: 'Clear gate entry',
  cancel_payment: 'Reverse payment',
  cancel_journal: 'Reverse journal',
  cancel_debit_note: 'Cancel debit note',
  cancel_expense: 'Cancel expense',
  cancel_budget: 'Cancel budget',
  get_party_ledger: 'Party ledger',
  list_invoices: 'List invoices',
  list_debit_notes: 'List debit notes',
  create_cost_sheet: 'Cost sheet',
  create_budget: 'Create budget',
  create_expense: 'Create expense',
  get_cost_sheet: 'View cost sheet',
  get_budget_vs_actual: 'Budget vs actual',
  create_lab_test: 'Lab test',
  list_test_parameters: 'Test parameters',
  pay_wages: 'Pay wages',
  list_employees: 'List employees',
  list_shifts: 'List shifts',
  get_pending_approvals: 'Pending approvals',
  approve_pending: 'Approve pending',
  suggest_next_step: 'Suggest next step',
  get_order_status: 'Order status',
  list_documents: 'List documents',
  extract_document: 'Read document',
  render_report: 'Render report',
  get_daily_digest: 'Daily digest',
  get_dashboard_kpis: 'Dashboard KPIs',
  get_live_activity: 'Live activity',
  get_working_days: 'Working days',
  get_bundle_label: 'Bundle label',
  receive_waste: 'Receive waste',
  post_attendance: 'Post attendance',
  list_attendance: 'Attendance day-book',
  get_payroll_runs: 'Payroll runs',
}

/** The operator-facing label for a tool name. */
export function toolLabel(name: string): string {
  if (LABELS[name]) return LABELS[name]
  return name
    .replace(/^get_/, 'View ')
    .replace(/^list_/, 'List ')
    .replace(/^create_/, 'Create ')
    .replace(/^update_/, 'Update ')
    .replace(/^post_/, 'Post ')
    .replace(/^receive_/, 'Receive ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Chip title: "Create sales order (create_order)" for hover/source truth. */
export function toolTitle(name: string): string {
  return `${toolLabel(name)} (${name})`
}

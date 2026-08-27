/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-33 — Production Bills (/accounts/production-bills, item
// 'production-bills'). Period piece-rate bill from ProductionEntry →
// Journal (Dr Production Wages / Cr Wage Payable — §7-B-20 accounts, with
// §7-D-33 per-dept/operator granularity). create_production_bill is the
// agent door. No doc number input — the V-#### voucher is assigned at post.
import type { DocConfig } from './types'
import { PRODUCTION_BILL_SCHEMA } from '../schemas/production-bill'
import { planProductionBill } from '../posting/production-bill'

export const productionBillConfig: DocConfig = {
  docType: 'production-bill',
  slug: 'production-bill',
  title: 'Production Bills (piece-rate)',
  numberPrefix: undefined,
  numberField: undefined,
  chainStage: undefined,
  schema: PRODUCTION_BILL_SCHEMA,
  service: { plan: (input: any) => planProductionBill(input) },
  headerFields: [
    { name: 'deptCode', label: 'Department (blank = all)', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'operatorCode', label: 'Operator (blank = all)', type: 'picker', picker: 'employee', colSpan: 1 },
    { name: 'from', label: 'Period From', type: 'date', colSpan: 1 },
    { name: 'to', label: 'Period To', type: 'date', colSpan: 1 },
    { name: 'narration', label: 'Narration override', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'voucherNo', label: 'Voucher' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
    { name: 'entries', label: 'Entries', align: 'right' },
    { name: 'qty', label: 'Pcs', align: 'right' },
    { name: 'narration', label: 'Narration' },
    { name: 'date', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['create_production_bill', 'get_production_wages'],
}

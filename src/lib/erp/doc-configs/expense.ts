/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-31 — Expenses (/costing/expenses, item 'expenses', legacy
// FrmExpenses family). EXP-#### docNo; stylewise expenses carry the order;
// party picker is the paid-to party. The create_expense tool is the agent door.
import type { DocConfig } from './types'
import { EXPENSE_SCHEMA } from '../schemas/expense'
import { planExpense } from '../posting/expense'

export const expenseConfig: DocConfig = {
  docType: 'expense',
  slug: 'expense',
  title: 'Expenses',
  numberPrefix: 'EXP-',
  numberField: 'expNo',
  chainStage: undefined,
  schema: EXPENSE_SCHEMA,
  service: { plan: (input: any) => planExpense(input) },
  headerFields: [
    { name: 'expNo', label: 'Expense No', type: 'text', colSpan: 1 },
    { name: 'expDate', label: 'Date', type: 'date', colSpan: 1 },
    { name: 'finYear', label: 'Fin Year', type: 'text', colSpan: 1 },
    { name: 'category', label: 'Category', type: 'select', required: true, colSpan: 1, options: [
      { value: 'fixed', label: 'Fixed' },
      { value: 'stylewise', label: 'Stylewise (order-linked)' },
      { value: 'general', label: 'General' },
      { value: 'transport', label: 'Transport' },
      { value: 'other', label: 'Other' },
    ] },
    { name: 'orderNo', label: 'Order No (stylewise)', type: 'text', colSpan: 1 },
    { name: 'partyCode', label: 'Paid To (party)', type: 'picker', picker: 'party', colSpan: 1 },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, colSpan: 1 },
    // SPEC-M51 M-02 (DE-03) — the GL debit leg (default by category:
    // transport → Freight [5020], else Other Expenses [5120]); credit leg =
    // Sundry Creditors with a party (settle via record_payment), else Cash/Bank.
    { name: 'glAccount', label: 'GL Expense Account', type: 'text', colSpan: 1, description: 'Optional — exact Account name or code (default: transport → Freight, else Other Expenses); a paid-to party credits Sundry Creditors, otherwise Cash/Bank' },
    { name: 'status', label: 'Status', type: 'select', colSpan: 1, options: [
      { value: 'recorded', label: 'Recorded' },
      { value: 'settled', label: 'Settled' },
    ] },
    { name: 'narration', label: 'Narration', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'expNo', label: 'Expense No' },
    { name: 'category', label: 'Category' },
    { name: 'orderNo', label: 'Order' },
    { name: 'partyName', label: 'Paid To' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
    { name: 'status', label: 'Status' },
    { name: 'expDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['create_expense', 'get_budget_vs_actual'],
}

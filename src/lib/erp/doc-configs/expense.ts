/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-31 — Expenses (/costing/expenses, item 'expenses', legacy
// FrmExpenses family). EXP-#### docNo; stylewise expenses carry the order;
// party picker is the paid-to party. The create_expense tool is the agent door.
// SPEC-M54 M-05 (EH-02): the head picker (the ExpenseHead master — legacy
// FrmMasExpenses port); the head sets category + the default GL debit leg
// (a direct category stays valid when no head is picked — the M51 path).
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
    // SPEC-M54 M-05 (EH-02) — the head picker; the head overrides a directly
    // picked category and refines the default GL debit leg.
    { name: 'head', label: 'Head', type: 'picker', picker: 'expense-head', colSpan: 1, description: 'The expense head — sets the category + the default GL account (create heads at /masters/expense-head); overrides the Category field when picked' },
    { name: 'category', label: 'Category', type: 'select', colSpan: 1, options: [
      { value: 'fixed', label: 'Fixed' },
      { value: 'stylewise', label: 'Stylewise (order-linked)' },
      { value: 'general', label: 'General' },
      { value: 'transport', label: 'Transport' },
      { value: 'other', label: 'Other' },
    ], description: 'Required when no head is picked — the head overrides it (SPEC-M54 M-05)' },
    { name: 'orderNo', label: 'Order No (stylewise)', type: 'text', colSpan: 1 },
    { name: 'partyCode', label: 'Paid To (party)', type: 'picker', picker: 'party', colSpan: 1 },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, colSpan: 1 },
    // SPEC-M51 M-02 (DE-03) — the GL debit leg (default by category:
    // transport → Freight [5020], else Other Expenses [5120]; SPEC-M54 M-05:
    // the head's account wins over the category default); credit leg =
    // Sundry Creditors with a party (settle via record_payment), else Cash/Bank.
    { name: 'glAccount', label: 'GL Expense Account', type: 'text', colSpan: 1, description: 'Optional — exact Account name or code; precedence: this field > the head\'s account > the category default (transport → Freight, else Other Expenses); a paid-to party credits Sundry Creditors, otherwise Cash/Bank' },
    { name: 'status', label: 'Status', type: 'select', colSpan: 1, options: [
      { value: 'recorded', label: 'Recorded' },
      { value: 'settled', label: 'Settled' },
    ] },
    { name: 'narration', label: 'Narration', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'expNo', label: 'Expense No' },
    { name: 'category', label: 'Category' },
    { name: 'headName', label: 'Head' },
    { name: 'orderNo', label: 'Order' },
    { name: 'partyName', label: 'Paid To' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
    { name: 'status', label: 'Status' },
    { name: 'expDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['create_expense', 'get_budget_vs_actual', 'list_expense_heads'],
}

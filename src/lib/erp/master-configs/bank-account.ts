import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmMasBankAccount.
// SPEC-M51 M-02 (DE-01) — glAccountCode: the GL account this bank posts to.
// A CODE (or name), plain text on purpose (not an FK): the payment door
// resolves it through the CA-04 resolver at post time; unlinked banks fall
// back to the Cash/Bank control [1010] with a nag — payments never block.
export const bankAccountConfig: MasterConfig = {
  slug: 'bank-account', entity: 'bankAccount', label: 'Bank Accounts', singular: 'Bank Account',
  delegate: 'bankAccount', model: 'BankAccount', category: 'commercial',
  codeField: 'accountNo', codePrefix: 'ACC-', titleField: 'accountNo',
  searchFields: ["accountNo","branch","ifsc","bankName","glAccountCode"],
  defaultSort: { field: 'accountNo', dir: 'asc' },
  listColumns: [
    {field: 'accountNo',label: 'Account No',mono: true},
    {field: 'bankName',label: 'Bank',refEntity: 'bank'},
    {field: 'branch',label: 'Branch'},
    {field: 'ifsc',label: 'IFSC',mono: true},
    {field: 'accountType',label: 'Type'},
    {field: 'glAccountCode',label: 'GL Acct',mono: true},
  ],
  fields: [
    {name: 'accountNo',label: 'Account No',type: 'text',required: true},
    {name: 'bankCode',label: 'Bank',type: 'text',refEntity: 'bank',required: true,description: 'Bank code (e.g. BK-0001) or name'},
    {name: 'branch',label: 'Branch',type: 'text'},
    {name: 'ifsc',label: 'IFSC',type: 'text'},
    {name: 'accountType',label: 'Account type',type: 'select',options: [{value: "current",label: "Current"},{value: "savings",label: "Savings"},{value: "cc",label: "CC"},{value: "od",label: "OD"}]},
    {name: 'upi',label: 'UPI ID',type: 'text'},
    {name: 'glAccountCode',label: 'GL Account',type: 'text',description: 'The chart-of-accounts CODE this bank posts to (e.g. 1011) — payments naming this bank (bankAccountNo + a bank mode) journal to it; leave empty to post to the Cash/Bank control [1010] (with a note in the plan)'},
    {name: 'active',label: 'Active',type: 'checkbox',defaultValue: true},
  ],
  createTool: 'create_bank_account', updateTool: 'update_bank_account', listTool: 'list_bank_accounts',
  legacyForms: ['FrmMasBankAccount'],
}

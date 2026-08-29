import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmMasBankAccount.
export const bankAccountConfig: MasterConfig = {
  slug: 'bank-account', entity: 'bankAccount', label: 'Bank Accounts', singular: 'Bank Account',
  delegate: 'bankAccount', model: 'BankAccount', category: 'commercial',
  codeField: 'accountNo', codePrefix: 'ACC-', titleField: 'accountNo',
  searchFields: ["accountNo","branch","ifsc","bankName"],
  defaultSort: { field: 'accountNo', dir: 'asc' },
  listColumns: [
    {field: 'accountNo',label: 'Account No',mono: true},
    {field: 'bankName',label: 'Bank',refEntity: 'bank'},
    {field: 'branch',label: 'Branch'},
    {field: 'ifsc',label: 'IFSC',mono: true},
    {field: 'accountType',label: 'Type'},
  ],
  fields: [
    {name: 'accountNo',label: 'Account No',type: 'text',required: true},
    {name: 'bankCode',label: 'Bank',type: 'text',refEntity: 'bank',required: true,description: 'Bank code (e.g. BK-0001) or name'},
    {name: 'branch',label: 'Branch',type: 'text'},
    {name: 'ifsc',label: 'IFSC',type: 'text'},
    {name: 'accountType',label: 'Account type',type: 'select',options: [{value: "current",label: "Current"},{value: "savings",label: "Savings"},{value: "cc",label: "CC"},{value: "od",label: "OD"}]},
    {name: 'upi',label: 'UPI ID',type: 'text'},
    {name: 'active',label: 'Active',type: 'checkbox',defaultValue: true},
  ],
  createTool: 'create_bank_account', updateTool: 'update_bank_account', listTool: 'list_bank_accounts',
  legacyForms: ['FrmMasBankAccount'],
}

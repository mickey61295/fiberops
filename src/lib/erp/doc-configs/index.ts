// SPEC-M3 §7/§8 — the doc-config registry. Grows per wave (Wave C adds the
// chain configs — §8 rows 3-13; Wave D the accounts/inventory ones — rows
// 14-20).
import type { DocConfig } from './types'
import { orderConfig } from './order'
import { programConfig } from './program'
import { purchaseOrderConfig } from './purchase-order'
import { grnConfig } from './grn'
import { jobworkOutConfig, jobworkInConfig } from './jobwork'
import { cutConfig } from './cut'
import { lineIssueConfig } from './line-issue'
import { productionConfig, reworkConfig } from './production'
import { rejectionConfig } from './rejection'
import { despatchConfig } from './despatch'
import { invoiceConfig } from './invoice'
import { debitNoteConfig } from './debit-note'
import { paymentConfig } from './payment'
import { journalConfig } from './journal'
import { costSheetConfig } from './cost-sheet'
import { stockAdjustmentConfig } from './stock-adjustment'
import { godownTransferConfig } from './godown-transfer'
import { budgetConfig } from './budget'
import { commercialInvoiceConfig } from './commercial-invoice'
import { localInvoiceConfig, pieceJobworkInvoiceConfig } from './invoice-variants'
import { supplierOrderConfig } from './supplier-order'

export {
  orderConfig,
  programConfig,
  purchaseOrderConfig,
  grnConfig,
  jobworkOutConfig,
  jobworkInConfig,
  cutConfig,
  lineIssueConfig,
  productionConfig,
  reworkConfig,
  rejectionConfig,
  despatchConfig,
  invoiceConfig,
  debitNoteConfig,
  paymentConfig,
  journalConfig,
  costSheetConfig,
  stockAdjustmentConfig,
  godownTransferConfig,
  budgetConfig,
  commercialInvoiceConfig,
  localInvoiceConfig,
  pieceJobworkInvoiceConfig,
  supplierOrderConfig,
}

export const DOC_CONFIGS: DocConfig[] = [
  orderConfig,
  programConfig,
  purchaseOrderConfig,
  grnConfig,
  jobworkOutConfig,
  jobworkInConfig,
  cutConfig,
  lineIssueConfig,
  productionConfig,
  reworkConfig,
  rejectionConfig,
  despatchConfig,
  invoiceConfig,
  debitNoteConfig,
  paymentConfig,
  journalConfig,
  costSheetConfig,
  stockAdjustmentConfig,
  godownTransferConfig,
  budgetConfig,
  commercialInvoiceConfig,
  localInvoiceConfig,
  pieceJobworkInvoiceConfig,
  supplierOrderConfig,
]

export function getDocConfig(slug: string): DocConfig | undefined {
  return DOC_CONFIGS.find((c) => c.slug === slug)
}

/** Serializable subset for the client engine (ERRATUM 3). */
export function toScreenConfig(config: DocConfig) {
  const { schema: _schema, service: _service, ...ui } = config
  return ui
}

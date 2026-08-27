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
// M5 Wave B (SPEC-M5 §7-B)
import {
  finishedGoodsConfig,
  operationEntryConfig,
  bundleBarcodeConfig,
  panelProductionConfig,
  panelExcessConfig,
} from './production-variants'
import {
  panelRejReworkConfig,
  fabricRejectionReturnConfig,
  pcsShortageConfig,
} from './rejection-variants'
import { panelCuttingConfig } from './cut-variants'
import { lineTransferConfig } from './line-transfer'
import { jobworkPcsReturnConfig } from './grn-variants'
import { costingInputConfig } from './costing-input'
import { wagePaymentsConfig } from './wage-payments'
// M5 Wave D (SPEC-M5 §7-D — ADR-015 new models + write doors)
import { sampleConfig } from './sample'
import { gateEntryConfig, gatePassConfig } from './gate'
import { packingListConfig } from './packing-list'
import { labTestConfig } from './lab-test'
import { expenseConfig } from './expense'
import { rollSplitConfig } from './roll-split'
import { contractAllotmentConfig } from './contract-allotment'
import { programAllotmentConfig } from './program-allotment'
import { productionBillConfig } from './production-bill'

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
  // M5 Wave B
  finishedGoodsConfig,
  operationEntryConfig,
  bundleBarcodeConfig,
  panelProductionConfig,
  panelExcessConfig,
  panelRejReworkConfig,
  fabricRejectionReturnConfig,
  pcsShortageConfig,
  panelCuttingConfig,
  lineTransferConfig,
  jobworkPcsReturnConfig,
  costingInputConfig,
  wagePaymentsConfig,
  // M5 Wave D (SPEC-M5 §7-D)
  sampleConfig,
  gateEntryConfig,
  gatePassConfig,
  packingListConfig,
  labTestConfig,
  expenseConfig,
  rollSplitConfig,
  contractAllotmentConfig,
  programAllotmentConfig,
  productionBillConfig,
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
  // M5 Wave B (SPEC-M5 §7-B)
  finishedGoodsConfig,
  operationEntryConfig,
  bundleBarcodeConfig,
  panelProductionConfig,
  panelExcessConfig,
  panelRejReworkConfig,
  fabricRejectionReturnConfig,
  pcsShortageConfig,
  panelCuttingConfig,
  lineTransferConfig,
  jobworkPcsReturnConfig,
  costingInputConfig,
  wagePaymentsConfig,
  // M5 Wave D (SPEC-M5 §7-D)
  sampleConfig,
  gateEntryConfig,
  gatePassConfig,
  packingListConfig,
  labTestConfig,
  expenseConfig,
  rollSplitConfig,
  contractAllotmentConfig,
  programAllotmentConfig,
  productionBillConfig,
]

export function getDocConfig(slug: string): DocConfig | undefined {
  return DOC_CONFIGS.find((c) => c.slug === slug)
}

/** Serializable subset for the client engine (ERRATUM 3). */
export function toScreenConfig(config: DocConfig) {
  const { schema: _schema, service: _service, ...ui } = config
  return ui
}

// ============== Typed domain enums (LLD 03 §1 ports, adapted to our schema) ==============
// Source: nextjs-lld/03-DOMAIN-POSTING-ENGINE.md §1 "Enum ports (identical values)".
// Values are kept verbatim where our schema supports them; comments note the
// legacy semantics we preserve. These unions replace free strings in new code.

/** Legacy TrType — DC (outward document) type codes. */
export type TrType =
  | 1   // process DC (material out to a jobworker for processing)
  | 2   // SALES DC (out to buyer)
  | 3   // order→order transfer out
  | 4   // purchase return
  | 6   // party rejection return
  | 7   // accessory issue (dept 16, job-order)
  | 8   // order→order transfer in
  | 10  // DC variant
  | 11  // DC variant
  | 12  // DC variant
  | 13  // party rejection return (second code)
  | 14  // godown transfer (party = destination GodID)
  | 17  // unit DC (own unit transfer, ack pending)
  | 20  // ready-to-cut
  | 21  // job-order DC
  | -2  // compacted-for-cutting marker
  | -7  // cutting pool dept

export const TR_TYPE_LABEL: Record<number, string> = {
  1: 'Process DC', 2: 'Sales DC', 3: 'Transfer Out', 4: 'Purchase Return',
  6: 'Party Rejection Return', 7: 'Accessory Issue', 8: 'Transfer In',
  10: 'DC Variant 10', 11: 'DC Variant 11', 12: 'DC Variant 12',
  13: 'Party Rejection Return 2', 14: 'Godown Transfer', 17: 'Unit DC',
  20: 'Ready to Cut', 21: 'Job Order DC', [-2]: 'Compacted for Cutting', [-7]: 'Cutting Pool',
}

/** Legacy GrnType — inward document types. */
export type GrnType =
  | 'Purchase'
  | 'Process'
  | 'Process Return'
  | 'DirectReceipt'
  | 'Sales Return'
  | 'Return'
  | 'Acc.Purch'
  | 'Acc.Proc.Receipt'
  | 'Acc.Proc.Return'
  | 'Acc.Iss.Ret'
  | 'AccRetToUnit'
  | 'Acc.Direct'

/** Piece ledger selector (Mas_JobWrkComp.PcsType). */
export type PcsType = 'Piece' | 'Panel' | 'Bit'

/** Good vs rejected bucket (Pcs_StockTable GoodPcsFlag). */
export type GoodFlag = 'G' | 'M' // G = good, M = rejected (RejectionTypeId applies)

/** StockTable commodity axis. */
export type YF = 'Y' | 'F' | 'A' // yarn | fabric | accessory

/** DC process type. */
export type ProcessType = 'P' | 'R' | 'S' // normal process | reprocess | sales

/** Rate lookup dimension (OrderStyleDtl.RateFor). */
export type RateFor = 'S' | 'C' | 'Z' | 'R' // style | color | color+size | style-plain

/** Order grid entry mode (OrderMas.EntryOption). */
export type EntryOption = 1 | 2 // 1 = plain size grid, 2 = color-combo grid

/** Final stage marker (Mas_Dept.Semifinish / FinalStage logic). */
export type FinalStage = 'S' | 'F' // S = semi-finish, F = final dept

// ============== Our schema-side enum mirrors (status vocabularies) ==============
// These document how the free strings currently stored in the DB map to the
// typed domain. New code should import from here instead of string literals.

export const ORDER_STATUS = ['open', 'in_progress', 'completed', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUS)[number]

export const PO_STATUS = ['open', 'partial', 'received', 'cancelled'] as const
export type PoStatus = (typeof PO_STATUS)[number]

export const INVOICE_STATUS = ['draft', 'issued', 'paid', 'cancelled'] as const
export type InvoiceStatus = (typeof INVOICE_STATUS)[number]

export const CUT_STATUS = ['planned', 'cut', 'acknowledged'] as const
export type CutStatus = (typeof CUT_STATUS)[number]

export const BUNDLE_STATUS = ['in_cutting', 'issued_to_sewing', 'sewn', 'packed'] as const
export type BundleStatus = (typeof BUNDLE_STATUS)[number]

export const JOBWORK_STATUS = ['sent', 'received', 'billed'] as const
export type JobworkStatus = (typeof JOBWORK_STATUS)[number]

export const VOUCHER_TYPES = ['receipt', 'payment', 'contra', 'journal'] as const
export type VoucherType = (typeof VOUCHER_TYPES)[number]

/**
 * StockLedger txnType → typed domain mapping (our current vocabulary,
 * aligned to the legacy movement matrix rows we support today).
 */
export const TXN_TYPES = [
  'opening',
  'purchase_grn',            // legacy: Grn 'Purchase'          → CurrentStock +
  'process_delivery',        // legacy: DC TrType 1 (P)         → CurrentStock −
  'process_receipt',         // legacy: Grn 'Process'           → CurrentStock + (new identity)
  'sales_delivery',          // legacy: DC TrType 2 (S)         → CurrentStock −
  'sales_return',            // legacy: Grn 'Sales Return'      → CurrentStock +
  'transfer_in',             // legacy: DC TrType 8             → CurrentStock +
  'transfer_out',            // legacy: DC TrType 3             → CurrentStock −
  'godown_transfer_in',      // legacy: DC TrType 14            → dst godown +
  'godown_transfer_out',     // legacy: DC TrType 14            → src godown −
  'stock_adjustment_add',    // adjustment +
  'stock_adjustment_less',   // adjustment −
  'cut_ack',                 // legacy: Trs_CutApr → dept −7 pool
  'unit_dc',                 // legacy: DC TrType 17
  'ready_to_cut_in',         // legacy: TrType 20
  'ready_to_cut_out',
] as const
export type TxnType = (typeof TXN_TYPES)[number]

/** Which ledger a movement applies to (LLD 03 §2 Movement.ledger). */
export type LedgerKind = 'FABRIC' | 'PANEL' | 'PCS'

/** PCS-ledger transaction kinds (Phase 2 stage pipeline). */
export const PCS_TXN_TYPES = [
  'pcs_stage_in',        // production entry: + at target stage bucket
  'pcs_stage_out',       // production entry: − at source stage bucket
  'pcs_rejection',       // G → 'M' bucket with RejectionTypeId
  'pcs_rework',          // 'M' → 'G' (rework consumes rejected bucket)
  'pcs_line_in',         // issue to line: + line bucket
  'pcs_line_out',        // line output: − line bucket
  'pcs_line_transfer',   // line → line
  'pcs_party_out',       // outside stitching DC: + party bucket, − company
  'pcs_party_in',        // piece GRN from party: + company
  'pcs_despatch',        // finished despatch: − finished bucket
] as const
export type PcsTxnType = (typeof PCS_TXN_TYPES)[number]

/** A signed stock movement — the PostingEngine's unit of work (LLD 03 §2). */
export interface Movement {
  ledger: LedgerKind
  txnType: TxnType | PcsTxnType
  /** legacy: order id ('' for non-order stock) */
  orderId?: string
  /** yarn|fabric|accessory item id (FABRIC ledger) */
  itemId?: string
  /** yarn | fabric | accessory | pcs — CurrentStock.itemType vocabulary */
  itemType?: string
  lotId?: string
  colourId?: string
  sizeId?: string
  godownId: string
  deptId?: string
  partyId?: string
  qty: { bags?: number; kgs?: number; mtrs?: number; pcs?: number }
  sign: 1 | -1
  docNo?: string
  refId?: string
  notes?: string
  // ── PCS-ledger dimensions (Phase 2 stage pipeline) ──
  /** order style number (PcsStock natural key part) */
  styleNo?: string
  /** target stage bucket for pcs_stage_in */
  stageId?: string
  /** source stage bucket for pcs_stage_out */
  sourceStageId?: string
  /** G | M bucket selector */
  goodFlag?: 'G' | 'M'
  rejectionTypeId?: string
  /** line bucket owner (issue-to-line / line-out semantics) */
  lineId?: string
}

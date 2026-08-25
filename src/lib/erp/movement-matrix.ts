/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== MOVEMENT MATRIX (LLD 03 §4 port, our-schema subset) ==============
// One home for "how every document moves stock". Each builder takes a
// document-shaped input and returns the signed Movement set the
// PostingEngine must apply. Rows are ported from the legacy matrix for the
// document types our schema supports today; each row notes its legacy
// equivalent (TrType / GrnType) so future parity work has a paper trail.
//
// Rules (LLD 03 golden rules, adapted):
//  - FABRIC ledger rows: CurrentStock (kgs/mtrs/bags) + StockLedger journal
//    entry, keyed (orderId, itemId, godownId, deptId?, lotId?).
//  - PCS ledger rows: CurrentStock.pcs for accessory items and finished
//    goods (Panel ledger comes with Phase 2).
//  - Every movement is signed; reversal = same set, inverted signs.

import type { Movement, TxnType, YF } from './enums'

/** Item type → YF commodity axis (legacy StockTable.YF). */
export function yfOf(itemType: string): YF {
  if (itemType === 'yarn') return 'Y'
  if (itemType === 'fabric') return 'F'
  return 'A'
}

/** Does this item stock in kgs (yarn/fabric) or pcs (accessory/finished)? */
export function isKgsItem(itemType: string): boolean {
  return itemType === 'yarn' || itemType === 'fabric'
}

export interface DocRef {
  docNo: string
  refId?: string
  docDate?: Date
  finYear?: string
  notes?: string
}

export interface GrnDoc {
  grnType: 'Purchase' | 'Process' | 'Process Return' | 'DirectReceipt' | 'Sales Return'
  itemType: string            // yarn | fabric | accessory
  itemId: string
  qty: number
  rate: number
  godownId: string
  deptId?: string
  orderId?: string            // order-linked stock ('' = general stores)
  lotId?: string
  partyId?: string            // supplier / jobworker
  poId?: string
}

export interface DcDoc {
  trType: TxnType             // process_delivery | sales_delivery | transfer_out | transfer_in | godown_transfer_out | godown_transfer_in | unit_dc
  itemType: string
  itemId: string
  qty: number
  rate: number
  fromGodownId: string
  toGodownId?: string         // transfers only
  orderId?: string
  lotId?: string
  partyId?: string            // jobworker / buyer
}

export interface CutAckDoc {
  orderNo: string
  orderId: string
  fabricItemId?: string
  fabricIssuedKgs: number
  totalPcs: number
  godownId: string
}

export interface AdjustmentDoc {
  itemType: string
  itemId: string
  qty: number                 // positive number
  action: 'add' | 'less'
  reason: string
  godownId: string
}

export interface DespatchDoc {
  orderId: string
  totalPcs: number
  godownId?: string           // finished-goods godown; default G2 semantics handled by caller
}

// ───────────── GRN rows (LLD 03 §4.1) ─────────────

/** GRN 'Purchase' → CurrentStock + (legacy: Grn 'Purchase' row). */
export function purchaseGrn(doc: GrnDoc, ref: DocRef): Movement[] {
  return [{
    ledger: 'FABRIC', txnType: 'purchase_grn', sign: 1,
    orderId: doc.orderId, itemId: doc.itemId, itemType: doc.itemType, lotId: doc.lotId,
    godownId: doc.godownId, deptId: doc.deptId, partyId: doc.partyId,
    qty: isKgsItem(doc.itemType) ? { kgs: doc.qty } : { pcs: doc.qty },
    docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
  }]
}

/**
 * GRN 'Process' → CurrentStock + as the (possibly NEW dyed/finished) identity.
 * Legacy: the incoming fabric may carry a new colour/dia/gsm fingerprint; here
 * the caller passes the resolved itemId (which may differ from the sent one).
 */
export function processGrn(doc: GrnDoc, ref: DocRef): Movement[] {
  return [{
    ledger: 'FABRIC', txnType: 'process_receipt', sign: 1,
    orderId: doc.orderId, itemId: doc.itemId, itemType: doc.itemType, lotId: doc.lotId,
    godownId: doc.godownId, deptId: doc.deptId, partyId: doc.partyId,
    qty: isKgsItem(doc.itemType) ? { kgs: doc.qty } : { pcs: doc.qty },
    docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
  }]
}

/** GRN 'Sales Return' → CurrentStock + (goods back from buyer). */
export function salesReturnGrn(doc: GrnDoc, ref: DocRef): Movement[] {
  return [{
    ledger: 'FABRIC', txnType: 'sales_return', sign: 1,
    orderId: doc.orderId, itemId: doc.itemId, itemType: doc.itemType, lotId: doc.lotId,
    godownId: doc.godownId, deptId: doc.deptId, partyId: doc.partyId,
    qty: isKgsItem(doc.itemType) ? { kgs: doc.qty } : { pcs: doc.qty },
    docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
  }]
}

/** GRN 'Process Return' → CurrentStock − (send back out to jobworker). */
export function processReturnGrn(doc: GrnDoc, ref: DocRef): Movement[] {
  return [{
    ledger: 'FABRIC', txnType: 'process_delivery', sign: -1,
    orderId: doc.orderId, itemId: doc.itemId, itemType: doc.itemType, lotId: doc.lotId,
    godownId: doc.godownId, deptId: doc.deptId, partyId: doc.partyId,
    qty: isKgsItem(doc.itemType) ? { kgs: doc.qty } : { pcs: doc.qty },
    docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
  }]
}

// ───────────── DC rows (LLD 03 §4.1) ─────────────

/** Process DC out (TrType 1, P) → CurrentStock − at source godown. */
export function processDcOut(doc: DcDoc, ref: DocRef): Movement[] {
  return [{
    ledger: 'FABRIC', txnType: 'process_delivery', sign: -1,
    orderId: doc.orderId, itemId: doc.itemId, itemType: doc.itemType, lotId: doc.lotId,
    godownId: doc.fromGodownId, partyId: doc.partyId,
    qty: isKgsItem(doc.itemType) ? { kgs: doc.qty } : { pcs: doc.qty },
    docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
  }]
}

/** Sales DC out (TrType 2, S) → CurrentStock − to buyer. */
export function salesDcOut(doc: DcDoc, ref: DocRef): Movement[] {
  return [{
    ledger: 'FABRIC', txnType: 'sales_delivery', sign: -1,
    orderId: doc.orderId, itemId: doc.itemId, itemType: doc.itemType, lotId: doc.lotId,
    godownId: doc.fromGodownId, partyId: doc.partyId,
    qty: isKgsItem(doc.itemType) ? { kgs: doc.qty } : { pcs: doc.qty },
    docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
  }]
}

/** Godown transfer (TrType 14) → − source godown, + destination godown. */
export function godownTransfer(doc: DcDoc, ref: DocRef): Movement[] {
  if (!doc.toGodownId) throw new Error('godownTransfer requires toGodownId')
  const qty = isKgsItem(doc.itemType) ? { kgs: doc.qty } : { pcs: doc.qty }
  return [
    {
      ledger: 'FABRIC', txnType: 'godown_transfer_out', sign: -1,
      orderId: doc.orderId, itemId: doc.itemId, itemType: doc.itemType, lotId: doc.lotId,
      godownId: doc.fromGodownId,
      qty, docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
    {
      ledger: 'FABRIC', txnType: 'godown_transfer_in', sign: 1,
      orderId: doc.orderId, itemId: doc.itemId, itemType: doc.itemType, lotId: doc.lotId,
      godownId: doc.toGodownId,
      qty, docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
  ]
}

/** Order→order transfer (TrType 3/8) → − source order, + target order. */
export function orderTransfer(doc: DcDoc, toOrderId: string, ref: DocRef): Movement[] {
  const qty = isKgsItem(doc.itemType) ? { kgs: doc.qty } : { pcs: doc.qty }
  return [
    {
      ledger: 'FABRIC', txnType: 'transfer_out', sign: -1,
      orderId: doc.orderId, itemId: doc.itemId, itemType: doc.itemType, lotId: doc.lotId,
      godownId: doc.fromGodownId,
      qty, docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
    {
      ledger: 'FABRIC', txnType: 'transfer_in', sign: 1,
      orderId: toOrderId, itemId: doc.itemId, itemType: doc.itemType, lotId: doc.lotId,
      godownId: doc.fromGodownId,
      qty, docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
  ]
}

// ───────────── Cutting (LLD 03 §4.1 cut-ack row) ─────────────

/**
 * Cutting acknowledgement (legacy Trs_CutApr → dept −7 pool):
 * fabric − kgs at godown, pieces + pcs at cutting pool (dept −7 semantics →
 * our CurrentStock dept column = cutting dept id).
 */
export function cutAck(doc: CutAckDoc, cuttingDeptId: string, ref: DocRef): Movement[] {
  const moves: Movement[] = []
  if (doc.fabricItemId && doc.fabricIssuedKgs > 0) {
    moves.push({
      ledger: 'FABRIC', txnType: 'cut_ack', sign: -1,
      orderId: doc.orderId, itemId: doc.fabricItemId,
      godownId: doc.godownId,
      qty: { kgs: doc.fabricIssuedKgs },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    })
  }
  // Piece side: pcs enter the cutting pool bucket (deptId = cutting dept).
  // We journal the pcs movement as a PCS-ledger row against the order.
  moves.push({
    ledger: 'PCS', txnType: 'cut_ack', sign: 1,
    orderId: doc.orderId,
    godownId: doc.godownId, deptId: cuttingDeptId,
    qty: { pcs: doc.totalPcs },
    docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
  })
  return moves
}

// ───────────── Finished goods despatch (LLD 03 §4.3 live deduction) ─────────────

/** Piece despatch → finished-stage bucket − pcs (the live deduction row). */
export function pieceDespatch(doc: DespatchDoc, ref: DocRef): Movement[] {
  return [{
    ledger: 'PCS', txnType: 'sales_delivery', sign: -1,
    orderId: doc.orderId,
    godownId: doc.godownId || '',
    qty: { pcs: doc.totalPcs },
    docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
  }]
}

// ───────────── Adjustments ─────────────

/** Stock adjustment add/less (legacy StockAddLess column semantics). */
export function adjustment(doc: AdjustmentDoc, ref: DocRef): Movement[] {
  const isAdd = doc.action === 'add'
  return [{
    ledger: 'FABRIC',
    txnType: isAdd ? 'stock_adjustment_add' : 'stock_adjustment_less',
    sign: isAdd ? 1 : -1,
    itemId: doc.itemId, itemType: doc.itemType,
    godownId: doc.godownId,
    qty: isKgsItem(doc.itemType) ? { kgs: doc.qty } : { pcs: doc.qty },
    docNo: ref.docNo, refId: ref.refId, notes: doc.reason || ref.notes,
  }]
}

/** Invert a movement set — the compensating reversal (LLD 03 §3). */
export function invertMovements(movements: Movement[], reversalDocNo?: string): Movement[] {
  return movements.map((m) => ({
    ...m,
    sign: (m.sign === 1 ? -1 : 1) as 1 | -1,
    notes: `REVERSAL${m.docNo ? ` of ${m.docNo}` : ''}${reversalDocNo ? ` via ${reversalDocNo}` : ''}${m.notes ? ` | ${m.notes}` : ''}`,
  }))
}

// ───────────── PCS stage pipeline (LLD 03 §4.2 ports) ─────────────

export interface PieceProdDoc {
  orderId: string
  styleNo: string
  qty: number
  targetStageId: string          // bucket receiving the produced pcs
  sourceStageId?: string         // bucket the pcs came from (stage-to-stage)
  lotId?: string
  colourId?: string
  sizeId?: string
  lineId?: string                // line bucket (issue-to-line semantics)
  prodType?: 'inhouse' | 'jobwork'
}

/**
 * Piece production (LLD 03 §4.2 row 1): target 'G' bucket + pcs AND source
 * stage bucket − pcs (stage-to-stage). If sourceStageId is absent, the
 * entry only credits the target (e.g. first stage from cutting).
 */
export function pieceProduction(doc: PieceProdDoc, ref: DocRef): Movement[] {
  const moves: Movement[] = [{
    ledger: 'PCS', txnType: 'pcs_stage_in', sign: 1,
    orderId: doc.orderId, styleNo: doc.styleNo,
    stageId: doc.targetStageId, lotId: doc.lotId,
    colourId: doc.colourId, sizeId: doc.sizeId,
    godownId: '', goodFlag: 'G',
    qty: { pcs: doc.qty },
    docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
  }]
  if (doc.sourceStageId) {
    moves.push({
      ledger: 'PCS', txnType: 'pcs_stage_out', sign: -1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.sourceStageId, lotId: doc.lotId,
      colourId: doc.colourId, sizeId: doc.sizeId,
      godownId: '', goodFlag: 'G',
      qty: { pcs: doc.qty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    })
  }
  return moves
}

/**
 * Rejection (LLD 03 §4.2 Trs_PcsRej row): line 'G' bucket − pcs at the stage,
 * 'M' bucket + pcs with RejectionTypeId (EmpID=0 semantics → no line).
 */
export function pieceRejection(doc: PieceProdDoc & { rejectionTypeId: string }, ref: DocRef): Movement[] {
  return [
    {
      ledger: 'PCS', txnType: 'pcs_rejection', sign: -1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.sourceStageId || doc.targetStageId,
      lotId: doc.lotId, colourId: doc.colourId, sizeId: doc.sizeId,
      lineId: doc.lineId, godownId: '', goodFlag: 'G',
      qty: { pcs: doc.qty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
    {
      ledger: 'PCS', txnType: 'pcs_rejection', sign: 1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.sourceStageId || doc.targetStageId,
      lotId: doc.lotId, colourId: doc.colourId, sizeId: doc.sizeId,
      godownId: '', goodFlag: 'M', rejectionTypeId: doc.rejectionTypeId,
      qty: { pcs: doc.qty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
  ]
}

/**
 * Rework (LLD 03 §4.2 Rework row): consumes the 'M' bucket (with
 * RejectionTypeId), outputs 'G' at the target stage.
 */
export function pieceRework(doc: PieceProdDoc & { rejectionTypeId?: string }, ref: DocRef): Movement[] {
  const moves: Movement[] = [
    {
      ledger: 'PCS', txnType: 'pcs_rework', sign: -1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.sourceStageId || doc.targetStageId,
      lotId: doc.lotId, colourId: doc.colourId, sizeId: doc.sizeId,
      godownId: '', goodFlag: 'M', rejectionTypeId: doc.rejectionTypeId,
      qty: { pcs: doc.qty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
    {
      ledger: 'PCS', txnType: 'pcs_rework', sign: 1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.targetStageId, lotId: doc.lotId,
      colourId: doc.colourId, sizeId: doc.sizeId,
      godownId: '', goodFlag: 'G',
      qty: { pcs: doc.qty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
  ]
  return moves
}

/**
 * Issue to line (LLD 03 §4.2 Trs_LineInput row): line bucket + pcs at
 * TargetStageID AND source-stage bucket − pcs (company WIP).
 */
export function issueToLine(doc: PieceProdDoc, ref: DocRef): Movement[] {
  const moves: Movement[] = [
    {
      ledger: 'PCS', txnType: 'pcs_line_in', sign: 1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.targetStageId, lotId: doc.lotId,
      colourId: doc.colourId, sizeId: doc.sizeId,
      lineId: doc.lineId, godownId: '', goodFlag: 'G',
      qty: { pcs: doc.qty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
  ]
  if (doc.sourceStageId) {
    moves.push({
      ledger: 'PCS', txnType: 'pcs_line_out', sign: -1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.sourceStageId, lotId: doc.lotId,
      colourId: doc.colourId, sizeId: doc.sizeId,
      godownId: '', goodFlag: 'G',
      qty: { pcs: doc.qty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    })
  }
  return moves
}

/**
 * Line-to-line transfer (LLD 03 §4.2 Trs_LineTfr row): + at target stage
 * under TO line, − at source stage under from-line.
 */
export function lineTransfer(doc: PieceProdDoc & { toLineId: string }, ref: DocRef): Movement[] {
  const stage = doc.sourceStageId || doc.targetStageId
  return [
    {
      ledger: 'PCS', txnType: 'pcs_line_transfer', sign: -1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: stage, lotId: doc.lotId, colourId: doc.colourId, sizeId: doc.sizeId,
      lineId: doc.lineId, godownId: '', goodFlag: 'G',
      qty: { pcs: doc.qty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
    {
      ledger: 'PCS', txnType: 'pcs_line_transfer', sign: 1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: stage, lotId: doc.lotId, colourId: doc.colourId, sizeId: doc.sizeId,
      lineId: doc.toLineId, godownId: '', goodFlag: 'G',
      qty: { pcs: doc.qty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
  ]
}

/**
 * Outside stitching DC (LLD 03 §4.3 piece process DC row): party bucket +
 * pcs at target stage AND company bucket − at source stage.
 */
export function piecePartyDc(doc: PieceProdDoc & { partyId: string }, ref: DocRef): Movement[] {
  return [
    {
      ledger: 'PCS', txnType: 'pcs_party_out', sign: 1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.targetStageId, lotId: doc.lotId,
      colourId: doc.colourId, sizeId: doc.sizeId,
      partyId: doc.partyId, godownId: '', goodFlag: 'G',
      qty: { pcs: doc.qty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
    {
      ledger: 'PCS', txnType: 'pcs_party_out', sign: -1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.sourceStageId || doc.targetStageId, lotId: doc.lotId,
      colourId: doc.colourId, sizeId: doc.sizeId,
      godownId: '', goodFlag: 'G',
      qty: { pcs: doc.qty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
  ]
}

/**
 * Piece GRN from party (LLD 03 §4.3): company bucket + RecPcs at target
 * stage; optionally Rewrk/Rej legs land in RewrkStk-style buckets.
 */
export function piecePartyGrn(doc: PieceProdDoc & { receivedQty?: number; reworkQty?: number; rejQty?: number; rejTypeId?: string }, ref: DocRef): Movement[] {
  const rec = doc.receivedQty ?? doc.qty
  const moves: Movement[] = [
    {
      ledger: 'PCS', txnType: 'pcs_party_in', sign: 1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.targetStageId, lotId: doc.lotId,
      colourId: doc.colourId, sizeId: doc.sizeId,
      godownId: '', goodFlag: 'G',
      qty: { pcs: rec },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
    {
      // party bucket − (rec + rew + rej) — multi-stage GRN deduction row
      ledger: 'PCS', txnType: 'pcs_party_in', sign: -1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.sourceStageId || doc.targetStageId, lotId: doc.lotId,
      colourId: doc.colourId, sizeId: doc.sizeId,
      partyId: (doc as any).partyId, godownId: '', goodFlag: 'G',
      qty: { pcs: rec + (doc.reworkQty || 0) + (doc.rejQty || 0) },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    },
  ]
  if (doc.rejQty && doc.rejTypeId) {
    moves.push({
      ledger: 'PCS', txnType: 'pcs_rejection', sign: 1,
      orderId: doc.orderId, styleNo: doc.styleNo,
      stageId: doc.targetStageId, lotId: doc.lotId,
      colourId: doc.colourId, sizeId: doc.sizeId,
      godownId: '', goodFlag: 'M', rejectionTypeId: doc.rejTypeId,
      qty: { pcs: doc.rejQty },
      docNo: ref.docNo, refId: ref.refId, notes: ref.notes,
    })
  }
  return moves
}

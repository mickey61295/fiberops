// SPEC-M3 §6 — shared zod schemas for create_jobwork_order + receive_jobwork.
// SPEC-M39 (Phase-6B Batch 3, JWL-01..09) — the jobwork loop closes:
//   OUT gains lines[] (material door: stock posts + ITC-04 + G3 WIP), godownCode,
//   allotmentNo (AL- contract linkage); IN gains rejectedQty + per-line receipts
//   (cumulative, partial-aware); NEW JOBWORK_BILL_SCHEMA (bill_jobwork).
import { z } from 'zod'

export const JOBWORK_LINE = z.object({
  itemType: z.enum(['yarn', 'fabric', 'accessory']).describe('Material type.'),
  itemCode: z.string().describe('Item code (e.g. Y-1001).'),
  qty: z.number().describe('Qty out (kgs for yarn/fabric, pcs for accessory).'),
  rate: z.number().optional().describe('Rate — default 0.'),
})

export const JOBWORK_OUT_SCHEMA = z.object({
  dcNo: z.string().optional(),
  jobworkerCode: z.string(),
  processType: z.string(),
  totalQty: z.number().optional().describe('Total sent qty — REQUIRED when lines absent; derived from lines otherwise.'),
  totalValue: z.number().optional(),
  orderNo: z.string().optional(),
  expectedInDate: z.string().optional(),
  outDate: z.string().optional(),
  // ── JWL additions ──
  godownCode: z.string().optional().describe('Issuing godown — default G1 (Main Store). Applies when lines present.'),
  allotmentNo: z.string().optional().describe('AL-#### contract this DC fulfills (links + flips the allotment to issued).'),
  lines: z.array(JOBWORK_LINE).optional().describe('Material lines — present → stock posts OUT of the godown + ITC-04 line + G3 WIP (JWL-01/02/08). Absent → header-only document (no stock moves).'),
})

export type JobworkOutInput = z.infer<typeof JOBWORK_OUT_SCHEMA>

export const JOBWORK_RECEIPT_LINE = z.object({
  itemCode: z.string().describe('Item code on the DC line.'),
  qty: z.number().describe('Good qty received this time (cumulative — JWL-03).'),
  rejectedQty: z.number().optional().describe('Rejected qty this time (default 0).'),
})

export const JOBWORK_IN_SCHEMA = z.object({
  dcNo: z.string(),
  receivedDate: z.string().optional(),
  receivedQty: z.number().optional().describe('Good qty received this time — cumulative across receipts (JWL-03). Defaults to the open balance.'),
  rejectedQty: z.number().optional().describe('Rejected qty this time — books as process loss (JWL-03/09). Default 0.'),
  lines: z.array(JOBWORK_RECEIPT_LINE).optional().describe('Per-line receipts; when absent the header qty distributes across lines proportionally to sent qty.'),
})

export type JobworkInInput = z.infer<typeof JOBWORK_IN_SCHEMA>

// JWL-06 — bill_jobwork: aggregates received-not-billed DCs per jobworker into
// ONE jobwork invoice (SalesInvoice billType='jobwork', INV-#### space).
export const JOBWORK_BILL_SCHEMA = z.object({
  invoiceNo: z.string().optional().describe('Invoice no — auto-assigned INV-#### when blank.'),
  jobworkerCode: z.string().describe('The jobworker party being billed (received-not-billed aggregation).'),
  invoiceDate: z.string().optional(),
  gstRate: z.number().optional().describe('GST % — default 18.'),
  gstType: z.enum(['cgst_sgst', 'igst']).optional().describe('Default cgst_sgst (intra-state).'),
  notes: z.string().optional(),
})

export type JobworkBillInput = z.infer<typeof JOBWORK_BILL_SCHEMA>

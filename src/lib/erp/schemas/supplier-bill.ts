// SPEC-M40 §1 PAY-03 — supplier bill (SB-####) schema. Lines default to the
// GRN's own lines (received qty × rate); overrides subset the billed qty/rate
// by itemCode — the delta is exactly what the 3-way match flags (PAY-04).
import { z } from 'zod'

export const SUPPLIER_BILL_SCHEMA = z.object({
  billNo: z.string().optional(),
  grnNo: z.string(),
  billDate: z.string().optional(),
  gstRate: z.number().optional().describe('e.g. 18 for 18% (default 18; pass 0 for exempt/URP purchases)'),
  gstType: z.string().optional().describe('cgst_sgst | igst (default cgst_sgst)'),
  lines: z.array(z.object({
    itemCode: z.string(),
    qty: z.number().optional(),
    rate: z.number().optional(),
  })).optional().describe('Defaults to ALL GRN lines at received qty/rate; override per itemCode to bill a subset'),
  dueDate: z.string().optional(),
  tdsPercent: z.number().optional().describe('TDS % — defaults to the tds_default_percent flag (194C)'),
  notes: z.string().optional(),
})

export type SupplierBillInput = z.infer<typeof SUPPLIER_BILL_SCHEMA>

// SPEC-M40 PAY-03 — the bill-pass gate input (create_bill_pass tool + the
// /accounts/bill-pass queue door share it).
export const BILL_PASS_SCHEMA = z.object({
  billNo: z.string().describe('The SB-#### supplier bill number'),
  comments: z.string().optional(),
})

export type BillPassInput = z.infer<typeof BILL_PASS_SCHEMA>

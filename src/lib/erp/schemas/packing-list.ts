// SPEC-M5 §7-D-29 — shared zod schema for create_packing_list / the
// PackingList DocScreen (/pieces/packing-list, legacy FrmPackingList).
// Mirrors PackingList + PackingListLine (ADR-015). Header totals default to
// the line sums (totalPcs = Σ qty, totalCartons = distinct cartonNo,
// netKgs = Σ line netKgs) unless explicitly given.
import { z } from 'zod'

export const PACKING_LIST_SCHEMA = z.object({
  packNo: z.string().optional().describe('PKL-#### auto-assigned when omitted or colliding'),
  despatchDcNo: z.string().optional().describe('PcsDespatch dcNo this pack ships under'),
  orderNo: z.string().optional(),
  buyerCode: z.string().optional(),
  packDate: z.string().optional().describe('ISO date (default today)'),
  finYear: z.string().optional().describe('Defaults to current 26-27'),
  totalCartons: z.number().min(0).optional().describe('Defaults to distinct cartonNo count'),
  totalPcs: z.number().min(0).optional().describe('Defaults to Σ line qty'),
  netKgs: z.number().min(0).optional().describe('Defaults to Σ line netKgs'),
  grossKgs: z.number().min(0).optional(),
  status: z.string().optional().describe('draft | confirmed (default draft)'),
  notes: z.string().optional(),
  lines: z.array(z.object({
    cartonNo: z.string().describe('Carton id/label (e.g. CTN-01)'),
    styleNo: z.string(),
    colourName: z.string().optional().describe('Colour name (resolved to colourId)'),
    sizeName: z.string().optional().describe('Size name (resolved to sizeId)'),
    qty: z.number().min(0),
    netKgs: z.number().min(0).optional(),
  })).min(1).describe('Carton lines'),
})

export type PackingListInput = z.infer<typeof PACKING_LIST_SCHEMA>

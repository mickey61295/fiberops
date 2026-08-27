// SPEC-M5 §7-A-3/4 — variant schemas for the local-invoice /
// piece-jobwork-invoice DocScreens. Base INVOICE_SCHEMA stays VERBATIM (M3
// contract); the variants relax ONLY billType (optional — the config's service
// wrapper injects 'sales' / 'jobwork' after safeParse, before planInvoice).
import { z } from 'zod'
import { INVOICE_SCHEMA } from './invoice'

export const LOCAL_INVOICE_SCHEMA = INVOICE_SCHEMA.extend({
  billType: z.string().optional(),
  // gstType optional on the LOCAL variant only — the config wrapper injects
  // 'cgst_sgst' (intra-state) when absent
  gstType: z.string().optional(),
})

export const PIECE_JOBWORK_INVOICE_SCHEMA = INVOICE_SCHEMA.extend({
  billType: z.string().optional(),
})

export type LocalInvoiceInput = z.infer<typeof LOCAL_INVOICE_SCHEMA>
export type PieceJobworkInvoiceInput = z.infer<typeof PIECE_JOBWORK_INVOICE_SCHEMA>

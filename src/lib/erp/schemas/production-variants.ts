// SPEC-M5 §7-B — variant schemas for the ProductionEntry-family DocScreens
// (rows 8-10/13-14). Base PRODUCTION_ENTRY_SCHEMA stays VERBATIM (the M3
// post_production_entry contract); the variants relax ONLY deptCode (optional
// — the posting wrappers inject the stage default: D5 Finishing for finished
// goods, D4 Sewing for operation entries, D3 Cutting for panel variants).
// scan_bundle is NOT a relax — it is a distinct bundle-keyed shape (§7-B-10:
// DS keyed by bundleNo; the service resolves order/style/colour/size).
import { z } from 'zod'
import { PRODUCTION_ENTRY_SCHEMA } from './production'

export const FINISHED_GOODS_SCHEMA = PRODUCTION_ENTRY_SCHEMA.extend({
  deptCode: z.string().optional(),
})

export const OPERATION_ENTRY_SCHEMA = PRODUCTION_ENTRY_SCHEMA.extend({
  deptCode: z.string().optional(),
})

/** Bundle/barcode scan → ProductionEntry (FrmBundle_ProductionEntry /
 *  frmBarcodeReadingNew). bundleNo accepts the bundle NO or the scanned
 *  BARCODE — the service matches either (findFirst OR). qty defaults to the
 *  bundle qty; rate defaults to the operator's pieceRate. */
export const SCAN_BUNDLE_SCHEMA = z.object({
  bundleNo: z.string().describe('Bundle no OR scanned barcode, e.g. CUT-0001/B1 or *CUT0001B001*'),
  operatorCode: z.string(),
  qty: z.number().optional().describe('Defaults to the bundle qty.'),
  rate: z.number().optional().describe('Defaults to the operator piece-rate master.'),
  deptCode: z.string().optional().describe('Defaults to D4 (Sewing).'),
  prodDate: z.string().optional(),
})

export type FinishedGoodsInput = z.infer<typeof FINISHED_GOODS_SCHEMA>
export type OperationEntryInput = z.infer<typeof OPERATION_ENTRY_SCHEMA>
export type ScanBundleInput = z.infer<typeof SCAN_BUNDLE_SCHEMA>

// SPEC-M6 §7-D-1 (Wave D) — line-output VARIANT (/production/line-output,
// legacy frmLineOutputManual). The manual tally door: lineId REQUIRED (the
// tally sheet is per line), deptCode relaxed (wrapper injects the D4 Sewing
// default); post_production_entry + PRODUCTION_ENTRY_SCHEMA stay VERBATIM.
export const LINE_OUTPUT_SCHEMA = PRODUCTION_ENTRY_SCHEMA.extend({
  deptCode: z.string().optional().describe('Defaults to D4 (Sewing).'),
  lineId: z.string().describe('Line code — the manual tally is posted per line (required).'),
})

export type LineOutputInput = z.infer<typeof LINE_OUTPUT_SCHEMA>

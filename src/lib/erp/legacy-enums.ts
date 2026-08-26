/* eslint-disable @typescript-eslint/no-explicit-any */
// ADR-012 (plan §1.4 "legacy debt we will NOT port"): legacy Fiberpro magic
// numbers are NOT carried into the new code as raw literals. Where the rebuild
// genuinely needs one, it gets a named constant HERE — the single residence.
// Values documented in PITFALLS #12 and source-erp deep-dive
// (module-functionalities/*.md). Do not sprinkle raw numbers elsewhere.

/** Stage → department code mapping (Tirupur knitwear chain).
 *  Legacy DeptID equivalents: knitting=1, dyeing=2, printing=2 (print shares the
 *  dye dept code in this rebuild's D-codes), embroidery=2, cutting=3, sewing=4,
 *  finishing=5, packing=6. Used by planProgram (posting/program.ts). */
export const STAGE_DEPT: Record<string, string> = {
  knitting: 'D1', dyeing: 'D2', printing: 'D2', embroidery: 'D2',
  cutting: 'D3', sewing: 'D4', finishing: 'D5', packing: 'D6',
}

/** Legacy DeptID magic numbers (documentation only — the rebuild uses D-codes).
 *  Ready-to-cut is a VIRTUAL dept (legacy −7): its trigger updated BOTH DcKgs
 *  and GRNKgs simultaneously (PITFALLS #12). Dye depts (8) match GRN fabric by
 *  DyeColID not stock colour; print (10) by DesignId. */
export const LEGACY_DEPT_IDS = {
  readyToCut: -7, // virtual dept — pcs between cut and sewing lines
  dye: 8,
  print: 10,
} as const

/** Legacy rework codes on ProductionEntry.Rework: 0 = normal,
 *  1 = from rejection ('M' stock), 2 = from alteration ('G' stock). */
export const LEGACY_REWORK = {
  normal: 0,
  fromRejection: 1,
  fromAlteration: 2,
} as const

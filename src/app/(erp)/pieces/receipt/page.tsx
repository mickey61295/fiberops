/**
 * /pieces/receipt — Pcs Receipt (SPEC-M6 §2 row 26, legacy frmPcsRec).
 * ALIAS of /jobwork/receipt (receive_jobwork IS the pcs receipt — SPEC-M6
 * §7-C-1 alias rule). Re-export, zero duplicated logic.
 */
export { default } from '@/app/(erp)/jobwork/receipt/page'
export const dynamic = 'force-dynamic'

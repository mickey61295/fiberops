/**
 * /orders/enquiry — Order Enquiry (SPEC-M6 §2 row 10, legacy FrmOrderEnquiry).
 * ALIAS of the order-register screen (search by buyer/style/date/status/doc-no
 * is the register's filter set) — re-export, zero duplicated logic.
 */
export { default } from '../register/page'
export const dynamic = 'force-dynamic'

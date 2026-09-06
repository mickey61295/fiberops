import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

// SPEC-M48 L-03 — the statutory register csv twin (the challan data export)
export const GET = makeCsvRouteHandler('statutory')

import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

// SPEC-M46 L-02 — the payroll register csv twin
export const GET = makeCsvRouteHandler('payroll')

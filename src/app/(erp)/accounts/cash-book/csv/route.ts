import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

// SPEC-M52 M-03 — the cash-book register csv twin
export const GET = makeCsvRouteHandler('cash-book')

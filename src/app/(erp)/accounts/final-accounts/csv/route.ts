import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

// SPEC-M52 M-03 — the final-accounts register csv twin
export const GET = makeCsvRouteHandler('final-accounts')

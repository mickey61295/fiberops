import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

// SPEC-M52 M-03 — the day-book register csv twin
export const GET = makeCsvRouteHandler('day-book')

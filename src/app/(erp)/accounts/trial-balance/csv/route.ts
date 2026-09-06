import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

// SPEC-M52 M-03 — the trial-balance register csv twin
export const GET = makeCsvRouteHandler('trial-balance')

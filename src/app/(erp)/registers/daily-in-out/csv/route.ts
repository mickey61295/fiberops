/** CSV export for the daily-in-out register (SPEC-M4 §6) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('daily-in-out')

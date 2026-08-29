/** CSV export for the closing-stock register (SPEC-M19 §4 Wave D) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('closing-stock')

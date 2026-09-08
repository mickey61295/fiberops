/** CSV export for the shift-wages register (SPEC-M55 L-06) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('shift-wages')

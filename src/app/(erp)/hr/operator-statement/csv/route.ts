/** CSV export for the operator-statement register (SPEC-M45 L-01) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('operator-statement')

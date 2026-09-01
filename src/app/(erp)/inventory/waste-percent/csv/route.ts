/** CSV export for the waste-percent register (SPEC-M42 INV-05) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('waste-percent')

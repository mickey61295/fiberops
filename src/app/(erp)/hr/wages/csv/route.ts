/** CSV export for the production-wages register (SPEC-M5 §7-B-20) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('production-wages')

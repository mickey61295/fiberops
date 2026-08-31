/** CSV export for the jobworker-statement register (SPEC-M39 §1 JWL-07) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('jobworker-statement')

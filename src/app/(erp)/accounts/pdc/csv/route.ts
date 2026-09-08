/** CSV export for the PDC / cheques-in-hand register (SPEC-M56 PAY-08) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('pdc')

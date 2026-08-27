/** CSV export for the budget-vs-actual register (SPEC-M4 §6) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('budget-vs-actual')

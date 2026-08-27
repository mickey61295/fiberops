/** CSV export for the rate-confirmation register (SPEC-M5 §7-A-6) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('rate-confirmation')

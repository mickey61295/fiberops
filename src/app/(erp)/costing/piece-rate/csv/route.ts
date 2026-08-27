/** CSV export for the piece-rate-confirmation register (SPEC-M5 §7-A-7) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('piece-rate-confirmation')

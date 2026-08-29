/** CSV export for the orderwise-pcs register (SPEC-M19 §1-D) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('orderwise-pcs')

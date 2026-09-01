/** CSV export for the despatch-register register (SPEC-M41 PRC-05) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('despatch-register')

/** CSV export for the line-issue-register register (SPEC-M19 §2 Wave B) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('line-issue-register')

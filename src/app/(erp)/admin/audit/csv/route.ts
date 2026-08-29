/** CSV export for the audit-log register (SPEC-M9 §9 M15) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('audit-log')

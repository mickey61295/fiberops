'use client'

/**
 * /production route (SPEC-M1 §9): re-homes the existing ProductionView view.
 */
import { ProductionView } from '@/components/erp/production-view'

export default function Page() {
  return <ProductionView />
}

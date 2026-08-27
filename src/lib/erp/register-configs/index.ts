/**
 * Register config registry — SPEC-M4 §4/§7. Pure data; the SERVICE registry
 * (registers/index.ts) is bound by the same slug (tests assert bijection).
 */
import type { RegisterConfig } from './types'
import { stockLedgerConfig } from './stock-ledger'
import { orderRegisterConfig } from './order-register'
import { dailyInOutConfig } from './daily-in-out'

export const REGISTER_CONFIGS: RegisterConfig[] = [
  stockLedgerConfig,
  orderRegisterConfig,
  dailyInOutConfig,
]

export function getRegisterConfig(slug: string): RegisterConfig | undefined {
  return REGISTER_CONFIGS.find((c) => c.slug === slug)
}

export type { RegisterConfig, RegisterFilter, RegisterColumn } from './types'

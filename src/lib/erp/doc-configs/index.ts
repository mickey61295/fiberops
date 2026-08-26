// SPEC-M3 §7/§8 — the doc-config registry. Grows per wave (Wave C adds the
// 13 chain configs, Wave D the accounts/inventory ones). Wave B: order only.
import type { DocConfig } from './types'
import { orderConfig } from './order'

export { orderConfig }

export const DOC_CONFIGS: DocConfig[] = [
  orderConfig,
]

export function getDocConfig(slug: string): DocConfig | undefined {
  return DOC_CONFIGS.find((c) => c.slug === slug)
}

/** Serializable subset for the client engine (ERRATUM 3). */
export function toScreenConfig(config: DocConfig) {
  const { schema: _schema, service: _service, ...ui } = config
  return ui
}

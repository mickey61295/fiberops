// SPEC-M2 §4 — the master config registry: 24 entities, one engine.
import type { MasterConfig, MasterCategory } from './types'

import { partyConfig } from './party'
import { buyerConfig } from './buyer'
import { merchandiserConfig } from './merchandiser'
import { exporterConfig } from './exporter'
import { seasonConfig } from './season'
import { styleConfig } from './style'
import { colourConfig } from './colour'
import { sizeConfig } from './size'
import { sizeGroupConfig } from './size-group'
import { diaConfig } from './dia'
import { uomConfig } from './uom'
import { lotConfig } from './lot'
import { yarnConfig } from './yarn'
import { fabricConfig } from './fabric'
import { accessoryConfig } from './accessory'
import { partConfig } from './part'
import { componentConfig } from './component'
import { designConfig } from './design'
import { godownConfig } from './godown'
import { departmentConfig } from './department'
import { employeeConfig } from './employee'
import { lineConfig } from './line'
import { govtHolidayConfig } from './govt-holiday'
import { finYearConfig } from './fin-year'

export const MASTER_CONFIGS: MasterConfig[] = [
  partyConfig,
  buyerConfig,
  merchandiserConfig,
  exporterConfig,
  seasonConfig,
  styleConfig,
  colourConfig,
  sizeConfig,
  sizeGroupConfig,
  diaConfig,
  uomConfig,
  lotConfig,
  yarnConfig,
  fabricConfig,
  accessoryConfig,
  partConfig,
  componentConfig,
  designConfig,
  godownConfig,
  departmentConfig,
  employeeConfig,
  lineConfig,
  govtHolidayConfig,
  finYearConfig,
]

export const MASTER_CATEGORIES: Array<{ key: MasterCategory; label: string; blurb: string }> = [
  { key: 'commercial', label: 'Commercial', blurb: 'Who you buy from and sell to' },
  { key: 'product', label: 'Product', blurb: 'Styles, colours, sizes, materials' },
  { key: 'org', label: 'Organisation', blurb: 'Godowns, departments, people, lines' },
  { key: 'admin', label: 'Admin', blurb: 'Financial years and company setup' },
]

export function getMasterConfig(slug: string): MasterConfig | undefined {
  return MASTER_CONFIGS.find((c) => c.slug === slug)
}

export function configsByCategory(cat: MasterCategory): MasterConfig[] {
  return MASTER_CONFIGS.filter((c) => c.category === cat)
}

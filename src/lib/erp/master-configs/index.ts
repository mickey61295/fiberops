// SPEC-M2 §4 — the master config registry: 41 entities, one engine
// (24 M2 masters + SPEC-M5 §7-D-32 shift + ADR-016 five + SPEC-M19 §3 Wave C eleven).
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
import { shiftConfig } from './shift'
import { userConfig } from './user'
import { userGroupConfig } from './user-group'
import { appOptionConfig } from './app-option'
import { hsnConfig } from './hsn'
import { testParameterConfig } from './test-parameter'
import { bankConfig } from './bank'
import { bankAccountConfig } from './bank-account'
import { millConfig } from './mill'
import { machineCategoryConfig } from './machine-category'
import { machineConfig } from './machine'
import { stateConfig } from './state'
import { shadeConfig } from './shade'
import { threadTypeConfig } from './thread-type'
import { countGroupConfig } from './count-group'
import { rangeGroupConfig } from './range-group'
import { sizeRangeConfig } from './size-range'

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
  // SPEC-M5 Wave D (§7-D-32)
  shiftConfig,
  // SPEC-M6 Wave B (ADR-016 + ERRATUM #1)
  userConfig,
  userGroupConfig,
  appOptionConfig,
  hsnConfig,
  testParameterConfig,
  // SPEC-M19 §3 Wave C (ADR-019) — masters completion
  bankConfig,
  bankAccountConfig,
  millConfig,
  machineCategoryConfig,
  machineConfig,
  stateConfig,
  shadeConfig,
  threadTypeConfig,
  countGroupConfig,
  rangeGroupConfig,
  sizeRangeConfig,
]

export const MASTER_CATEGORIES: Array<{ key: MasterCategory; label: string; blurb: string }> = [
  { key: 'commercial', label: 'Commercial', blurb: 'Who you buy from and sell to' },
  { key: 'product', label: 'Product', blurb: 'Styles, colours, sizes, materials' },
  { key: 'org', label: 'Organisation', blurb: 'Godowns, departments, people, lines' },
  { key: 'admin', label: 'Admin & Compliance', blurb: 'Fin years, users, rights, options, HSN/GST' },
]

export function getMasterConfig(slug: string): MasterConfig | undefined {
  return MASTER_CONFIGS.find((c) => c.slug === slug)
}

export function configsByCategory(cat: MasterCategory): MasterConfig[] {
  return MASTER_CONFIGS.filter((c) => c.category === cat)
}

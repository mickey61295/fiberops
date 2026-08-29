/**
 * SPEC-M9 §9 M15 — the audit-log viewer config (admin register). The variant
 * select filters actorSource; the status select reuses the frozen filter-key
 * set for entity (there is no 'entity' key — the service maps status→entity).
 */
import type { RegisterConfig } from './types'

export const auditLogConfig: RegisterConfig = {
  slug: 'audit-log',
  title: 'Audit Log',
  description: 'Every committed plan — who, what, when — written by the engine-level runCommit executor at every door.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'variant', label: 'Source', type: 'select', options: [
      { value: 'form', label: 'Form' },
      { value: 'agent', label: 'Agent' },
      { value: 'system', label: 'System' },
    ] },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'actor / doc no / summary' },
  ],
  columns: [
    { name: 'createdAt', label: 'At', format: 'date' },
    { name: 'source', label: 'Source', format: 'badge' },
    { name: 'actor', label: 'Actor', mono: true },
    { name: 'action', label: 'Action', format: 'badge' },
    { name: 'entity', label: 'Entity' },
    { name: 'docNo', label: 'Doc No', mono: true },
    { name: 'summary', label: 'Summary' },
  ],
  agentTools: ['get_approval_audit'],
  askPrompt: 'Show me the audit log',
  emptyMessage: 'No audit entries yet — commits land here automatically.',
  defaultLimit: 50,
}

/**
 * SPEC-M60 FR-A7 — the login-audit register config (admin register, the
 * audit-log pattern). The variant select filters the event; q searches
 * email / ip / detail.
 */
import type { RegisterConfig } from './types'

export const loginAuditConfig: RegisterConfig = {
  slug: 'login-audit',
  title: 'Login Audit',
  description: 'Every auth event — logins, failures, lockouts, logouts, password changes, session clears — from both doors.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'variant', label: 'Event', type: 'select', options: [
      { value: 'login', label: 'Login' },
      { value: 'login_fail', label: 'Failed login' },
      { value: 'login_locked', label: 'Locked attempt' },
      { value: 'logout', label: 'Logout' },
      { value: 'lockout_clear', label: 'Lockout cleared' },
      { value: 'password_set', label: 'Password set' },
      { value: 'password_clear', label: 'Password cleared' },
      { value: 'sessions_cleared', label: 'Sessions cleared' },
    ] },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'email / ip / detail' },
  ],
  columns: [
    { name: 'createdAt', label: 'At', format: 'date' },
    { name: 'event', label: 'Event', format: 'badge' },
    { name: 'email', label: 'Email', mono: true },
    { name: 'ip', label: 'IP', mono: true },
    { name: 'userAgent', label: 'User Agent' },
    { name: 'detail', label: 'Detail' },
  ],
  agentTools: [],
  askPrompt: 'Show me the login audit',
  emptyMessage: 'No auth events yet — logins land here automatically.',
  defaultLimit: 50,
}

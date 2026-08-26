/**
 * ViewKey → route map for re-homed legacy views (SPEC-M1 §9).
 * The old single-page switcher used ViewKey strings; views that still call
 * onNavigate(viewKey) are wired to real routes via this map.
 */
export type ViewKey =
  | 'dashboard' | 'orders' | 'procurement' | 'inventory' | 'cutting'
  | 'production' | 'invoices' | 'costing' | 'hr' | 'workflow' | 'masters'

export const VIEW_ROUTE: Record<ViewKey, string> = {
  dashboard: '/',
  orders: '/orders',
  procurement: '/procurement',
  inventory: '/inventory',
  cutting: '/cutting',
  production: '/production',
  invoices: '/accounts',
  costing: '/costing',
  hr: '/hr',
  workflow: '/approvals',
  masters: '/masters',
}

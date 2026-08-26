import { AppShell } from '@/components/erp/app-shell'

/**
 * ERP route-group layout (SPEC-M1 §6): every routed page renders inside the
 * registry-driven shell. The route group adds NO url segment.
 */
export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}

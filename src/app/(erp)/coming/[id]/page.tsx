import { notFound } from 'next/navigation'
import { ComingSoonItem, ComingSoonGroup } from '@/components/erp/coming-soon'
import { findItemById, findGroupById, isLive, getHref } from '@/lib/erp/menu-registry'
import Link from 'next/link'

/**
 * Registry-driven coming-soon page (SPEC-M1 §6): /coming/<itemId> or /coming/<groupId>.
 * Keeps plan P3 "no dead ends" — every unbuilt menu item explains itself and
 * offers the agent door when a tool already covers it.
 */
export default async function ComingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const item = findItemById(id)
  if (item) {
    // Live items should never show a coming page — redirect to the real route.
    if (isLive(item)) {
      // dynamic doc-view routes (e.g. /orders/[id]) have no listable index —
      // link the module root instead
      const raw = getHref(item)
      const href = raw.includes('[id]') ? raw.split('/[id]')[0] : raw
      return (
        <div className="p-8 text-center text-sm text-slate-500">
          This screen is live at{' '}
          <Link href={href} className="text-emerald-600 hover:underline font-mono">
            {href}
          </Link>
        </div>
      )
    }
    return <ComingSoonItem item={item} />
  }

  const group = findGroupById(id)
  if (group) return <ComingSoonGroup group={group} />

  notFound()
}

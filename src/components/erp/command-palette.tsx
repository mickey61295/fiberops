'use client'

/**
 * CommandPalette — SPEC-M18 §2-B1: the global jump bar on ⌘K (gap audit
 * collision #3: ⌘K was the agent, legacy hands expect a jump bar). Searches
 * every LIVE menu item, filtered by the SAME allowedGroupIds the layout
 * derives for the sidebar (rights parity — a denied group never surfaces
 * here), plus an "Open agent panel" entry (the agent moved to ⌘J).
 * Enter navigates · Esc closes · ⌘K toggles.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useAgent } from '@/components/agent/agent-panel-provider'
import { MENU_GROUPS, MENU_ITEMS, getHref, isLive } from '@/lib/erp/menu-registry'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

export function CommandPalette({ allowedGroupIds }: { allowedGroupIds?: string[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { openAgent } = useAgent()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // rights parity with the sidebar: allowed groups only, live routes only
  const groups = useMemo(() => {
    const allowed = allowedGroupIds ? new Set(allowedGroupIds) : null
    return MENU_GROUPS
      .filter((g) => !allowed || allowed.has(g.id))
      .map((g) => ({
        id: g.id,
        label: g.label,
        items: MENU_ITEMS.filter((i) => i.groupId === g.id && isLive(i)),
      }))
      .filter((g) => g.items.length > 0)
  }, [allowedGroupIds])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Jump to"
      description="Search screens and actions — Enter to open"
      className="sm:max-w-lg"
    >
      <CommandInput placeholder="Jump to… (orders, registers, masters, reports)" />
      <CommandList>
        <CommandEmpty>Nothing matches — try a screen name.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem
            value="open agent panel ask agent ⌘J"
            onSelect={() => {
              setOpen(false)
              openAgent()
            }}
          >
            <Sparkles className="mr-2 h-4 w-4 text-emerald-600" />
            Open agent panel
            <span className="ml-auto text-[10px] text-slate-400">⌘J</span>
          </CommandItem>
          <CommandItem value="home dashboard" onSelect={() => go('/')}>
            <ArrowRight className="mr-2 h-4 w-4 text-slate-400" />
            Home dashboard
          </CommandItem>
        </CommandGroup>

        {groups.map((g) => (
          <CommandGroup key={g.id} heading={g.label}>
            {g.items.map((i) => (
              <CommandItem
                key={i.id}
                value={`${i.label} ${i.id} ${g.label}`}
                onSelect={() => go(getHref(i))}
              >
                {i.label}
                <span className="ml-auto max-w-40 truncate text-[10px] text-slate-400">{i.route}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}

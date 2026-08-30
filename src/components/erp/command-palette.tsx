'use client'

/**
 * CommandPalette — SPEC-M18 §2-B1: the global jump bar on ⌘K (gap audit
 * collision #3: ⌘K was the agent, legacy hands expect a jump bar). Searches
 * every LIVE menu item, filtered by the SAME allowedGroupIds the layout
 * derives for the sidebar (rights parity — a denied group never surfaces
 * here), plus an "Open agent panel" entry (the agent moved to ⌘J).
 *
 * SPEC-M29 §7-G residual: doc-number jumps (type '1042' or 'SO-1042' → the
 * doc view, via /api/erp?resource=jump), party master records (the
 * master_search feed), and legacy form-name aliases (frmPcsDel → the Pcs
 * DC screen) joined into every menu item's search value.
 * Enter navigates · Esc closes · ⌘K toggles.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, FileText, Sparkles, Users } from 'lucide-react'
import { useAgent } from '@/components/agent/agent-panel-provider'
import { MENU_GROUPS, MENU_ITEMS, getHref, isLive } from '@/lib/erp/menu-registry'
import { searchableLegacyForms } from '@/lib/erp/legacy-aliases'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

interface JumpDoc {
  family: string
  label: string
  docNo: string
  href: string
}

interface PartyHit {
  value: string
  label: string
}

export function CommandPalette({ allowedGroupIds }: { allowedGroupIds?: string[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { openAgent } = useAgent()
  // SPEC-M29 — the doc-jump + party feeds (debounced on the typed query)
  const [query, setQuery] = useState('')
  const [docs, setDocs] = useState<JumpDoc[]>([])
  const [parties, setParties] = useState<PartyHit[]>([])
  const [jumpLoading, setJumpLoading] = useState(false)

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

  // SPEC-M29 — debounce BOTH feeds on the typed query (≥2 chars, alphanumeric-ish)
  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < 2) {
      setDocs([])
      setParties([])
      return
    }
    setJumpLoading(true)
    const t = setTimeout(async () => {
      try {
        const [jumpRes, partyRes] = await Promise.all([
          fetch(`/api/erp?resource=jump&q=${encodeURIComponent(q)}`).then((r) => r.json()).catch(() => null),
          fetch(`/api/erp?resource=master_search&slug=party&q=${encodeURIComponent(q.toLowerCase())}`).then((r) => r.json()).catch(() => null),
        ])
        setDocs(Array.isArray(jumpRes?.results) ? jumpRes.results.slice(0, 5) : [])
        setParties(Array.isArray(partyRes?.options) ? partyRes.options.slice(0, 4) : [])
      } finally {
        setJumpLoading(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query, open])

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
      description="Screens, docs (SO-1042 / 1042), parties, legacy form names — Enter to open"
      className="sm:max-w-lg"
    >
      <CommandInput placeholder="Jump to… (SO-1042, 1042, frmPcsDel, orders…)" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Nothing matches — try a screen name or a doc number.</CommandEmpty>

        {/* SPEC-M29 — doc-number jumps, ranked above everything */}
        {(docs.length > 0 || jumpLoading) && (
          <CommandGroup heading={jumpLoading ? 'Documents (searching…)' : 'Documents'}>
            {docs.map((d) => (
              <CommandItem key={d.href} value={`doc ${d.docNo} ${d.label}`} onSelect={() => go(d.href)}>
                <FileText className="mr-2 h-4 w-4 text-violet-600" />
                <span className="font-mono text-sm">{d.docNo}</span>
                <span className="ml-2 text-xs text-slate-500">{d.label}</span>
              </CommandItem>
            ))}
            {jumpLoading && docs.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-slate-400">resolving doc numbers…</div>
            )}
          </CommandGroup>
        )}

        {/* SPEC-M29 — party master records */}
        {parties.length > 0 && (
          <CommandGroup heading="Parties">
            {parties.map((p) => (
              <CommandItem key={p.value} value={`party ${p.value} ${p.label}`} onSelect={() => go(`/masters/party?q=${encodeURIComponent(p.value)}`)}>
                <Users className="mr-2 h-4 w-4 text-sky-600" />
                <span className="font-mono text-sm">{p.value}</span>
                <span className="ml-2 text-xs text-slate-500">{p.label.replace(`${p.value} — `, '')}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

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
                // M30: raw refs + canonical expansions — typing the REAL form
                // name (FrmOrderRegister) finds the screen whose array carries
                // the abbreviation (FrmOrderReg); non-forms stay searchable.
                value={`${i.label} ${i.id} ${g.label} ${searchableLegacyForms((i as { legacyForms?: string[] }).legacyForms ?? []).join(' ')}`}
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

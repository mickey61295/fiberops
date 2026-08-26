'use client'

/**
 * Global agent panel provider (SPEC-M1 §6/§7).
 * Mounts the AgentPanel ONCE, owns the Cmd+K shortcut, and exposes
 * openAgent(seed?) to any component — topbar button, coming-soon
 * "Ask the agent", future "Fill with AI" buttons.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { AgentPanel } from '@/components/agent/agent-panel'

interface AgentPanelContextValue {
  openAgent: (seed?: string) => void
}

const AgentPanelContext = createContext<AgentPanelContextValue>({ openAgent: () => {} })

export function useAgent(): AgentPanelContextValue {
  return useContext(AgentPanelContext)
}

export function AgentPanelProvider({
  children,
  onCommitted,
}: {
  children: ReactNode
  onCommitted?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [seed, setSeed] = useState<string | undefined>(undefined)

  const openAgent = useCallback((s?: string) => {
    setSeed(s)
    setOpen(true)
  }, [])

  // Cmd+K / Ctrl+K opens the agent panel globally.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <AgentPanelContext.Provider value={{ openAgent }}>
      {children}
      <AgentPanel
        open={open}
        onOpenChange={setOpen}
        onCommitted={onCommitted ?? (() => {})}
        seedPrompt={seed}
      />
    </AgentPanelContext.Provider>
  )
}

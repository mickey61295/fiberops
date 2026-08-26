'use client'

/**
 * Client button that opens the global agent panel with a seeded prompt.
 * Used on coming-soon pages (SPEC-M1 §7, plan P3 "no dead ends").
 */
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAgent } from '@/components/agent/agent-panel-provider'

export function AskAgentButton({ prompt, label }: { prompt: string; label?: string }) {
  const { openAgent } = useAgent()
  return (
    <Button
      onClick={() => openAgent(prompt)}
      className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
    >
      <Sparkles className="h-4 w-4 mr-1.5" />
      {label ?? 'Ask the agent to do this now'}
    </Button>
  )
}
